import { MODELS, USAGE_MODEL_TIER } from './models';
import { executeWithKeyRotation, KeyPool } from './keyRotation';
import { shouldRetryWithoutJsonMode } from './responsePolicy';
import { handleSihRequest } from './sih/routes';
import type { SihEnv } from './sih/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface Env extends SihEnv {
  GROQ_API_KEYS: string;
  ENVIRONMENT?: string;
}

const ALLOWED_ORIGINS = new Set([
  'https://career-sim.pages.dev',
  'https://careercasehq.pages.dev',
  'https://careercase.pages.dev',
  'https://careercase.kamrede.page',
  'http://localhost:5173',
  'http://localhost:5174',
]);

function cors(origin: string | null) {
  const allowOrigin = (origin && ALLOWED_ORIGINS.has(origin)) ? origin : 'https://careercase.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Usage-Type, X-Stream, X-Request-ID, X-Correlation-ID',
    'Access-Control-Expose-Headers': 'X-CareerCase-AI-Model, X-CareerCase-Key-Pool-Size, X-Request-ID, X-Correlation-ID, X-Operation-Duration-Ms',
    'Access-Control-Max-Age': '86400',
  };
}

async function hasValidSupabaseSession(request: Request, env: Env): Promise<boolean> {
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ') || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return false;
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: authorization,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function jsonResponse(
  data: unknown,
  status = 200,
  origin: string | null = null,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      ...cors(origin), ...extraHeaders,
    },
  });
}

const groqKeyPool = new KeyPool();

// Process-local telemetry is intentionally limited to counters and route
// metadata. It never contains request bodies, credentials, provider payloads,
// or user identifiers. Durable job metrics remain in the outbox tables.
const workerMetrics = { requests: 0, failures: 0 };

