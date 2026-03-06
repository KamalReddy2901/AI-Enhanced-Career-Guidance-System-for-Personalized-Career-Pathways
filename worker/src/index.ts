import {
  MODELS,
  USAGE_MODEL_TIER,
  QUOTA_COLUMN,
  FREE_DAILY_LIMITS,
  PRO_DAILY_LIMITS,
} from './models';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface Env {
  GROQ_API_KEYS: string;          // comma-separated Groq API keys
  SUPABASE_URL: string;           // https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY: string;   // service_role key (bypasses RLS)
  ENVIRONMENT?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function cors(origin: string | null) {
  const allowed = ['https://career-sim.pages.dev', 'https://careercasehq.pages.dev', 'http://localhost:5173', 'http://localhost:5174'];
  const allowOrigin = (origin && allowed.includes(origin)) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Usage-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

// Parse and verify a Supabase JWT (lightweight — just base64 decode the payload)
function parseSupabaseJwt(token: string): { sub: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.sub || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null; // expired
    return { sub: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

// Supabase REST helper (uses service key to bypass RLS)
async function supabaseRequest(
  env: Env,
  path: string,
  method: string,
  body?: unknown,
  userJwt?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };
  if (userJwt) headers['Authorization'] = `Bearer ${userJwt}`;
  return fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Key rotation (same logic as frontend, but on the server)
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

function rotateKey(keys: string[], usedKey: string): void {
  exhaustedKeys.set(usedKey, Date.now());
}

// ─── Usage check + increment ───────────────────────────────────

async function getUserPlan(env: Env, userId: string): Promise<string> {
  const resp = await supabaseRequest(
    env,
    `/user_profiles?user_id=eq.${userId}&select=plan,plan_expires_at`,
    'GET',
  );
  if (!resp.ok) return 'free';
  const rows = await resp.json() as Array<{ plan: string; plan_expires_at: string | null }>;
  if (!rows.length) return 'free';
  const { plan, plan_expires_at } = rows[0];
  if (plan === 'pro' && plan_expires_at && new Date(plan_expires_at) < new Date()) return 'free';
  return plan;
}

async function checkAndIncrementUsage(
  env: Env,
  userId: string,
  quotaColumn: string,
): Promise<{ allowed: boolean; used: number; limit: number; plan: string }> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const plan = await getUserPlan(env, userId);
  const limits = plan === 'pro' ? PRO_DAILY_LIMITS : FREE_DAILY_LIMITS;
  const limit = limits[quotaColumn] ?? 999;

  // Upsert today's usage row (insert if not exists, ignore conflict)
  await supabaseRequest(env, '/user_usage?on_conflict=user_id,date', 'POST', {
    user_id: userId,
    date: today,
    [quotaColumn]: 0,
  });

  // Fetch current usage
  const fetchResp = await supabaseRequest(
    env,
    `/user_usage?user_id=eq.${userId}&date=eq.${today}&select=${quotaColumn}`,
    'GET',
  );

  let used = 0;
  if (fetchResp.ok) {
    const rows = await fetchResp.json() as Array<Record<string, number>>;
    if (rows.length) used = rows[0][quotaColumn] ?? 0;
  }

  if (used >= limit) {
    return { allowed: false, used, limit, plan };
  }

  // Increment
  await supabaseRequest(
    env,
    `/user_usage?user_id=eq.${userId}&date=eq.${today}`,
    'PATCH',
    { [quotaColumn]: used + 1 },
  );

  return { allowed: true, used: used + 1, limit, plan };
}

// ─── Groq proxy ────────────────────────────────────────────────

async function proxyToGroq(
  body: unknown,
  modelTier: 'premium' | 'standard',
  keys: string[],
  isStream: boolean,
  origin: string | null,
): Promise<Response> {
  const payload = body as Record<string, unknown>;

  // Override the model with our configured one
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
      rotateKey(keys, key);
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
      // Stream the response back directly
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

// ─── Main fetch handler ────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // Only handle POST /ai
    const url = new URL(request.url);
    if (url.pathname !== '/ai' || request.method !== 'POST') {
      return jsonResponse({ error: 'Not found' }, 404, origin);
    }

    // Parse JWT
    const authHeader = request.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const jwtPayload = jwt ? parseSupabaseJwt(jwt) : null;

    const usageType = request.headers.get('X-Usage-Type') ?? 'unknown';
    const quotaColumn = QUOTA_COLUMN[usageType] ?? null;
    const isStream = request.headers.get('X-Stream') === '1';

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    // If this type is metered, we require auth and check quota
    if (quotaColumn) {
      if (!jwtPayload) {
        return jsonResponse({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, 401, origin);
      }

      const { allowed, used, limit, plan } = await checkAndIncrementUsage(
        env,
        jwtPayload.sub,
        quotaColumn,
      );

      if (!allowed) {
        return jsonResponse(
          {
            error: 'Daily limit reached',
            code: 'QUOTA_EXCEEDED',
            detail: { used, limit, plan, quotaColumn },
          },
          402,
          origin,
        );
      }
    }

    // Pick model tier
    const modelTier = (USAGE_MODEL_TIER[usageType] ?? 'premium') as 'premium' | 'standard';

    // Parse Groq keys
    const keys = env.GROQ_API_KEYS.split(',').map(k => k.trim()).filter(k => k.startsWith('gsk_'));
    if (!keys.length) {
      return jsonResponse({ error: 'Server misconfigured — no API keys' }, 500, origin);
    }

    return proxyToGroq(body, modelTier, keys, isStream, origin);
  },
};

