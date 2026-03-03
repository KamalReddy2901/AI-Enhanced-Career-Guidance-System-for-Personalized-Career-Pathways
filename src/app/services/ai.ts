import { toast } from 'sonner';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

let apiKey = localStorage.getItem('groq_api_key') || '';

export function getApiKey(): string {
  return apiKey;
}

export function setApiKey(key: string) {
  apiKey = key;
  localStorage.setItem('groq_api_key', key);
}

export function hasApiKey(): boolean {
  return apiKey.length > 0;
}

// ─── Cache Layer ───────────────────────────────────────────────

const CACHE_PREFIX = 'careersim_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full - clear old entries
    clearOldCache();
  }
}

function clearOldCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  // Remove oldest half
  const entries = keys.map(k => {
    try {
      const { timestamp } = JSON.parse(localStorage.getItem(k) || '{}');
      return { key: k, timestamp: timestamp || 0 };
    } catch {
      return { key: k, timestamp: 0 };
    }
  }).sort((a, b) => a.timestamp - b.timestamp);

  entries.slice(0, Math.ceil(entries.length / 2)).forEach(e => localStorage.removeItem(e.key));
}

export function clearAllCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => localStorage.removeItem(k));
}

// ─── Retry Logic ───────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const waitTime = delayMs * Math.pow(2, attempt);
      toast.info(`Retrying in ${waitTime / 1000}s...`, { duration: waitTime });
      await new Promise(r => setTimeout(r, waitTime));
    }
  }
  throw new Error('Max retries reached');
}

// ─── Core API Call ─────────────────────────────────────────────

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number; jsonMode?: boolean; signal?: AbortSignal } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048, jsonMode = false, signal } = options;

  if (!apiKey) {
    throw new Error('API key not set. Please add your free Groq API key.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err?.error?.message || `Groq API error: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ─── Stream Chat ───────────────────────────────────────────────

export async function* streamChat(
  jobTitle: string,
  jobContext: string,
  messages: { role: 'user' | 'assistant'; text: string }[]
): AsyncGenerator<string> {
  if (!apiKey) throw new Error('API key not set.');

  const systemPrompt = `You are a career expert AI assistant for the "Career Simulation" app. You provide detailed, accurate, and insightful answers about the profession of "${jobTitle}".

Context about this specific role:
${jobContext}

Guidelines:
- Be specific and factual about this exact profession, not generic
- Include real-world details, industry jargon, and insider knowledge
- Be honest about both positives and negatives
- Keep responses conversational but informative (2-4 paragraphs max)
- If asked about salary, give real ranges with context
- If asked about something you're unsure about, say so rather than making things up`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.text })),
  ];

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip malformed JSON
        }
      }
    }
  }
}

// ─── Generate Job Data (Cached + Retry) ────────────────────────

export interface AIJobData {
  category: string;
  shortDescription: string;
  fullDescription: string;
  avgSalary: string;
  education: string[];
  skills: string[];
  dailyRoutine: string;
  workEnvironment: string;
  careerPath: string;
  weekOverview: string;
  quarterOverview: string;
  yearOverview: string;
  funFact: string;
}

