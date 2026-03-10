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
  RAZORPAY_KEY_SECRET: string;    // Razorpay key secret (server-side only)
  RAZORPAY_WEBHOOK_SECRET: string; // Razorpay webhook secret
  ENVIRONMENT?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

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

const UNLIMITED_DAILY_CAP = 50; // Max Ask AI questions per day during unlimited perk period

interface UserProfile {
  credits_remaining: number;
  ask_ai_unlimited_until: string | null; // ISO timestamp or null
  ask_ai_daily_used: number;
  ask_ai_daily_reset: string | null;     // YYYY-MM-DD
}

async function getUserProfile(env: Env, userId: string): Promise<UserProfile> {
  const resp = await supabaseRequest(
    env,
    `/user_profiles?user_id=eq.${userId}&select=credits_remaining,ask_ai_unlimited_until,ask_ai_daily_used,ask_ai_daily_reset`,
    'GET',
  );

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Supabase GET user_profiles failed (${resp.status}): ${errBody}`);
  }

  const rows = await resp.json() as Array<{
    credits_remaining: number | null;
    ask_ai_unlimited_until: string | null;
    ask_ai_daily_used: number | null;
    ask_ai_daily_reset: string | null;
  }>;

  if (!rows.length) {
    // New user — create their profile, then return the default.
    const createResp = await supabaseRequest(env, '/user_profiles', 'POST', {
      user_id: userId, plan: 'free', credits_remaining: FREE_STARTING_CREDITS, ask_ai_daily_used: 0,
    });
    if (!createResp.ok) {
      const errBody = await createResp.text().catch(() => '');
      throw new Error(`Supabase POST user_profiles failed (${createResp.status}): ${errBody}`);
    }
    return { credits_remaining: FREE_STARTING_CREDITS, ask_ai_unlimited_until: null, ask_ai_daily_used: 0, ask_ai_daily_reset: null };
  }

  const row = rows[0];
  return {
    credits_remaining: row.credits_remaining ?? 0,
    ask_ai_unlimited_until: row.ask_ai_unlimited_until ?? null,
    ask_ai_daily_used: row.ask_ai_daily_used ?? 0,
    ask_ai_daily_reset: row.ask_ai_daily_reset ?? null,
  };
}

async function checkAndDeductCredits(
  env: Env,
  userId: string,
  usageType: string,
): Promise<{ allowed: boolean; creditsRemaining: number; creditCost: number; plan: string; chatDailyCap?: boolean }> {
  const creditCost = CREDIT_COSTS[usageType] ?? 0;

  // Free usage types — always allow, no deduction
  if (creditCost === 0) {
    return { allowed: true, creditsRemaining: 0, creditCost: 0, plan: 'free' };
  }

  const profile = await getUserProfile(env, userId);

  // Special case: Ask AI during unlimited perk period
  if (usageType === 'chat' && profile.ask_ai_unlimited_until) {
    const unlimitedUntil = new Date(profile.ask_ai_unlimited_until);
    if (unlimitedUntil > new Date()) {
      const today = new Date().toISOString().split('T')[0];
      let dailyUsed = profile.ask_ai_daily_used;
      if (profile.ask_ai_daily_reset !== today) {
        dailyUsed = 0;
        await supabaseRequest(env, `/user_profiles?user_id=eq.${userId}`, 'PATCH',
          { ask_ai_daily_used: 0, ask_ai_daily_reset: today });
      }
      if (dailyUsed >= UNLIMITED_DAILY_CAP) {
        return { allowed: false, creditsRemaining: profile.credits_remaining, creditCost: 0, plan: 'free', chatDailyCap: true };
      }
      await supabaseRequest(env, `/user_profiles?user_id=eq.${userId}`, 'PATCH',
        { ask_ai_daily_used: dailyUsed + 1 });
      return { allowed: true, creditsRemaining: profile.credits_remaining, creditCost: 0, plan: 'free' };
    }
  }

  // Standard credit deduction for all users
  if (profile.credits_remaining < creditCost) {
    return { allowed: false, creditsRemaining: profile.credits_remaining, creditCost, plan: 'free' };
  }

  const newBalance = profile.credits_remaining - creditCost;
  await supabaseRequest(env, `/user_profiles?user_id=eq.${userId}`, 'PATCH',
    { credits_remaining: newBalance });

  return { allowed: true, creditsRemaining: newBalance, creditCost, plan: 'free' };
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

// ─── Razorpay helpers ─────────────────────────────────────────

const RAZORPAY_KEY_ID = 'rzp_live_SOpKaXXi0qi4VA';

const PACK_CONFIG: Record<string, { credits: number; amount: number; label: string; askAiDays: number }> = {
  pack_30:  { credits: 30,  amount: 5900,  label: '30 Credits',  askAiDays: 7 },
  pack_75:  { credits: 75,  amount: 12900, label: '75 Credits',  askAiDays: 15 },
  pack_120: { credits: 120, amount: 19900, label: '120 Credits', askAiDays: 30 },
};

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createRazorpayOrder(
  env: Env,
  amount: number,
  receipt: string,
  notes: Record<string, string>,
): Promise<{ id: string } | null> {
  const credentials = btoa(`${RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({ amount, currency: 'INR', receipt, notes }),
  });
  if (!resp.ok) return null;
  return resp.json() as Promise<{ id: string }>;
}

// ─── Payment route handlers ────────────────────────────────────

