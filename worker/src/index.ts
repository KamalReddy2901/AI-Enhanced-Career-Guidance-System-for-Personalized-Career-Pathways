import {
  MODELS,
  USAGE_MODEL_TIER,
  CREDIT_COSTS,
  FREE_STARTING_CREDITS,
  PRO_DAILY_CREDITS,
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
  const allowed = ['https://career-sim.pages.dev', 'https://careercasehq.pages.dev', 'https://careercase.pages.dev', 'https://careercase.kamrede.page', 'http://localhost:5173', 'http://localhost:5174'];
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

// ─── Credit check + deduction ──────────────────────────────────

interface UserProfile {
  plan: string;
  credits_remaining: number;
  pro_daily_used: number;
  pro_daily_reset: string | null; // YYYY-MM-DD
}

async function getUserProfile(env: Env, userId: string): Promise<UserProfile> {
  const resp = await supabaseRequest(
    env,
    `/user_profiles?user_id=eq.${userId}&select=plan,plan_expires_at,credits_remaining,pro_daily_used,pro_daily_reset`,
    'GET',
  );
  const defaultProfile: UserProfile = { plan: 'free', credits_remaining: FREE_STARTING_CREDITS, pro_daily_used: 0, pro_daily_reset: null };
  if (!resp.ok) {
    await supabaseRequest(env, '/user_profiles', 'POST', {
      user_id: userId, plan: 'free', credits_remaining: FREE_STARTING_CREDITS, pro_daily_used: 0,
    });
    return defaultProfile;
  }
  const rows = await resp.json() as Array<{ plan: string; plan_expires_at: string | null; credits_remaining: number | null; pro_daily_used: number | null; pro_daily_reset: string | null }>;  if (!rows.length) {
    await supabaseRequest(env, '/user_profiles', 'POST', {
      user_id: userId, plan: 'free', credits_remaining: FREE_STARTING_CREDITS, pro_daily_used: 0,
    });
    return defaultProfile;
  }
  const { plan, plan_expires_at, credits_remaining, pro_daily_used, pro_daily_reset } = rows[0];
  const activePlan = (plan === 'pro' && plan_expires_at && new Date(plan_expires_at) < new Date()) ? 'free' : plan;
  return {
    plan: activePlan,
    credits_remaining: credits_remaining ?? 0,
    pro_daily_used: pro_daily_used ?? 0,
    pro_daily_reset: pro_daily_reset ?? null,
  };
}

async function checkAndDeductCredits(
  env: Env,
  userId: string,
  usageType: string,
): Promise<{ allowed: boolean; creditsRemaining: number; creditCost: number; plan: string; dailyLimitHit?: boolean }> {
  const creditCost = CREDIT_COSTS[usageType] ?? 0;

  // Free usage types — always allow, no deduction
  if (creditCost === 0) {
    return { allowed: true, creditsRemaining: 0, creditCost: 0, plan: 'free' };
  }

  const profile = await getUserProfile(env, userId);

  // Pro users: daily allowance (resets at midnight UTC)
  if (profile.plan === 'pro') {
    const today = new Date().toISOString().split('T')[0];
    let dailyUsed = profile.pro_daily_used;
    if (profile.pro_daily_reset !== today) {
      dailyUsed = 0;
      await supabaseRequest(env, `/user_profiles?user_id=eq.${userId}`, 'PATCH',
        { pro_daily_used: 0, pro_daily_reset: today });
    }
    if (dailyUsed + creditCost > PRO_DAILY_CREDITS) {
      return { allowed: false, creditsRemaining: PRO_DAILY_CREDITS - dailyUsed, creditCost, plan: 'pro', dailyLimitHit: true };
    }
    await supabaseRequest(env, `/user_profiles?user_id=eq.${userId}`, 'PATCH',
      { pro_daily_used: dailyUsed + creditCost });
    return { allowed: true, creditsRemaining: PRO_DAILY_CREDITS - dailyUsed - creditCost, creditCost, plan: 'pro' };
  }

  // Free users: check credit balance
  if (profile.credits_remaining < creditCost) {
    return { allowed: false, creditsRemaining: profile.credits_remaining, creditCost, plan: profile.plan };
  }

  const newBalance = profile.credits_remaining - creditCost;
  await supabaseRequest(env, `/user_profiles?user_id=eq.${userId}`, 'PATCH',
    { credits_remaining: newBalance });

  return { allowed: true, creditsRemaining: newBalance, creditCost, plan: profile.plan };
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
    const creditCost = CREDIT_COSTS[usageType] ?? 0;
    const isStream = request.headers.get('X-Stream') === '1';

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    // If this type costs credits, we require auth and check balance
    if (creditCost > 0) {
      if (!jwtPayload) {
        return jsonResponse({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, 401, origin);
      }

      const { allowed, creditsRemaining, creditCost: cost, plan, dailyLimitHit } = await checkAndDeductCredits(
        env,
        jwtPayload.sub,
        usageType,
      );

      if (!allowed) {
        return jsonResponse(
          {
            error: dailyLimitHit ? 'Daily Pro credit limit reached' : 'Insufficient credits',
            code: 'INSUFFICIENT_CREDITS',
            detail: { creditsRemaining, creditCost: cost, plan, dailyLimitHit: dailyLimitHit ?? false },
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

