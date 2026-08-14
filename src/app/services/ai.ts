import { toast } from 'sonner';
import { supabase } from './supabase';
import { normalizeTrendingCareers, type TrendingCareers } from './trendingSchemas';
import { OCCUPATIONS } from '../data/knowledge';

export { normalizeTrendingCareers, type TrendingCareers } from './trendingSchemas';

// ─── Proxy / Direct config ─────────────────────────────────────
// In production, set VITE_AI_PROXY_URL to the Cloudflare Worker URL.
// The worker holds the Groq keys securely; the browser never sees them.
// In development, leave VITE_AI_PROXY_URL empty to fall back to direct Groq.
const AI_PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL as string || '').trim().replace(/\/$/, '');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Fallback model used only when AI_PROXY_URL is not set (dev mode).
// In production the worker picks the model via worker/src/models.ts.
const FALLBACK_MODEL = 'openai/gpt-oss-120b';

// Direct keys — only loaded when no proxy is configured (dev fallback).
// In production, VITE_GROQ_API_KEYS should be left unset so the bundle is clean.
const BUILT_IN_KEYS: string[] = AI_PROXY_URL ? [] : [...new Set((import.meta.env.VITE_GROQ_API_KEYS as string || '')
  .split(',')
  .map(k => k.trim())
  .filter(k => k.startsWith('gsk_')))];

let currentKeyIndex = Math.floor(Math.random() * Math.max(BUILT_IN_KEYS.length, 1));
const exhaustedKeys = new Map<string, number>();
let allKeysExhausted = false;
const KEY_COOLDOWN_MS = 65_000;
const AUTH_FAILURE_QUARANTINE_MS = 15 * 60_000;
const TRANSIENT_RETRY_DELAY_MS = 250;

function isKeyExhausted(key: string): boolean {
  const unavailableUntil = exhaustedKeys.get(key);
  if (!unavailableUntil) return false;
  if (Date.now() >= unavailableUntil) { exhaustedKeys.delete(key); return false; }
  return true;
}
function getActiveKey(): string {
  if (BUILT_IN_KEYS.length === 0) return '';
  allKeysExhausted = false;
  for (let i = 0; i < BUILT_IN_KEYS.length; i++) {
    const idx = (currentKeyIndex + i) % BUILT_IN_KEYS.length;
    if (!isKeyExhausted(BUILT_IN_KEYS[idx])) {
      currentKeyIndex = (idx + 1) % BUILT_IN_KEYS.length;
      return BUILT_IN_KEYS[idx];
    }
  }
  allKeysExhausted = true; return '';
}

function retryAfterMs(value: string | null): number {
  if (!value) return KEY_COOLDOWN_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1_000, Math.ceil(seconds * 1_000));
  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(1_000, retryAt - Date.now()) : KEY_COOLDOWN_MS;
}

function markKeyUnavailable(key: string, durationMs: number): void {
  exhaustedKeys.set(key, Date.now() + Math.max(1_000, durationMs));
}

async function fetchDirectWithKeyRotation(request: (key: string) => Promise<Response>): Promise<Response> {
  let transientRetryAvailable = true;
  const maxAttempts = BUILT_IN_KEYS.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = getActiveKey();
    if (!key) break;

    let response: Response;
    try {
      response = await request(key);
    } catch (error) {
      if (!transientRetryAvailable) throw error;
      transientRetryAvailable = false;
      await new Promise(resolve => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
      continue;
    }

    if (response.status === 429) {
      markKeyUnavailable(key, retryAfterMs(response.headers.get('Retry-After')));
      continue;
    }
    if (response.status === 401) {
      markKeyUnavailable(key, AUTH_FAILURE_QUARANTINE_MS);
      continue;
    }
    if (response.status >= 500 && transientRetryAvailable) {
      transientRetryAvailable = false;
      await new Promise(resolve => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
      continue;
    }
    return response;
  }

  allKeysExhausted = true;
  throw new Error('All AI servers are busy right now. Please wait a moment and try again.');
}

export function getApiKey(): string { return getActiveKey(); }
export function setApiKey(_key: string) { /* no-op: proxy handles keys */ }
export function hasApiKey(): boolean {
  if (AI_PROXY_URL) return true; // proxy is available
  if (BUILT_IN_KEYS.length === 0) return false;
  return BUILT_IN_KEYS.some(k => !isKeyExhausted(k));
}
export function isAllKeysExhausted(): boolean {
  if (AI_PROXY_URL) return false;
  return BUILT_IN_KEYS.length === 0 || !BUILT_IN_KEYS.some(k => !isKeyExhausted(k));
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

// ─── Core API Call (proxy-aware) ──────────────────────────────

// In-flight request deduplication map
const pendingRequests = new Map<string, Promise<string>>();

export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    signal?: AbortSignal;
    usageType?: string;
  } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048, jsonMode = false, signal, usageType = 'unknown' } = options;

  // ── Proxy path ─────────────────────────────────────────────
  if (AI_PROXY_URL) {
    let jwt = '';
    try {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        jwt = data.session?.access_token ?? '';
      }
    } catch { /* ignore */ }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Usage-Type': usageType,
    };
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

    const body = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    const response = await fetch(`${AI_PROXY_URL}/ai`, { method: 'POST', signal, headers, body: JSON.stringify(body) });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(err?.error ?? `AI service error: ${response.status}`);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '';
  }

  // ── Direct Groq fallback (dev mode) ────────────────────────
  if (!hasApiKey()) throw new Error('All AI servers are busy right now. Please wait a moment and try again.');

  const dedupKey = `${systemPrompt.slice(0, 80)}|${userPrompt.slice(0, 80)}|${temperature}|${maxTokens}`;
  const existing = pendingRequests.get(dedupKey);
  if (existing) return existing;

  const request = (async (): Promise<string> => {
    const response = await fetchDirectWithKeyRotation(key => fetch(GROQ_API_URL, {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: FALLBACK_MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens, ...(jsonMode ? { response_format: { type: 'json_object' } } : {}) }),
      }));
    if (!response.ok) { const err = await response.json().catch(() => ({})) as { error?: { message?: string } }; throw new Error(err?.error?.message || `Groq API error: ${response.status}`); }
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '';
  })();

  pendingRequests.set(dedupKey, request);
  try { return await request; } finally { pendingRequests.delete(dedupKey); }
}