function withObservability(
  response: Response,
  requestId: string,
  correlationId: string,
  startedAt: number,
  route: string,
  method: string,
): Response {
  const durationMs = Math.max(0, Date.now() - startedAt);
  workerMetrics.requests += 1;
  if (response.status >= 500) workerMetrics.failures += 1;
  const headers = new Headers(response.headers);
  headers.set('X-Request-ID', requestId);
  headers.set('X-Correlation-ID', correlationId);
  headers.set('X-Operation-Duration-Ms', String(durationMs));
  console.log(JSON.stringify({
    event: 'request.completed',
    requestId,
    correlationId,
    method,
    route,
    status: response.status,
    durationMs,
    requestCount: workerMetrics.requests,
    failureCount: workerMetrics.failures,
    ...(response.status >= 400 ? { errorCode: `HTTP_${response.status}` } : {}),
  }));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Groq (like OpenAI) rejects response_format: json_object with HTTP 400
// unless at least one message contains the word "json". Prose callers such
// as the grounded counselor set json_object without a JSON instruction, so
// we defensively drop it here to keep those requests valid. JSON-producing
// callers instruct JSON in their prompts and are therefore untouched.
function sanitizeResponseFormat(payload: Record<string, unknown>): void {
  const rf = payload['response_format'] as { type?: string } | undefined;
  if (!rf || rf.type !== 'json_object') return;
  const messages = Array.isArray(payload['messages']) ? (payload['messages'] as Array<{ content?: unknown }>) : [];
  const mentionsJson = messages.some(
    (m) => typeof m?.content === 'string' && m.content.toLowerCase().includes('json'),
  );
  if (!mentionsJson) delete payload['response_format'];
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
  // GPT-OSS defaults to medium reasoning, which can consume a small caller's
  // entire completion budget before any user-visible content is emitted.
  // CareerCase requests already supply grounded evidence and need concise UI
  // answers, so low + hidden preserves reasoning without leaking or starving it.
  payload['reasoning_effort'] ??= 'low';
  payload['reasoning_format'] ??= 'hidden';
  sanitizeResponseFormat(payload);

  const requestGroq = () => executeWithKeyRotation(keys, groqKeyPool, key => fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  }));

  let groqResp: Response | null;
  try {
    groqResp = await requestGroq();
    if (groqResp?.status === 400 && payload['response_format']) {
      const errorPayload = await groqResp.clone().json().catch(() => null);
      if (shouldRetryWithoutJsonMode(groqResp.status, true, errorPayload)) {
        // GPT-OSS can occasionally fail Groq's strict JSON validator even when
        // the prompt itself requests JSON. Retry once in prompt-guided JSON
        // mode; callers still parse and validate the returned structure.
        delete payload['response_format'];
        groqResp = await requestGroq();
      }
    }
  } catch {
    return jsonResponse({ error: 'Unable to reach the AI service' }, 502, origin);
  }

  if (!groqResp) {
    return jsonResponse(
      { error: 'All AI servers are busy right now. Please wait a moment and try again.' },
      503,
      origin,
    );
  }

  if (!groqResp.ok) {
    const err = await groqResp.json().catch(() => ({})) as { error?: { message?: string } };
    return jsonResponse(
      { error: err?.error?.message ?? `Groq error ${groqResp.status}` },
      groqResp.status,
      origin,
    );
  }

  const operationalHeaders = {
    'X-CareerCase-AI-Model': MODELS[modelTier],
    'X-CareerCase-Key-Pool-Size': String(keys.length),
  };

  if (isStream) {
    return new Response(groqResp.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...cors(origin),
        ...operationalHeaders,
      },
    });
  }

  const data = await groqResp.json();
  return jsonResponse(data, 200, origin, operationalHeaders);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const requestId = request.headers.get('X-Request-ID')?.slice(0, 120) || crypto.randomUUID();
    const correlationId = request.headers.get('X-Correlation-ID')?.slice(0, 120) || requestId;
    const finish = (response: Response) => withObservability(
      response, requestId, correlationId, startedAt, url.pathname, request.method,
    );

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return finish(jsonResponse({ error: 'Origin not allowed' }, 403, origin));
    }

    if (request.method === 'OPTIONS') {
      return finish(new Response(null, { status: 204, headers: { ...cors(origin) } }));
    }

    if (url.pathname === '/healthz' && request.method === 'GET') {
      return finish(jsonResponse({ ok: true, service: 'careercase-worker', environment: env.ENVIRONMENT ?? 'unknown' }, 200, origin));
    }

    if (url.pathname === '/sih' || url.pathname.startsWith('/sih/')) {
      return finish(await handleSihRequest(request, env, (data, status = 200) => jsonResponse(data, status, origin)));
    }

    if (url.pathname !== '/ai' || request.method !== 'POST') {
      return finish(jsonResponse({ error: 'Not found' }, 404, origin));
    }

    if (!await hasValidSupabaseSession(request, env)) {
      return finish(jsonResponse({ error: 'Sign in is required to use AI features' }, 401, origin));
    }

    let body: unknown;
    const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
    if (declaredLength > 65_536) return finish(jsonResponse({ error: 'Request body exceeds the 64 KiB limit.' }, 413, origin));
    try {
      body = await request.json();
    } catch {
      return finish(jsonResponse({ error: 'Invalid JSON body' }, 400, origin));
    }

    const usageType = request.headers.get('X-Usage-Type') ?? 'unknown';
    const isStream = request.headers.get('X-Stream') === '1';
    const modelTier = (USAGE_MODEL_TIER[usageType] ?? 'premium') as 'premium' | 'standard';

    const keys = [...new Set(env.GROQ_API_KEYS.split(',').map(k => k.trim()).filter(k => k.startsWith('gsk_')))];
    if (!keys.length) {
      return finish(jsonResponse({ error: 'Server misconfigured — no API keys' }, 500, origin));
    }

    return finish(await proxyToGroq(body, modelTier, keys, isStream, origin));
  },
};