export async function generateJobDataAI(title: string, skipCache = false): Promise<AIJobData> {
  const currency = (() => {
    try {
      return (JSON.parse(localStorage.getItem('careersim_preferences') || '{}').currency as 'INR' | 'USD') || 'INR';
    } catch {
      return 'INR' as const;
    }
  })();

  const isIndia = currency === 'INR';
  const cacheKey = `job_${title.toLowerCase().replace(/\s+/g, '_')}_${currency.toLowerCase()}`;

  if (!skipCache) {
    const cached = getCached<AIJobData>(cacheKey);
    if (cached) {
      toast.success('Loaded from cache', { duration: 1500 });
      return cached;
    }
  }

  const result = await withRetry(async () => {
    const systemPrompt = isIndia
      ? `You are a career research expert specializing in the Indian job market. Generate a comprehensive, accurate career dossier tailored to India. Return ONLY valid JSON, no markdown. Be specific to this EXACT role - not generic career advice. Tailor all content to the Indian context: reference Indian education (IITs, NITs, AIIMS, IIMs, UPSC, CA/ICAI exams, state board exams, etc.), Indian job market conditions, typical Indian workplace culture, career progression as it works in India, and realistic Indian salary figures in INR (LPA format).`
      : `You are a career research expert. Generate a comprehensive, accurate career dossier. Return ONLY valid JSON, no markdown. Be specific to this EXACT role - not generic career advice.`;

    const salaryInstruction = isIndia
      ? `"avgSalary": "Realistic Indian salary range in INR using LPA format, e.g. '₹6 LPA - ₹25 LPA' or '₹8,00,000 - ₹35,00,000 per annum'. Base it on real Indian pay scales for this role."`
      : `"avgSalary": "Realistic US salary range like '$XX,000 - $XXX,000' based on experience levels"`;

    const educationInstruction = isIndia
      ? `"education": ["Array of 5 specific education/qualification requirements relevant to India - e.g., specific Indian degrees, entrance exams (JEE, NEET, UPSC, CAT, GATE, etc.), certifications, or Indian licensing bodies"]`
      : `"education": ["Array of 5 specific education/qualification requirements for this exact role"]`;

    const contextNote = isIndia
      ? `\n\nIMPORTANT: All content must reflect Indian realities - Indian companies, Indian career trajectories, Indian work culture (including WFH trends post-COVID, startup ecosystem, PSU vs private sector, etc.), and Indian education pathways.`
      : '';

    const userPrompt = `Generate a detailed career dossier for: "${title}"${contextNote}

Return this exact JSON structure:
{
  "category": "One of: Healthcare, Technology & Engineering, Law & Justice, Finance, Education, Creative Arts, Food & Hospitality, Aviation & Space, Nature & Environment, Leadership & Management, Skilled Trades, Social Services, Professional Services",
  "shortDescription": "A compelling 3-4 sentence overview of what a ${title} actually does day-to-day. Be specific and vivid.",
  "fullDescription": "A detailed 4-paragraph description covering: what the role actually involves, day-to-day realities, impact and rewards, and how the profession has evolved. Use \\n\\n between paragraphs.",
  ${salaryInstruction},
  ${educationInstruction},
  "skills": ["Array of 8-12 specific skills needed - mix of technical and soft skills unique to this role"],
  "dailyRoutine": "A vivid, specific description of a typical day for a ${title}. Include actual times, real tasks, and industry-specific details. 4-5 sentences.",
  "workEnvironment": "Specific description of where and how a ${title} works - physical environment, team structure, pace, culture. 3-4 sentences.",
  "careerPath": "Realistic career progression from entry-level to senior/expert for a ${title}. Include specific titles, year ranges, and transition points. 4-5 sentences.",
  "weekOverview": "Detailed week breakdown with **Day:** formatting and \\n\\n between days. Specific to ${title}.",
  "quarterOverview": "Three-month view with **Month X:** formatting and \\n\\n between months. Specific to ${title}.",
  "yearOverview": "Annual view with **Q1-Q4:** formatting and \\n\\n between quarters. Specific to ${title}.",
  "funFact": "One genuinely interesting, surprising, and TRUE fact about being a ${title}. Not generic."
}`;

    const raw = await callGroq(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxTokens: 3000,
      jsonMode: true,
    });

    return JSON.parse(raw) as AIJobData;
  });

  setCache(cacheKey, result);
  return result;
}

// ─── Refine Job Description ────────────────────────────────────

export async function refineJobDescription(
  title: string,
  currentDescription: string,
  refinementContext: string,
  previousRefinements: string[]
): Promise<string> {
  return withRetry(async () => {
    const systemPrompt = `You are a career research expert helping someone understand a specific variant of a profession. Rewrite and improve the job description incorporating the user's specific context. Return ONLY the new description text - no JSON, no markdown, no quotes. The description should be 4-6 sentences, specific and vivid.`;

    const previousContext = previousRefinements.length > 0
      ? `\nPrevious refinements: ${previousRefinements.join('; ')}`
      : '';

    const userPrompt = `Job title: ${title}
Current description: ${currentDescription}
${previousContext}

The user wants to refine with: "${refinementContext}"

Write a new description that incorporates this context. Tailored and specific.`;

    return callGroq(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 500 });
  });
}

// ─── Generate Simulation (Cached + Retry) ─────────────────────

