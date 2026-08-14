import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const VARIABLE_NAMES = ['GROQ_API_KEYS', 'VITE_GROQ_API_KEYS', 'GROQ_API_KEY'];
const TARGET_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
const API_URL = 'https://api.groq.com/openai/v1';

function configuredKeys() {
  const values = VARIABLE_NAMES.map(name => process.env[name] ?? '');
  const directories = [process.cwd(), path.resolve(process.cwd(), '..')];

  for (const directory of directories) {
    for (const filename of ['.env.local', '.env']) {
      const filepath = path.join(directory, filename);
      if (!fs.existsSync(filepath)) continue;
      const text = fs.readFileSync(filepath, 'utf8');
      for (const name of VARIABLE_NAMES) {
        const match = text.match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\\r\\n]+)`, 'm'));
        if (match) values.push(match[1]);
      }
    }
  }

  return [...new Set(values
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(value => value.startsWith('gsk_')))];
}

function fingerprint(key) {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
}

async function testJson(key) {
  const response = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: TARGET_MODELS[0],
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user', content: 'Return JSON with the key status and the value ok.' },
      ],
      temperature: 0,
      max_tokens: 64,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content ?? '';
  let parseable = false;
  try { JSON.parse(content); parseable = true; } catch { /* reported below */ }
  return { status: response.status, parseable };
}

async function testStream(key) {
  const response = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: TARGET_MODELS[1],
      messages: [{ role: 'user', content: 'Reply with exactly: key operational' }],
      temperature: 0,
      max_tokens: 192,
      stream: true,
    }),
  });
  const body = await response.text();
  let jsonEvents = 0;
  let contentEvents = 0;
  for (const line of body.split(/\r?\n/).filter(line => line.startsWith('data: '))) {
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') continue;
    try {
      const delta = JSON.parse(payload)?.choices?.[0]?.delta;
      jsonEvents++;
      if (delta?.content) contentEvents++;
    } catch { /* counted as an invalid event */ }
  }
  return {
    status: response.status,
    sse: response.headers.get('content-type')?.includes('text/event-stream') ?? false,
    jsonEvents,
    contentEvents,
    done: body.includes('data: [DONE]'),
  };
}

const keys = configuredKeys();
if (!keys.length) {
  console.error(JSON.stringify({ configuredKeys: 0, error: 'No local Groq credentials found' }));
  process.exit(1);
}

const results = [];
for (const key of keys) {
  const modelsResponse = await fetch(`${API_URL}/models`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const modelsData = await modelsResponse.json().catch(() => null);
  const modelIds = Array.isArray(modelsData?.data) ? modelsData.data.map(model => model.id) : [];
  results.push({
    fingerprint: fingerprint(key),
    authStatus: modelsResponse.status,
    models: Object.fromEntries(TARGET_MODELS.map(model => [model, modelIds.includes(model)])),
    json20b: await testJson(key),
    stream120b: await testStream(key),
  });
}

const ok = results.every(result =>
  result.authStatus === 200
  && Object.values(result.models).every(Boolean)
  && result.json20b.status === 200
  && result.json20b.parseable
  && result.stream120b.status === 200
  && result.stream120b.sse
  && result.stream120b.jsonEvents > 0
  && result.stream120b.contentEvents > 0
  && result.stream120b.done
);

console.log(JSON.stringify({ configuredKeys: keys.length, ok, results }, null, 2));
if (!ok) process.exit(1);