async function handleCreateOrder(
  request: Request,
  env: Env,
  origin: string | null,
  userId: string,
): Promise<Response> {
  const body = await request.json() as { type?: string; packId?: string };
  const { packId } = body;

  if (!packId || !PACK_CONFIG[packId]) {
    return jsonResponse({ error: 'Invalid pack' }, 400, origin);
  }

  const pack = PACK_CONFIG[packId];
  const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`;
  const order = await createRazorpayOrder(env, pack.amount, receipt, { user_id: userId, type: 'pack', pack_id: packId });
  if (!order) {
    return jsonResponse({ error: 'Failed to create payment order' }, 502, origin);
  }

  return jsonResponse({ orderId: order.id, amount: pack.amount, currency: 'INR', keyId: RAZORPAY_KEY_ID, label: pack.label }, 200, origin);
}

async function handleVerifyPayment(
  request: Request,
  env: Env,
  origin: string | null,
  userId: string,
): Promise<Response> {
  const body = await request.json() as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    type?: string;
    packId?: string;
  };
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packId } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return jsonResponse({ error: 'Missing payment fields' }, 400, origin);
  }

  // Verify HMAC signature
  const expectedSig = await hmacSha256(
    env.RAZORPAY_KEY_SECRET,
    `${razorpay_order_id}|${razorpay_payment_id}`,
  );
  if (expectedSig !== razorpay_signature) {
    return jsonResponse({ error: 'Payment verification failed', success: false }, 400, origin);
  }

  if (!packId || !PACK_CONFIG[packId]) {
    return jsonResponse({ error: 'Invalid pack' }, 400, origin);
  }

  const { credits, askAiDays } = PACK_CONFIG[packId];

  // Fetch current balance and Ask AI status
  const profileResp = await supabaseRequest(
    env, `/user_profiles?user_id=eq.${userId}&select=credits_remaining,ask_ai_unlimited_until`, 'GET',
  );
  if (profileResp.ok) {
    const rows = await profileResp.json() as Array<{ credits_remaining: number | null; ask_ai_unlimited_until: string | null }>;
    const current = rows[0]?.credits_remaining ?? 0;
    const currentUnlimited = rows[0]?.ask_ai_unlimited_until;

    // Extend Ask AI unlimited period (stack on top if already active)
    const now = Date.now();
    const existingExpiry = currentUnlimited ? new Date(currentUnlimited).getTime() : now;
    const newExpiry = new Date(Math.max(existingExpiry, now) + askAiDays * 24 * 60 * 60 * 1000).toISOString();

    await supabaseRequest(env, `/user_profiles?user_id=eq.${userId}`, 'PATCH', {
      credits_remaining: current + credits,
      ask_ai_unlimited_until: newExpiry,
      ask_ai_daily_used: 0,
      ask_ai_daily_reset: new Date().toISOString().split('T')[0],
    });
  }

  // Log payment
  await supabaseRequest(env, '/payments', 'POST', {
    user_id: userId,
    razorpay_order_id,
    razorpay_payment_id,
    amount: PACK_CONFIG[packId].amount,
    currency: 'INR',
    plan_type: 'pack',
    pack_id: packId,
    status: 'captured',
  });

  return jsonResponse({ success: true }, 200, origin);
}

async function handleWebhook(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('X-Razorpay-Signature') ?? '';

  const expectedSig = await hmacSha256(env.RAZORPAY_WEBHOOK_SECRET, rawBody);
  if (expectedSig !== signature) {
    return jsonResponse({ error: 'Invalid webhook signature' }, 400, origin);
  }

  // Webhook verified — log and acknowledge (DB is already updated by /payment/verify)
  return jsonResponse({ received: true }, 200, origin);
}

// ─── Main fetch handler ────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    const url = new URL(request.url);

    // ─── Payment routes ───────────────────────────────────────
    if (url.pathname === '/payment/webhook' && request.method === 'POST') {
      return handleWebhook(request, env, origin);
    }

    if (url.pathname === '/payment/create-order' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization') ?? '';
      const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const jwtPayload = jwt ? parseSupabaseJwt(jwt) : null;
      if (!jwtPayload) return jsonResponse({ error: 'Authentication required' }, 401, origin);
      return handleCreateOrder(request, env, origin, jwtPayload.sub);
    }

    if (url.pathname === '/payment/verify' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization') ?? '';
      const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const jwtPayload = jwt ? parseSupabaseJwt(jwt) : null;
      if (!jwtPayload) return jsonResponse({ error: 'Authentication required' }, 401, origin);
      return handleVerifyPayment(request, env, origin, jwtPayload.sub);
    }

    // ─── AI proxy (existing) ──────────────────────────────────
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

      try {
        const { allowed, creditsRemaining, creditCost: cost, plan, chatDailyCap } = await checkAndDeductCredits(
          env,
          jwtPayload.sub,
          usageType,
        );

        if (!allowed) {
          if (chatDailyCap) {
            return jsonResponse(
              { error: "The AI is very busy right now. You've reached today's Ask AI limit. Please try again tomorrow.", code: 'CHAT_DAILY_CAP' },
              429,
              origin,
            );
          }
          return jsonResponse(
            {
              error: 'Insufficient credits',
              code: 'INSUFFICIENT_CREDITS',
              detail: { creditsRemaining, creditCost: cost, plan },
            },
            402,
            origin,
          );
        }
      } catch (err) {
        // Supabase is unreachable or misconfigured — block the request, don't allow free usage
        const message = err instanceof Error ? err.message : 'Unknown error';
        return jsonResponse(
          { error: `Credit check failed: ${message}`, code: 'CREDIT_CHECK_ERROR' },
          503,
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

