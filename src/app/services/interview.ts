import { toast } from 'sonner';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

let apiKey = localStorage.getItem('groq_api_key') || '';

const CACHE_PREFIX = 'careersim_interview_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

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
    // localStorage full
  }
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  apiKey = localStorage.getItem('groq_api_key') || '';
  
  if (!apiKey) {
    throw new Error('API key not set');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
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
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export interface InterviewQuestion {
  category: string;
  question: string;
  approach: string;
  keyPoints: string[];
}

export async function generateInterviewQuestions(
  jobTitle: string,
  skipCache = false
): Promise<InterviewQuestion[]> {
  const cacheKey = `${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;

  if (!skipCache) {
    const cached = getCached<InterviewQuestion[]>(cacheKey);
    if (cached) {
      toast.success('Loaded questions from cache', { duration: 1500 });
      return cached;
    }
  }

  const systemPrompt = `You are a career interview coach. Generate realistic interview questions that would actually be asked for this specific role. Return ONLY valid JSON, no markdown.`;

  const userPrompt = `Generate exactly 12 interview questions for a "${jobTitle}" position.

Include these categories (mix them throughout):
- Behavioral (3-4 questions)
- Technical/Skills (3-4 questions)
- Situational (2-3 questions)
- Career Goals (1-2 questions)

Return this exact JSON structure:
{
  "questions": [
    {
      "category": "Behavioral" or "Technical" or "Situational" or "Career Goals",
      "question": "A specific, realistic interview question a ${jobTitle} would be asked",
      "approach": "A detailed 3-4 sentence strategy for answering this question effectively. Specific to ${jobTitle}.",
      "keyPoints": ["Specific point 1 to mention", "Specific point 2", "Specific point 3", "Specific point 4"]
    }
  ]
}

Make questions SPECIFIC to ${jobTitle} - not generic. Include industry jargon, real tools, real scenarios.`;

  try {
    const raw = await callGroq(systemPrompt, userPrompt);
    const parsed = JSON.parse(raw);
    const questions = parsed.questions || parsed.data || Object.values(parsed)[0];
    
    if (!Array.isArray(questions)) {
      throw new Error('Invalid response format');
    }

    const validated = questions.map((q: any) => ({
      category: q.category || 'General',
      question: q.question || '',
      approach: q.approach || '',
      keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints : [],
    }));

    setCache(cacheKey, validated);
    return validated;
  } catch (error) {
    console.error('Failed to generate interview questions:', error);
    throw error;
  }
}