// ─── Streaming Groq for long-running JSON calls (proxy-aware) ──

export async function callGroqStreaming(
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
    onProgress?: (chars: number) => void;
    usageType?: string;
  } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4096, signal, onProgress, usageType = 'unknown' } = options;

  const readStream = async (response: Response): Promise<string> => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream');
    const decoder = new TextDecoder();
    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;
        try {
          const delta = (JSON.parse(json) as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
          if (delta) { accumulated += delta; onProgress?.(accumulated.length); }
        } catch { /* skip */ }
      }
    }
    return accumulated;
  };

  // ── Proxy path ─────────────────────────────
  if (AI_PROXY_URL) {
    let jwt = '';
    try { if (supabase) { const { data } = await supabase.auth.getSession(); jwt = data.session?.access_token ?? ''; } } catch { /* ignore */ }
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Usage-Type': usageType, 'X-Stream': '1' };
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
    // Streaming callers include conversational features such as Counselor.
    // Do not request JSON here: a prose response combined with json_object is
    // rejected by Groq and made Counselor fall back to its canned answer.
    const body = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens, stream: true };
    const response = await fetch(`${AI_PROXY_URL}/ai`, { method: 'POST', signal, headers, body: JSON.stringify(body) });
    if (!response.ok) { const err = await response.json().catch(() => ({})) as { error?: string }; throw new Error(err?.error ?? `AI error: ${response.status}`); }
    return readStream(response);
  }

  // ── Direct Groq fallback (dev) ──────────────
  const response = await fetchDirectWithKeyRotation(key => fetch(GROQ_API_URL, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: FALLBACK_MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens, stream: true, response_format: { type: 'json_object' } }),
    }));
  if (!response.ok) { const err = await response.json().catch(() => ({})) as { error?: { message?: string } }; throw new Error(err?.error?.message || `Groq error: ${response.status}`); }
  return readStream(response);
}

// ─── Stream Chat ───────────────────────────────────────────────

export async function* streamChat(
  jobTitle: string,
  jobContext: string,
  messages: { role: 'user' | 'assistant'; text: string }[]
): AsyncGenerator<string> {
  const systemPrompt = `You are a sharp, knowledgeable career advisor embedded in a career exploration app. The user is exploring the profession of "${jobTitle}".

Context about this specific role:
${jobContext}

Your personality:
- Direct and specific — never give vague, generic advice
- Use real industry terminology, tool names, and insider knowledge
- Honest about both pros and cons — don't sugarcoat
- Cite concrete examples, numbers, and real-world scenarios when possible

Formatting rules:
- Use **bold** for key terms and emphasis
- Use bullet points (- ) for lists
- Use ### for section headings when the answer has multiple parts
- Keep paragraphs short (2-3 sentences max)
- Use line breaks between sections for readability
- If giving steps, use numbered lists (1. 2. 3.)
- Never use generic filler phrases like "great question" or "I'd be happy to help"`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.text })),
  ];

  const readStream = async function* (response: Response): AsyncGenerator<string> {
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
            const json = JSON.parse(trimmed.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch { /* skip malformed JSON */ }
        }
      }
    }
  };

  // ── Proxy path ─────────────────────────────
  if (AI_PROXY_URL) {
    let jwt = '';
    try { if (supabase) { const { data } = await supabase.auth.getSession(); jwt = data.session?.access_token ?? ''; } } catch { /* ignore */ }
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Usage-Type': 'chat', 'X-Stream': '1' };
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
    const response = await fetch(`${AI_PROXY_URL}/ai`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages: apiMessages, temperature: 0.7, max_tokens: 1024, stream: true }),
    });
    if (!response.ok) { const err = await response.json().catch(() => ({})) as { error?: string }; throw new Error(err?.error ?? `AI error: ${response.status}`); }
    yield* readStream(response);
    return;
  }

  // ── Direct Groq fallback (dev) ──────────────
  const response = await fetchDirectWithKeyRotation(key => fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: FALLBACK_MODEL, messages: apiMessages, temperature: 0.7, max_tokens: 1024, stream: true }),
  }));
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Groq API error: ${response.status}`);
  }
  yield* readStream(response);
}

// ─── Preliminary Assessment (fast, 2-field snapshot) ──────────

export interface AIJobPreliminary {
  category: string;
  shortDescription: string;
  avgSalary: string;
}

export async function generatePreliminaryAssessmentAI(title: string): Promise<AIJobPreliminary> {
  const currency = (() => {
    try {
      return (JSON.parse(localStorage.getItem('careersim_preferences') || '{}').currency as 'INR' | 'USD') || 'INR';
    } catch { return 'INR' as const; }
  })();
  const isIndia = currency === 'INR';
  const cacheKey = `prelim_${title.toLowerCase().replace(/\s+/g, '_')}_${currency.toLowerCase()}`;

  const cached = getCached<AIJobPreliminary>(cacheKey);
  if (cached) return cached;

  const result = await withRetry(async () => {
    const systemPrompt = isIndia
      ? `You are a career expert specializing in the Indian job market. Return ONLY valid JSON. Be vivid, specific, and avoid generic corporate language.`
      : `You are a career expert. Return ONLY valid JSON. Be vivid, specific, and avoid generic corporate language.`;

    const salaryFmt = isIndia
      ? `"avgSalary": "Realistic Indian salary range in LPA e.g. '₹5 LPA – ₹18 LPA'. Base on actual market data for this role."`
      : `"avgSalary": "Realistic US salary range e.g. '$55,000 – $120,000'. Base on actual market data for this role."`;

    const raw = await callGroq(systemPrompt,
      `Give a brief snapshot for the career: "${title}".