export interface AISimScenario {
  time: string;
  title: string;
  description: string;
  stickFigurePose: string;
  choices: Array<{ text: string; isCorrect: boolean }>;
  correctChoiceIndex: number;
  explanation: string;
}

export async function generateSimulationAI(jobTitle: string, skipCache = false): Promise<AISimScenario[]> {
  const cacheKey = `sim_${jobTitle.toLowerCase().replace(/\s+/g, '_')}_${skipCache ? Date.now() : 'v1'}`;

  if (!skipCache) {
    const cached = getCached<AISimScenario[]>(`sim_${jobTitle.toLowerCase().replace(/\s+/g, '_')}_v2`);
    if (cached) {
      toast.success('Loaded simulation from cache', { duration: 1500 });
      return cached;
    }
  }

  const result = await withRetry(async () => {
    const poses = ['waking', 'walking', 'sitting', 'presenting', 'thinking', 'working', 'talking', 'eating', 'celebrating', 'tired', 'running', 'reading'];

    const systemPrompt = `You are a career simulation designer. Create realistic "day in the life" scenarios. Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Create exactly 10 "day in the life" scenarios for a "${jobTitle}".

Rules:
- SPECIFIC to ${jobTitle} - real jargon, real tools, real situations
- Chronological through a full day (morning to evening)
- 3 choices each, only 1 correct (what a seasoned pro would do)
- Explanations teach WHY, referencing real practices
- Vary which index is correct (0, 1, or 2)
- CRITICAL: The description must describe the SITUATION/CONTEXT only. Do NOT mention, hint at, or reveal which action is correct. The user must make a genuine decision. Never name the correct choice in the description.
- Wrong choices must be plausible - things a beginner might actually do

stickFigurePose options: ${poses.join(', ')}

Return JSON object with "scenarios" key containing array of 10:
{"scenarios": [{"time":"6:00 AM","title":"Title","description":"2-3 sentences.","stickFigurePose":"waking","choices":[{"text":"A","isCorrect":false},{"text":"B","isCorrect":true},{"text":"C","isCorrect":false}],"correctChoiceIndex":1,"explanation":"2-3 sentences."}]}`;

    const raw = await callGroq(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 4000,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const scenarios = Array.isArray(parsed) ? parsed : (parsed.scenarios || parsed.data || Object.values(parsed)[0]);
    if (!Array.isArray(scenarios)) throw new Error('Expected array');

    return scenarios.map((s: any) => ({
      ...s,
      stickFigurePose: poses.includes(s.stickFigurePose) ? s.stickFigurePose : 'thinking',
      correctChoiceIndex: typeof s.correctChoiceIndex === 'number'
        ? s.correctChoiceIndex
        : s.choices.findIndex((c: any) => c.isCorrect),
    }));
  });

  setCache(`sim_${jobTitle.toLowerCase().replace(/\s+/g, '_')}_v2`, result);
  return result;
}

// ─── Related Careers ───────────────────────────────────────────

export interface RelatedCareer {
  title: string;
  similarity: string;
  description: string;
}

export async function getRelatedCareers(jobTitle: string): Promise<RelatedCareer[]> {
  const cacheKey = `related_${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<RelatedCareer[]>(cacheKey);
  if (cached) return cached;

  const result = await withRetry(async () => {
    const raw = await callGroq(
      'Return ONLY valid JSON. You suggest related careers.',
      `For the profession "${jobTitle}", suggest 5 related careers a person interested in this role might also want to explore.

Return: {"careers":[{"title":"Career Name","similarity":"One phrase explaining the connection","description":"One sentence about why someone interested in ${jobTitle} would like this role."}]}`,
      { temperature: 0.7, maxTokens: 600, jsonMode: true }
    );

    const parsed = JSON.parse(raw);
    return (parsed.careers || parsed.data || Object.values(parsed)[0]) as RelatedCareer[];
  });

  setCache(cacheKey, result);
  return result;
}

// ─── Simulation Summary ────────────────────────────────────────

export async function generateSimulationSummary(
  jobTitle: string,
  totalScenarios: number,
  correctCount: number,
  scenarioTitles: string[],
  wasCorrect: boolean[]
): Promise<string> {
  return withRetry(async () => {
    const wrongOnes = scenarioTitles.filter((_, i) => !wasCorrect[i]);
    const rightOnes = scenarioTitles.filter((_, i) => wasCorrect[i]);

    const raw = await callGroq(
      `You write brief, insightful career assessment summaries. Be encouraging but honest. 3-4 paragraphs. No markdown headers.`,
      `A user just completed a "Day in the Life" simulation for "${jobTitle}".
They got ${correctCount} out of ${totalScenarios} correct.

Scenarios they nailed: ${rightOnes.join(', ') || 'None'}
Scenarios they missed: ${wrongOnes.join(', ') || 'None'}

Write a personalized assessment of how well their instincts align with being a ${jobTitle}. Reference specific scenarios. End with encouragement.`,
      { temperature: 0.7, maxTokens: 600 }
    );

    return raw;
  });
}

// ─── Career Quiz ───────────────────────────────────────────────

export interface QuizResult {
  careers: Array<{
    title: string;
    matchScore: number;
    reason: string;
  }>;
  personalityInsight: string;
}

export async function getQuizResults(answers: Record<string, string>): Promise<QuizResult> {
  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career counselor AI. Return ONLY valid JSON.',
      `Based on these personality/preference answers, suggest 5 ideal careers:

${Object.entries(answers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

Return: {"careers":[{"title":"Career Name","matchScore":85,"reason":"One sentence why this matches."}],"personalityInsight":"2-3 sentence summary of their work personality based on answers."}

matchScore should be 60-98 (never 100). Be diverse in suggestions. At least one unexpected career.`,
      { temperature: 0.8, maxTokens: 800, jsonMode: true }
    );

    return JSON.parse(raw) as QuizResult;
  });
}

// ─── Validate API Key ──────────────────────────────────────────

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Say "ok"' }],
        max_tokens: 5,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ─── AI Job Title Suggestions (Typeahead) ─────────────────────

export async function getJobSuggestions(partial: string): Promise<string[]> {
  if (!apiKey || partial.trim().length < 2) return [];

  const cacheKey = `suggest_${partial.trim().toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const raw = await callGroq(
      'You are a job title autocomplete assistant. Return ONLY valid JSON. Be creative and diverse.',
      `Suggest exactly 7 real, specific job titles that match or relate to "${partial}". Include a mix of common and niche professions. Sort by relevance - most relevant first.

Return: {"suggestions": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6", "Title 7"]}`,
      { temperature: 0.4, maxTokens: 200, jsonMode: true }
    );

    const parsed = JSON.parse(raw);
    const result = (parsed.suggestions || []).slice(0, 7) as string[];
    // Cache for 10 minutes (much shorter than usual)
    try {
      localStorage.setItem(
        CACHE_PREFIX + cacheKey,
        JSON.stringify({ data: result, timestamp: Date.now() - (CACHE_EXPIRY - 10 * 60 * 1000) })
      );
    } catch {
      // ignore
    }
    return result;
  } catch {
    return [];
  }
}

// ─── Trending Careers ──────────────────────────────────────────

export interface TrendingCareers {
  rising: Array<{ title: string; reason: string }>;
  declining: Array<{ title: string; reason: string }>;
  emerging: Array<{ title: string; reason: string }>;
}

export async function getTrendingCareers(signal?: AbortSignal): Promise<TrendingCareers> {
  const cacheKey = 'trending_careers_v1';
  const cached = getCached<TrendingCareers>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career trends analyst. Return ONLY valid JSON. Base trends on current job market data (AI adoption, automation, demographic shifts, green economy, remote work).',
      `List the current career trajectory trends. Return this exact JSON:
{
  "rising": [{"title": "Job Title", "reason": "1 sentence why it is growing fast"}],
  "declining": [{"title": "Job Title", "reason": "1 sentence why it faces decline"}],
  "emerging": [{"title": "Job Title", "reason": "1 sentence describing this new role"}]
}
Each array should have exactly 5 items. Be specific and accurate.`,
      { temperature: 0.5, maxTokens: 800, jsonMode: true, signal }
    );

    const result = JSON.parse(raw) as TrendingCareers;
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Learn More Resources ──────────────────────────────────────

export interface LearnMoreResources {
  subreddits: Array<{ name: string; description: string }>;
  searchTerms: Array<{ term: string; context: string }>;
  certifications: Array<{ name: string; provider: string }>;
  books: Array<{ title: string; author: string; why: string }>;
}

export async function getLearnMoreResources(jobTitle: string, signal?: AbortSignal): Promise<LearnMoreResources> {
  const cacheKey = `learn_more_${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<LearnMoreResources>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career research librarian. Return ONLY valid JSON. Suggest real, accurate resources.',
      `For someone interested in becoming a "${jobTitle}", suggest learning resources. Return this exact JSON:
{
  "subreddits": [{"name": "r/subredditname", "description": "What this community covers"}],
  "searchTerms": [{"term": "search phrase", "context": "What you would learn from this search"}],
  "certifications": [{"name": "Certification Name", "provider": "Issuing organization"}],
  "books": [{"title": "Book Title", "author": "Author Name", "why": "One sentence on why it is relevant"}]
}
Each array should have 3-4 items. Only include real, verifiable resources.`,
      { temperature: 0.4, maxTokens: 800, jsonMode: true, signal }
    );

    const result = JSON.parse(raw) as LearnMoreResources;
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Career Transition Plan ────────────────────────────────────

export interface CareerTransitionPlan {
  fromTitle: string;
  toTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
  timeframe: string;
  overview: string;
  transferableSkills: string[];
  skillGaps: string[];
  steps: Array<{ phase: string; duration: string; actions: string[] }>;
  salaryImpact: string;
  successStory: string;
}

export async function getCareerTransition(
  fromTitle: string,
  toTitle: string,
  signal?: AbortSignal
): Promise<CareerTransitionPlan> {
  const currency = (() => { try { return (JSON.parse(localStorage.getItem('careersim_preferences') || '{}').currency as 'INR' | 'USD') || 'INR'; } catch { return 'INR' as const; } })();
  const isIndia = currency === 'INR';
  const cacheKey = `transition_${fromTitle.toLowerCase().replace(/\s+/g, '_')}_to_${toTitle.toLowerCase().replace(/\s+/g, '_')}_${currency.toLowerCase()}`;
  const cached = getCached<CareerTransitionPlan>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career transition coach. Return ONLY valid JSON. Be specific and practical.',
      `Create a detailed career transition plan from "${fromTitle}" to "${toTitle}"${isIndia ? ' in the Indian job market context. Use INR (LPA format) for salary figures, reference Indian certifications, companies and platforms where relevant.' : ''}. Return this exact JSON:
{
  "fromTitle": "${fromTitle}",
  "toTitle": "${toTitle}",
  "difficulty": "Easy|Medium|Hard|Very Hard",
  "timeframe": "e.g. 6-12 months",
  "overview": "2-3 sentences summarising the transition journey",
  "transferableSkills": ["skill 1", "skill 2", "skill 3"],
  "skillGaps": ["gap 1", "gap 2", "gap 3"],
  "steps": [
    {"phase": "Phase Name", "duration": "X months", "actions": ["action 1", "action 2", "action 3"]}
  ],
  "salaryImpact": "${isIndia ? 'e.g. ₹8 LPA → ₹14 LPA expected after 18 months' : 'e.g. +20% increase expected after 2 years'}",
  "successStory": "A realistic example of someone who made this transition successfully (1-2 sentences)"
}
Include 3-4 phases. Be honest about difficulty and realistic about timeframes.`,
      { temperature: 0.6, maxTokens: 1200, jsonMode: true, signal }
    );

    const result = JSON.parse(raw) as CareerTransitionPlan;
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Career Roadmap ────────────────────────────────────────────

export interface CareerRoadmap {
  title: string;
  totalYears: string;
  stages: Array<{
    stage: string;
    yearsRange: string;
    role: string;
    salary: string;
    milestones: string[];
    skills: string[];
    color: string;
  }>;
  keyDecisions: Array<{ decision: string; timing: string; impact: string }>;
  industryOutlook: string;
}

export async function getCareerRoadmap(jobTitle: string, signal?: AbortSignal): Promise<CareerRoadmap> {
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('careersim_preferences') || '{}') as Record<string, string>; } catch { return {} as Record<string, string>; } })();
  const currency = (prefs.currency as 'INR' | 'USD') || 'INR';
  const detailLevel = (prefs.roadmapDetailLevel as 'essential' | 'detailed' | 'comprehensive') || 'detailed';
  const isIndia = currency === 'INR';
  const cacheKey = `roadmap_${jobTitle.toLowerCase().replace(/\s+/g, '_')}_${currency.toLowerCase()}_${detailLevel}`;
  const cached = getCached<CareerRoadmap>(cacheKey);
  if (cached) return cached;

  const detailInstruction = detailLevel === 'essential'
    ? 'Be concise — only include the most important milestones (2 per stage max).'
    : detailLevel === 'comprehensive'
      ? 'Be comprehensive — include 4-5 milestones per stage, detailed skills, and thorough key decisions.'
      : 'Be moderately detailed — include 3 milestones and 3 skills per stage.';

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career development strategist. Return ONLY valid JSON. Be specific to this profession.',
      `Create a comprehensive career roadmap for "${jobTitle}"${isIndia ? ' in the Indian job market. Use INR (LPA format) for salaries, reference relevant Indian companies, certifications (e.g. GATE, CA, UPSC where relevant), and realistic Indian career progression timelines.' : ''}. ${detailInstruction} Return this exact JSON:
{
  "title": "${jobTitle}",
  "totalYears": "e.g. 20+ years to reach peak",
  "stages": [
    {
      "stage": "Entry Level",
      "yearsRange": "0-2 years",
      "role": "Specific job title at this stage",
      "salary": "${isIndia ? 'e.g. ₹4-7 LPA' : 'e.g. $60k-80k'}",
      "milestones": ["milestone 1", "milestone 2"],
      "skills": ["skill to learn 1", "skill to learn 2"],
      "color": "one of: blue|green|yellow|orange|red|purple"
    }
  ],
  "keyDecisions": [
    {"decision": "Specialise vs generalise", "timing": "Years 3-5", "impact": "Affects earning potential and flexibility"}
  ],
  "industryOutlook": "2-3 sentences on where this career is heading over the next decade"
}
Include 5 stages (Entry, Junior, Mid-level, Senior, Expert/Leadership). Use distinct colors for each stage.`,
      { temperature: 0.6, maxTokens: 1400, jsonMode: true, signal }
    );

    const result = JSON.parse(raw) as CareerRoadmap;
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Work-Life Balance Radar ────────────────────────────────────

export interface WorkLifeBalance {
  metrics: Array<{
    subject: string;
    score: number;
    description: string;
  }>;
  overallScore: number;
  summary: string;
  bestFor: string;
  worstFor: string;
}

export async function getWorkLifeBalance(jobTitle: string, signal?: AbortSignal): Promise<WorkLifeBalance> {
  const cacheKey = `wlb_${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<WorkLifeBalance>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a workplace wellness researcher. Return ONLY valid JSON. Base scores on real data about this profession.',
      `Evaluate the work-life balance for "${jobTitle}" across multiple dimensions. Return this exact JSON:
{
  "metrics": [
    {"subject": "Work Hours", "score": 70, "description": "Brief explanation of typical hours"},
    {"subject": "Flexibility", "score": 60, "description": "Remote/flexible work options"},
    {"subject": "Stress Level", "score": 50, "description": "Typical stress factors (higher = lower stress)"},
    {"subject": "Job Security", "score": 80, "description": "Employment stability"},
    {"subject": "Social Life", "score": 65, "description": "Impact on personal relationships and free time"},
    {"subject": "Physical Health", "score": 55, "description": "Physical demands and health impact"},
    {"subject": "Mental Health", "score": 60, "description": "Cognitive/emotional demands"}
  ],
  "overallScore": 65,
  "summary": "2-3 sentences summarising the overall work-life balance for this role",
  "bestFor": "Type of person who thrives in this role's lifestyle",
  "worstFor": "Type of person who would struggle with this lifestyle"
}
Scores are 0-100 (higher is BETTER for quality of life). Be honest and accurate.`,
      { temperature: 0.5, maxTokens: 800, jsonMode: true, signal }
    );

    const result = JSON.parse(raw) as WorkLifeBalance;
    setCache(cacheKey, result);
    return result;
  });
}