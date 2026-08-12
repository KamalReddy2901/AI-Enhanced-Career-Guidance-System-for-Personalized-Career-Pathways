import { MODELS, USAGE_MODEL_TIER } from './models';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface Env {
  GROQ_API_KEYS: string;
  ENVIRONMENT?: string;
}

function cors(origin: string | null) {
  const allowed = ['https://career-sim.pages.dev', 'https://careercasehq.pages.dev', 'https://careercase.pages.dev', 'https://careercase.kamrede.page', 'http://localhost:5173', 'http://localhost:5174'];
  const allowOrigin = (origin && allowed.includes(origin)) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Usage-Type, X-Stream',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

const exhaustedKeys = new Map<string, number>();
const KEY_COOLDOWN_MS = 65_000;

function getActiveKey(keys: string[]): string {
  const now = Date.now();
  for (const key of keys) {
    const exhaustedAt = exhaustedKeys.get(key);
    if (!exhaustedAt || now - exhaustedAt > KEY_COOLDOWN_MS) {
      exhaustedKeys.delete(key);
      return key;
    }
  }
  return '';
}

function rotateKey(usedKey: string): void {
  exhaustedKeys.set(usedKey, Date.now());
}

async function proxyToGroq(
  body: unknown,
  modelTier: 'premium' | 'standard',
  keys: string[],
  isStream: boolean,
  origin: string | null,
): Promise<Response> {
  const payload = body as Record<string, unknown>;
  payload['model'] = MODELS[modelTier];

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = getActiveKey(keys);
    if (!key) break;

    const groqResp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (groqResp.status === 429) {
      rotateKey(key);
      continue;
    }

    if (!groqResp.ok) {
      const err = await groqResp.json().catch(() => ({})) as { error?: { message?: string } };
      return jsonResponse(
        { error: err?.error?.message ?? `Groq error ${groqResp.status}` },
        groqResp.status,
        origin,
      );
    }

    if (isStream) {
      return new Response(groqResp.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...cors(origin),
        },
      });
    }

    const data = await groqResp.json();
    return jsonResponse(data, 200, origin);
  }

  return jsonResponse(
    { error: 'All AI servers are busy right now. Please wait a moment and try again.' },
    503,
    origin,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/ai' || request.method !== 'POST') {
      return jsonResponse({ error: 'Not found' }, 404, origin);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    const usageType = request.headers.get('X-Usage-Type') ?? 'unknown';
    const isStream = request.headers.get('X-Stream') === '1';
    const modelTier = (USAGE_MODEL_TIER[usageType] ?? 'premium') as 'premium' | 'standard';

    const keys = env.GROQ_API_KEYS.split(',').map(k => k.trim()).filter(k => k.startsWith('gsk_'));
    if (!keys.length) {
      return jsonResponse({ error: 'Server misconfigured — no API keys' }, 500, origin);
    }

    return proxyToGroq(body, modelTier, keys, isStream, origin);
  },
};