Return this JSON:
{
  "category": "One of: Healthcare, Technology & Engineering, Law & Justice, Finance, Education, Creative Arts, Food & Hospitality, Aviation & Space, Nature & Environment, Leadership & Management, Skilled Trades, Social Services, Professional Services",
  "shortDescription": "3-4 vivid, concrete sentences about what a ${title} ACTUALLY does day-to-day. Mention specific tools, environments, or situations. Avoid vague phrases like 'plays a crucial role' or 'is responsible for'. Paint a picture.",
  ${salaryFmt}
}`,
      { temperature: 0.6, maxTokens: 400, jsonMode: true, usageType: 'preliminary' }
    );
    return JSON.parse(raw) as AIJobPreliminary;
  });

  setCache(cacheKey, result);
  return result;
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
  topCompanies?: Array<{ name: string; domain: string; description: string; careerPageUrl: string }>;
  relevantForCompanies?: boolean;
}

export async function generateJobDataAI(title: string, skipCache = false, contextDescription?: string): Promise<AIJobData> {
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

    const descriptionHint = contextDescription
      ? `\n\nThe user has confirmed/refined the following preliminary description for this role — use it as strong context to tailor the dossier accurately:\n"${contextDescription}"`
      : '';

    const userPrompt = `Generate a detailed career dossier for: "${title}"${contextNote}${descriptionHint}

WRITING STYLE: Be concrete, vivid, and specific. Avoid filler phrases like "plays a crucial role", "dynamic field", "fast-paced environment", or "exciting opportunity". Instead, describe what a person actually DOES, SEES, and EXPERIENCES. Use specific tools, software, techniques, and real-world examples.

Return this exact JSON structure:
{
  "category": "One of: Healthcare, Technology & Engineering, Law & Justice, Finance, Education, Creative Arts, Food & Hospitality, Aviation & Space, Nature & Environment, Leadership & Management, Skilled Trades, Social Services, Professional Services",
  "shortDescription": "A compelling 3-4 sentence overview of what a ${title} actually does day-to-day. Paint a picture — mention specific tools, environments, and tasks.",
  "fullDescription": "A detailed 4-paragraph description covering: (1) what the role actually involves at its core, (2) the day-to-day realities and what makes it unique, (3) the impact and rewards — both tangible and intangible, and (4) how the profession has evolved and where it's heading. Use \\n\\n between paragraphs. Each paragraph should be 3-4 sentences.",
  ${salaryInstruction},
  ${educationInstruction},
  "skills": ["Array of 8-12 specific skills — mix of technical skills with real tool/framework names and soft skills unique to this role. No generic skills like 'communication' unless you explain the specific type (e.g. 'Client-facing presentation skills')"],
  "dailyRoutine": "A vivid, minute-by-minute description of a typical day for a ${title}. Include actual times (e.g. '8:30 AM — arrive at...'), real tasks, specific tools used, and sensory details. 5-6 sentences minimum.",
  "workEnvironment": "Specific description of where and how a ${title} works — physical space, equipment, team structure, noise level, dress code, pace. 3-4 sentences with concrete details.",
  "careerPath": "Realistic career progression from entry-level to senior/expert for a ${title}. Include specific job titles at each stage, year ranges, salary progression hints, and key transition points. 5-6 sentences.",
  "weekOverview": "Detailed week breakdown with **Monday:** through **Friday:** formatting and \\n\\n between days. Each day should describe specific tasks and meetings unique to ${title}. 2-3 sentences per day.",
  "quarterOverview": "Three-month view with **Month 1:** through **Month 3:** formatting and \\n\\n between months. Describe projects, goals, and milestones. 2-3 sentences per month.",
  "yearOverview": "Annual view with **Q1:** through **Q4:** formatting and \\n\\n between quarters. Describe seasonal patterns, reviews, and long-term projects. 2-3 sentences per quarter.",
  "funFact": "One genuinely interesting, surprising, and TRUE fact about being a ${title}. Should make someone go 'I had no idea!' Not generic.",
  "relevantForCompanies": true or false (true for mainstream employed roles like Software Engineer, Doctor, Accountant; false for niche/freelance/unusual roles where company listings are irrelevant),
  "topCompanies": [if relevantForCompanies is true: 3-5 well-known companies${isIndia ? ' in India' : ''} that hire for this role. Each: {"name":"Company Name","domain":"company.com","description":"One sentence on why they are a great place for a ${title}","careerPageUrl":"https://careers.company.com"}. If relevantForCompanies is false, return []]
}`;

    const raw = await callGroq(systemPrompt, userPrompt, {
      temperature: 0.65,
      maxTokens: 5000,
      jsonMode: true,
      usageType: 'dossier',
    });

    return JSON.parse(raw) as AIJobData;
  });

  setCache(cacheKey, result);
  return result;
}

// ─── The Good, The Bad & The Ugly ──────────────────────────────

export interface GoodBadUgly {
  good: Array<{ title: string; detail: string }>;
  bad: Array<{ title: string; detail: string }>;
  ugly: Array<{ title: string; detail: string }>;
  verdict: string;
}

export async function getGoodBadUgly(jobTitle: string, signal?: AbortSignal): Promise<GoodBadUgly> {
  const cacheKey = `gbu_${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<GoodBadUgly>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a brutally honest career advisor who tells it like it is. No sugarcoating, no corporate fluff. Return ONLY valid JSON.',
      `Give an unfiltered "The Good, The Bad & The Ugly" assessment of being a "${jobTitle}".

Return this exact JSON:
{
  "good": [
    {"title": "Short punchy label (2-4 words)", "detail": "One honest, specific sentence about why this is genuinely great. Use concrete examples."},
    {"title": "...", "detail": "..."},
    {"title": "...", "detail": "..."}
  ],
  "bad": [
    {"title": "Short punchy label", "detail": "One honest sentence about a real downside. No 'but on the bright side' hedging."},
    {"title": "...", "detail": "..."},
    {"title": "...", "detail": "..."}
  ],
  "ugly": [
    {"title": "Short punchy label", "detail": "One sentence about the truly rough part that nobody talks about in career fairs."},
    {"title": "...", "detail": "..."}
  ],
  "verdict": "A sharp 2-sentence final take — who thrives in this career, and who should run the other way."
}

Each array should have exactly 3 items for good, 3 for bad, and 2 for ugly. Be specific to ${jobTitle} — not generic career advice.`,
      { temperature: 0.75, maxTokens: 800, jsonMode: true, signal, usageType: 'gbu' }
    );

    const parsed = JSON.parse(raw) as Partial<GoodBadUgly>;
    const validItems = (value: unknown): Array<{ title: string; detail: string }> => Array.isArray(value)
      ? value.filter((item): item is { title: string; detail: string } => Boolean(item) && typeof item.title === 'string' && typeof item.detail === 'string')
      : [];
    const result: GoodBadUgly = {
      good: validItems(parsed.good),
      bad: validItems(parsed.bad),
      ugly: validItems(parsed.ugly),
      verdict: typeof parsed.verdict === 'string' ? parsed.verdict : 'Use this dossier as a starting point, then validate the role through conversations and real work samples.',
    };
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Refine Job Description ────────────────────────────────────

export async function refineJobDescription(
  title: string,
  currentDescription: string,
  refinementContext: string,
  previousRefinements: string[]
): Promise<string> {
  return withRetry(async () => {
    const systemPrompt = `You are a career research expert helping someone understand a SPECIFIC variant of a profession. Rewrite the job description to incorporate the user's particular context (e.g. industry, location, company size, specialization). Return ONLY the new description text — no JSON, no markdown, no quotes. The description should be 4-6 vivid, concrete sentences. Avoid generic phrases.`;

    const previousContext = previousRefinements.length > 0
      ? `\nPrevious refinements already applied: ${previousRefinements.join('; ')}`
      : '';

    const userPrompt = `Job title: ${title}
Current description: ${currentDescription}
${previousContext}

The user wants to refine with this context: "${refinementContext}"

Rewrite the description to fully incorporate this context. Make it feel like it was written specifically for this variant of the role. Be concrete — mention specific tools, environments, or situations that match the refinement.`;

    return callGroq(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 500, usageType: 'refine' });
  });
}

// ─── Resume Extraction (Phase 3) ──────────────────────────────────────

export interface ResumeExtraction {
  skills: Array<{
    name: string;
    proficiency: 1 | 2 | 3 | 4;
    evidence: string;
  }>;
  experiences: Array<{
    title: string;
    years: number;
    description: string;
  }>;
  education?: {
    level: 'below_10' | 'class_10' | 'class_12' | 'iti_diploma' | 'undergraduate' | 'postgraduate';
    field?: string;
  };
}

export async function extractProfileFromResume(resumeText: string): Promise<ResumeExtraction> {
  const systemPrompt = `You are a resume parser specialized in extracting structured career data from Indian resumes. Extract skills, experiences, and education. Return ONLY valid JSON.

IMPORTANT:
- Skill proficiency levels: 1=beginner, 2=intermediate, 3=advanced, 4=expert
- For each skill, extract a specific quoted phrase from the resume as evidence
- For experiences, infer years from dates (e.g., "Jan 2020 - Present" in 2026 = 6 years)
- Be conservative with proficiency estimates based on years of experience and context
- Extract ACTUAL skills mentioned, not inferred ones`;

  const userPrompt = `Parse this resume and extract structured data:

${resumeText}

Return this exact JSON:
{
  "skills": [
    {"name": "Exact skill name from resume (preserve framework, protocol, library, hardware, and security names; do not collapse them into generic categories)", "proficiency": 1-4, "evidence": "Quoted phrase from resume mentioning this skill"},
    ...
  ],
  "experiences": [
    {"title": "Job title", "years": estimated years in decimal (e.g., 2.5), "description": "Brief 1-2 sentence summary"},
    ...
  ],
  "education": {
    "level": "one of: below_10, class_10, class_12, iti_diploma, undergraduate, postgraduate",
    "field": "field of study if mentioned"
  }
}`;

  const raw = await callGroq(systemPrompt, userPrompt, {
    temperature: 0.3,
    maxTokens: 2000,
    jsonMode: true,
    usageType: 'resume_extract',
  });

  // Defensive parse with fallbacks
  try {
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
      education: parsed.education || undefined,
    };
  } catch (err) {
    console.error('Resume extraction parse error:', err);
    throw new Error('Failed to parse resume. Please try again or check the format.');
  }
}

export interface AspirationExtraction {
  statement: string;
  horizonYears: number;
  themes: string[];
  dreamOccupationIds: string[];
  entrepreneurialIntent: 'none' | 'curious' | 'strong';
}

export async function extractAspiration(statement: string, horizonYears: number, themes: string[], entrepreneurialIntent: AspirationExtraction['entrepreneurialIntent'], language = 'English'): Promise<AspirationExtraction> {
  const raw = await callGroq(
    `You are a warm career interviewer. Return only JSON written in ${language}. Never promise a perfect career; preserve user agency. Extract only what the user supports.`,
    'Turn this user reflection into a compact aspiration object. Do not invent facts or occupation codes. Return {"statement":"...","horizonYears":' + horizonYears + ',"themes":[...],"dreamOccupationIds":[plain role titles],"entrepreneurialIntent":"' + entrepreneurialIntent + '"}. Reflection: ' + statement + '. Themes: ' + themes.join(', '),
    { temperature: 0.3, maxTokens: 500, jsonMode: true, usageType: 'aspiration' },
  );
  try {
    const fence = String.fromCharCode(96).repeat(3);
    const parsed = JSON.parse(raw.replace(fence + 'json\n', '').replace(fence, '')) as Partial<AspirationExtraction>;
    return {
      statement: typeof parsed.statement === 'string' ? parsed.statement.slice(0, 500) : statement,
      horizonYears: typeof parsed.horizonYears === 'number' ? Math.max(1, Math.min(20, parsed.horizonYears)) : horizonYears,
      themes: Array.isArray(parsed.themes) ? parsed.themes.filter((v): v is string => typeof v === 'string').slice(0, 8) : themes,
      dreamOccupationIds: Array.isArray(parsed.dreamOccupationIds) ? parsed.dreamOccupationIds.filter((v): v is string => typeof v === 'string').slice(0, 5) : [],
      entrepreneurialIntent: parsed.entrepreneurialIntent === 'strong' || parsed.entrepreneurialIntent === 'curious' ? parsed.entrepreneurialIntent : entrepreneurialIntent,
    };
  } catch {
    return { statement, horizonYears, themes, dreamOccupationIds: [], entrepreneurialIntent };
  }
}

export async function* streamCounselorChat(messages: { role: 'user' | 'assistant'; text: string }[], groundingContext: string, language = 'English'): AsyncGenerator<string> {
  const system = `You are an experienced, honest Indian career counselor. Respond in ${language} and stay under 180 words unless asked. Use only the supplied CONTEXT. Cite the specific profile facts or component scores driving each answer. If a requested fact is absent, say exactly what is missing. Never invent salary figures, demand statistics, occupation requirements, course names, institutions, or score changes. A skill may change a score only when CONTEXT contains an explicit computed before/after counterfactual; otherwise say the engine cannot quantify the change. If a component is already 100, never say it can rise further. Distinguish deterministic app evidence from an external-market hypothesis, and distinguish fact, inference, and preference. Treat user-marked pathway evidence as user-reported unless independently verified. Use calibrated language such as “strong option to explore” and “plausible route”; never promise success. Preserve agency and offer alternatives. Recommend a human counselor for distress, family conflict, high-cost decisions, or repeated rejection of all options. CONTEXT:\n${groundingContext}`;
  const raw = await callGroqStreaming(system, messages.map(m => m.role + ': ' + m.text).join('\n'), { usageType: 'counselor', maxTokens: 700 });
  yield raw;
}

export interface CareerCompatibilityInput {
  title: string;
  dossier: string;
  passport: unknown;
  simulation?: { score: number; summary?: string; completedScenarios: number };
}

export async function assessCareerCompatibility(input: CareerCompatibilityInput): Promise<string> {
  return callGroq(
    `You are a careful career counselor. Assess compatibility using only the supplied career dossier, Career Passport, and optional simulation result. Do not invent facts or give a fabricated percentage. Be concise, specific, and honest. Use exactly these headings: "What fits", "What to test", and "A practical next step". Explain that this is an exploratory compatibility check, not a verdict.`,
    JSON.stringify(input),
    { temperature: 0.35, maxTokens: 650, usageType: 'compatibility' },
  );
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

    const systemPrompt = `You are a career simulation designer who creates immersive, realistic "day in the life" scenarios. Your scenarios should feel like you've actually worked in these jobs. Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Create exactly 10 "day in the life" scenarios for a "${jobTitle}".

Rules:
- SPECIFIC to ${jobTitle} — use real jargon, real tools, real software, real situations that only someone in this field would encounter
- Chronological through a full working day (early morning to evening)
- 3 choices each, only 1 correct (what an experienced professional would actually do)
- Explanations should teach industry-specific knowledge — WHY is this the right approach?
- Vary which index is correct (mix of 0, 1, and 2) — never make a pattern
- CRITICAL: The description must paint the SITUATION/CONTEXT vividly (what you see, hear, what's happening). Do NOT mention, hint at, or reveal which action is correct. The user must make a genuine decision based on the scenario.
- Wrong choices must be plausible — things a junior professional or someone from a different field might reasonably do
- Include specific details: client/patient names (fictional), software tools, equipment names, technical measurements, company scenarios

stickFigurePose options: ${poses.join(', ')}

Return JSON object with "scenarios" key containing array of 10:
{"scenarios": [{"time":"6:00 AM","title":"Short punchy title (3-5 words)","description":"2-3 vivid sentences painting the scene. What do you see? What's the urgency? What just happened?","stickFigurePose":"waking","choices":[{"text":"Specific action A","isCorrect":false},{"text":"Specific action B","isCorrect":true},{"text":"Specific action C","isCorrect":false}],"correctChoiceIndex":1,"explanation":"2-3 sentences explaining why this is the professional approach and what could go wrong with the other choices."}]}`;

    const raw = await callGroq(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 4000,
      jsonMode: true,
      usageType: 'simulation',
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
      { temperature: 0.7, maxTokens: 600, jsonMode: true, usageType: 'related' }
    );

    const parsed = JSON.parse(raw);
    const candidates = parsed.careers || parsed.data || Object.values(parsed)[0];
    return Array.isArray(candidates)
      ? candidates.filter((item): item is RelatedCareer => Boolean(item) && typeof item.title === 'string' && typeof item.similarity === 'string' && typeof item.description === 'string')
      : [];
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
    const pct = totalScenarios > 0 ? Math.round((correctCount / totalScenarios) * 100) : 0;
    const fitLevel = pct >= 70 ? 'strong natural fit' : pct >= 40 ? 'promising potential' : 'an interesting exploration';

    const raw = await callGroq(
      `You write sharp, honest, visually engaging career assessment summaries. Address the user directly using "you" and "your" — never refer to them in third person. Use this exact format — no deviations:

Line 1: A punchy 1-sentence verdict about your fit. No label, just the sentence.

STRENGTHS:
- [specific strength based on what you got right — reference scenario names]
- [another strength]
- [another if applicable]

AREAS TO DEVELOP:
- [honest gap based on what you missed — reference scenario names]
- [another area]

Final paragraph: 2-3 encouraging sentences about your journey into the field.`,
      `User completed "${jobTitle}" simulation: ${correctCount}/${totalScenarios} (${pct}%) — ${fitLevel}.

Nailed: ${rightOnes.join(', ') || 'None'}
Missed: ${wrongOnes.join(', ') || 'None'}

Write the assessment exactly in the format described. Keep each bullet to one clear sentence.`,
      { temperature: 0.7, maxTokens: 700, usageType: 'refine' }
    );

    return raw;
  });
}

// ─── Mood Match ────────────────────────────────────────────────

export interface MoodMatch {
  title: string;
  reason: string;
  vibe: string;
}

export async function getMoodMatches(mood: string): Promise<MoodMatch[]> {
  const text = mood.toLowerCase();
  const rule = /creative|express|art|imagin/.test(text) ? { cluster: 'creative', dimension: 'A' as const, vibe: 'creative · expressive · open' }
    : /help|care|people|calm/.test(text) ? { cluster: 'people', dimension: 'S' as const, vibe: 'people · impact · care' }
    : /build|hands|outdoor|restless/.test(text) ? { cluster: 'hands_on', dimension: 'R' as const, vibe: 'hands-on · tangible · active' }
    : /competitive|lead|driven|ambitious/.test(text) ? { cluster: 'enterprising', dimension: 'E' as const, vibe: 'enterprising · decisive · visible' }
    : /analyt|curious|puzzle|focus|world/.test(text) ? { cluster: 'analytical', dimension: 'I' as const, vibe: 'deep-work · investigative · focused' }
    : { cluster: 'structured', dimension: 'C' as const, vibe: 'structured · steady · precise' };
  return [...OCCUPATIONS]
    .sort((a, b) => Number(b.cluster === rule.cluster) - Number(a.cluster === rule.cluster) || b.riasecProfile[rule.dimension] - a.riasecProfile[rule.dimension] || a.title.localeCompare(b.title))
    .slice(0, 3)
    .map(occupation => ({ title: occupation.title, vibe: rule.vibe, reason: `${occupation.title} is tagged ${occupation.cluster.replace('_', ' ')} with ${rule.dimension} ${occupation.riasecProfile[rule.dimension]}/100 in the versioned occupation profile.` }));
}

// ─── Career Quiz ───────────────────────────────────────────────

export async function getQuizFromScratch(userText: string): Promise<QuizResult> {
  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career counselor AI. Based on a short free-text self-description, identify best-fit careers. Return ONLY valid JSON.',
      `The user wrote this about themselves: "${userText}"

Based on their personality, interests, and values, suggest 5 best-fit careers.

Return this exact JSON:
{
  "personalityInsight": "3-4 sentences describing their career personality and what makes them unique professionally",
  "careers": [
    {"title": "Career Title", "reason": "One specific sentence explaining why this may be worth exploring"},
    ...
  ]
}

Do not produce scores, percentages, rankings, or verdicts. These suggestions are practice-only and do not alter the deterministic recommendation engine.`,
      { temperature: 0.75, maxTokens: 800, jsonMode: true, usageType: 'quiz' }
    );
    return JSON.parse(raw) as QuizResult;
  });
}

export interface QuizResult {
  careers: Array<{
    title: string;
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

Return: {"careers":[{"title":"Career Name","reason":"One sentence explaining why this may be worth exploring."}],"personalityInsight":"2-3 sentence summary of their work personality based on answers."}

Do not produce scores, percentages, rankings, or verdicts. Be diverse in suggestions and include at least one unexpected career.`,
      { temperature: 0.8, maxTokens: 800, jsonMode: true, usageType: 'quiz' }
    );

    return JSON.parse(raw) as QuizResult;
  });
}

// ─── Validate API Key ──────────────────────────────────────────

export async function validateApiKey(_key: string): Promise<boolean> {
  // Built-in keys are used; no user key validation needed
  return true;
}

// ─── AI Job Title Suggestions (Typeahead) ─────────────────────

export async function getJobSuggestions(partial: string): Promise<string[]> {
  if (!hasApiKey() || partial.trim().length < 2) return [];

  const cacheKey = `suggest_${partial.trim().toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const raw = await callGroq(
      'You are a job title autocomplete assistant. Return ONLY valid JSON. Be creative and diverse.',
      `Suggest exactly 7 real, specific job titles that match or relate to "${partial}". Include a mix of common and niche professions. Sort by relevance - most relevant first.

Return: {"suggestions": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6", "Title 7"]}`,
      { temperature: 0.4, maxTokens: 200, jsonMode: true, usageType: 'suggestion' }
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

export async function getTrendingCareers(signal?: AbortSignal): Promise<TrendingCareers> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const localCacheKey = `trending_careers_${today}`;

  // 1. Check localStorage (fast path — avoids Supabase round-trip on same-session revisit)
  const localCached = getCached<TrendingCareers>(localCacheKey);
  if (localCached) return normalizeTrendingCareers(localCached);

  // 2. Check Supabase shared daily cache — no AI call needed if populated by any earlier visitor
  if (supabase) {
    try {
      const { data } = await supabase
        .from('trending_cache')
        .select('data')
        .eq('cache_date', today)
        .single();
      if (data?.data) {
        const normalized = normalizeTrendingCareers(data.data);
        setCache(localCacheKey, normalized);
        return normalized;
      }
    } catch {
      // Supabase unavailable — fall through to AI call
    }
  }

  // 3. No cache found — first visitor of the day: generate with AI and save for everyone
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
      { temperature: 0.5, maxTokens: 800, jsonMode: true, signal, usageType: 'trending' }
    );

    const result = normalizeTrendingCareers(JSON.parse(raw));
    setCache(localCacheKey, result);

    // Persist to Supabase — upsert so concurrent first-visitors don't cause duplicate errors
    if (supabase) {
      void supabase
        .from('trending_cache')
        .upsert({ cache_date: today, data: result }, { onConflict: 'cache_date' })
        .then(() => null, () => null); // fire-and-forget; not critical
    }

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
      { temperature: 0.4, maxTokens: 800, jsonMode: true, signal, usageType: 'related' }
    );

    const parsed = JSON.parse(raw) as Partial<LearnMoreResources>;
    const result: LearnMoreResources = {
      subreddits: Array.isArray(parsed.subreddits) ? parsed.subreddits : [],
      searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      books: Array.isArray(parsed.books) ? parsed.books : [],
    };
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
  signal?: AbortSignal,
  fromDesc?: string,
  toDesc?: string,
): Promise<CareerTransitionPlan> {
  const currency = (() => { try { return (JSON.parse(localStorage.getItem('careersim_preferences') || '{}').currency as 'INR' | 'USD') || 'INR'; } catch { return 'INR' as const; } })();
  const isIndia = currency === 'INR';
  const cacheKey = `transition_${fromTitle.toLowerCase().replace(/\s+/g, '_')}_to_${toTitle.toLowerCase().replace(/\s+/g, '_')}_${currency.toLowerCase()}`;
  const cached = getCached<CareerTransitionPlan>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroqStreaming(
      'You are a career transition coach. Return ONLY valid JSON. Be specific and practical.',
      `Create a detailed career transition plan from "${fromTitle}" to "${toTitle}"${isIndia ? ' in the Indian job market context. Use INR (LPA format) for salary figures, reference Indian certifications, companies and platforms where relevant.' : ''}.${fromDesc || toDesc ? ` User's specific context: ${fromDesc ? `"${fromTitle}" = "${fromDesc}".` : ''}${toDesc ? ` "${toTitle}" = "${toDesc}".` : ''} Factor this in for a tailored plan.` : ''} Return this exact JSON:
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
      { temperature: 0.6, maxTokens: 1200, signal, usageType: 'transition' }
    );

    const result = JSON.parse(raw) as CareerTransitionPlan;
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Quick one-line description (free, standard model) ──────────

export async function getQuickDescription(jobTitle: string, signal?: AbortSignal): Promise<string> {
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('careersim_preferences') || '{}') as Record<string, string>; } catch { return {} as Record<string, string>; } })();
  const isIndia = ((prefs.currency as string) || 'INR') === 'INR';
  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career expert. Write exactly one clear sentence (max 25 words) describing a specific, concrete interpretation of this job title. Mention specialisation, sector, and work setting. Return ONLY the sentence — no quotes, no extra text.',
      `Job title: "${jobTitle}"${isIndia ? ' in the Indian job market.' : '.'}`,
      { temperature: 0.4, maxTokens: 80, signal, usageType: 'preliminary' }
    );
    return raw.trim().replace(/^["']|["']$/g, '');
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

export async function getCareerRoadmap(jobTitle: string, signal?: AbortSignal, description?: string): Promise<CareerRoadmap> {
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('careersim_preferences') || '{}') as Record<string, string>; } catch { return {} as Record<string, string>; } })();
  const currency = (prefs.currency as 'INR' | 'USD') || 'INR';
  const detailLevel = (prefs.roadmapDetailLevel as 'essential' | 'detailed' | 'comprehensive') || 'detailed';
  const isIndia = currency === 'INR';
  const descKey = description ? `_${description.slice(0, 40).replace(/\s+/g, '_')}` : '';
  const cacheKey = `roadmap_${jobTitle.toLowerCase().replace(/\s+/g, '_')}_${currency.toLowerCase()}_${detailLevel}${descKey}`;
  const cached = getCached<CareerRoadmap>(cacheKey);
  if (cached) return cached;

  const detailInstruction = detailLevel === 'essential'
    ? 'Be concise — only include the most important milestones (2 per stage max).'
    : detailLevel === 'comprehensive'
      ? 'Be comprehensive — include 4-5 milestones per stage, detailed skills, and thorough key decisions.'
      : 'Be moderately detailed — include 3 milestones and 3 skills per stage.';

  const prompt = `Create a comprehensive career roadmap for "${jobTitle}"${isIndia ? ' in the Indian job market. Use INR (LPA format) for salaries, reference relevant Indian companies, certifications (e.g. GATE, CA, UPSC where relevant), and realistic Indian career progression timelines.' : ''}.${description ? ` The user's specific context for this role: "${description}" — tailor the roadmap to this specialisation and setting.` : ''} ${detailInstruction} Return this exact JSON structure:
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
Include 5 stages (Entry, Junior, Mid-level, Senior, Expert/Leadership). Use distinct colors for each stage.`;

  return withRetry(async () => {
    try {
      // Use non-streaming call with JSON mode for roadmap
      const raw = await callGroq(
        'You are a career development strategist. Return ONLY valid JSON. Be specific to this profession.',
        prompt,
        { temperature: 0.6, maxTokens: 1400, signal, jsonMode: true }
      );

      // Clean the response: remove any markdown formatting
      let cleaned = raw.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '');
      cleaned = cleaned.replace(/```/g, '').trim();

      const result = JSON.parse(cleaned) as CareerRoadmap;
      
      // Validate the result has required fields
      if (!result.title || !result.stages || !Array.isArray(result.stages) || result.stages.length === 0) {
        console.error('Invalid roadmap structure:', result);
        throw new Error('AI returned incomplete roadmap data');
      }
      
      setCache(cacheKey, result);
      return result;
    } catch (parseError) {
      console.error('Roadmap generation error:', parseError);
      if (parseError instanceof SyntaxError) {
        throw new Error('Failed to generate roadmap. The AI response was not in valid JSON format. Please try again.');
      }
      throw parseError;
    }
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

// ─── Interview Difficulty ──────────────────────────────────────

export interface InterviewDifficulty {
  score: number; // 1-5
  label: string; // e.g. "Moderately Hard"
  notes: string; // one sentence
}

export async function getInterviewDifficulty(jobTitle: string, signal?: AbortSignal): Promise<InterviewDifficulty> {
  const cacheKey = `interview_diff_${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<InterviewDifficulty>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a recruiting expert. Return ONLY valid JSON.',
      `Rate the typical interview difficulty for "${jobTitle}" on a 1-5 scale. Return this exact JSON:
{
  "score": 3,
  "label": "Moderately Hard",
  "notes": "One sentence on what makes interviews challenging or easy for this role."
}
Score: 1 = Very Easy, 2 = Easy, 3 = Moderate, 4 = Hard, 5 = Very Hard.`,
      { temperature: 0.4, maxTokens: 200, jsonMode: true, signal, usageType: 'interview' }
    );

    const result = JSON.parse(raw) as InterviewDifficulty;
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Growth Outlook ────────────────────────────────────────────

export async function getGrowthOutlook(jobTitle: string, signal?: AbortSignal): Promise<string> {
  const cacheKey = `growth_outlook_${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a labour market analyst. Return ONLY valid JSON.',
      `Provide a one-sentence growth outlook for the "${jobTitle}" career over the next decade. Return this exact JSON:
{"outlook": "One sentence describing whether the role is growing, stable, or declining and why."}`,
      { temperature: 0.5, maxTokens: 150, jsonMode: true, signal, usageType: 'related' }
    );

    const parsed = JSON.parse(raw) as { outlook: string };
    const result = parsed.outlook || '';
    setCache(cacheKey, result);
    return result;
  });
}

// ─── Comparison insight ────────────────────────────────────────

export async function getComparisonInsight(
  titleA: string, descA: string,
  titleB: string, descB: string,
  signal?: AbortSignal,
): Promise<string> {
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('careersim_preferences') || '{}') as Record<string, string>; } catch { return {} as Record<string, string>; } })();
  const isIndia = ((prefs.currency as string) || 'INR') === 'INR';
  return withRetry(async () => {
    const raw = await callGroq(
      'You are a career counsellor. Return ONLY valid JSON.',
      `Compare these two careers and give a sharp 2-3 sentence verdict covering: which suits which type of person, the key tradeoff, and which has better long-term prospects${isIndia ? ' in India' : ''}.
Career A: "${titleA}"${descA ? ` — ${descA}` : ''}
Career B: "${titleB}"${descB ? ` — ${descB}` : ''}
Return JSON: {"insight": "2-3 sentence comparison and verdict"}`,
      { temperature: 0.6, maxTokens: 220, jsonMode: true, signal, usageType: 'compare' }
    );
    const parsed = JSON.parse(raw) as { insight: string };
    return parsed.insight || '';
  });
}

// ─── Work-Life Balance Radar ────────────────────────────────────

export async function getWorkLifeBalance(jobTitle: string, signal?: AbortSignal): Promise<WorkLifeBalance> {
  const cacheKey = `wlb2_${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached<WorkLifeBalance>(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const raw = await callGroq(
      'You are a workplace wellness researcher with deep knowledge of different professions. Return ONLY valid JSON. Every score MUST be based on real, profession-specific data — do NOT copy the example placeholder values.',
      `Evaluate the realistic work-life balance for a "${jobTitle}" based on what professionals in this field commonly report.

IMPORTANT: Replace ALL placeholder numbers below with real, accurate scores for "${jobTitle}". The example numbers (42, 37, etc.) are just JSON structure guides — replace every single one.

Score scale: 0-100 where higher = BETTER quality of life in that dimension.
Research-based examples to guide you (NOT to copy):
- Surgeon: Work Hours ~25 (extremely long), Stress ~20 (very high stress), Flexibility ~15
- Software Engineer: Work Hours ~62, Flexibility ~78, Stress ~55
- Elementary Teacher: Social Life ~72, Work Hours ~55, Mental Health ~48
- Investment Banker: Work Hours ~18, Social Life ~22, Flexibility ~20
- Yoga Instructor: Work Hours ~70, Flexibility ~85, Social Life ~78

Return this JSON structure with REAL scores for "${jobTitle}":
{
  "metrics": [
    {"subject": "Work Hours", "score": 42, "description": "Typical weekly hours and schedule demands for ${jobTitle}"},
    {"subject": "Flexibility", "score": 37, "description": "Remote/hybrid work options and schedule autonomy"},
    {"subject": "Stress Level", "score": 51, "description": "Typical pressure, deadlines, emotional load (higher = lower stress)"},
    {"subject": "Job Security", "score": 63, "description": "Employment stability and demand outlook"},
    {"subject": "Social Life", "score": 58, "description": "Impact on personal relationships and personal time"},
    {"subject": "Physical Health", "score": 44, "description": "Physical demands, ergonomics, and health impact"},
    {"subject": "Mental Health", "score": 47, "description": "Cognitive load, burnout risk, emotional demands"}
  ],
  "overallScore": 49,
  "summary": "Write 2-3 specific, honest sentences about work-life balance for ${jobTitle} based on real professional reports",
  "bestFor": "Describe the type of person whose lifestyle suits this career",
  "worstFor": "Describe the type of person who would find this career's lifestyle difficult"
}`,
      { temperature: 0.7, maxTokens: 900, jsonMode: true, signal, usageType: 'wlb' }
    );

    const parsed = JSON.parse(raw) as Partial<WorkLifeBalance>;
    const result: WorkLifeBalance = {
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics.filter(metric => metric && typeof metric.subject === 'string' && typeof metric.score === 'number') : [],
      overallScore: typeof parsed.overallScore === 'number' ? Math.max(0, Math.min(100, parsed.overallScore)) : 50,
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Work-life conditions vary by employer, seniority, and work setting.',
      bestFor: typeof parsed.bestFor === 'string' ? parsed.bestFor : 'People who validate the day-to-day conditions with practitioners.',
      worstFor: typeof parsed.worstFor === 'string' ? parsed.worstFor : 'People whose non-negotiables conflict with the role’s actual schedule and pressure.',
    };
    setCache(cacheKey, result);
    return result;
  });
}
