// Thin OpenAI client. Kept deliberately small: one chat call, JSON out,
// plus a helpful error when the model id is wrong.

const BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Per-1M-token prices, USD. Override in .env if your rates differ.
const PRICING = {
  'gpt-6-luna': { in: 0.1, out: 0.5 },
  'gpt-5.6-luna': { in: 0.1, out: 0.5 },
  'gpt-6.1-sol': { in: 2.0, out: 10.0 },
};

function key() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY is not set. Put it in server/.env');
  return k;
}

/** Ask the API which models this key can actually see. Used for 404 help. */
export async function listModels() {
  const res = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${key()}` },
  });
  if (!res.ok) return [];
  const body = await res.json();
  return (body.data || []).map((m) => m.id).sort();
}

export function estimateCost(model, usage = {}) {
  const p = PRICING[model];
  const inTok = usage.prompt_tokens || 0;
  const outTok = usage.completion_tokens || 0;
  if (!p) return { inTok, outTok, usd: null };
  return {
    inTok,
    outTok,
    usd: (inTok * p.in + outTok * p.out) / 1e6,
  };
}

/**
 * One vision+text call. `images` are data URLs.
 * Returns { text, usage, model }.
 */
export async function complete({ system, user, images = [], model, maxTokens = 8000 }) {
  const chosen = model || process.env.OPENAI_MODEL || 'gpt-6-luna';

  const content = [{ type: 'text', text: user }];
  for (const url of images) {
    content.push({ type: 'image_url', image_url: { url, detail: 'high' } });
  }

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: chosen,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
      max_completion_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (res.status === 404) {
    const available = await listModels();
    const near = available.filter((m) => /luna|gpt-6|gpt-5/.test(m)).slice(0, 15);
    throw new Error(
      `Model "${chosen}" not found for your key. ` +
      (near.length
        ? `Try one of: ${near.join(', ')}. Set OPENAI_MODEL in server/.env.`
        : 'Your key sees no matching models -- check the OpenAI dashboard.')
    );
  }

  if (res.status === 429) {
    throw new Error(
      'Rate limited or out of credit. Check your usage tier in the OpenAI dashboard.'
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 400)}`);
  }

  const body = await res.json();
  const text = body.choices?.[0]?.message?.content || '';
  return { text, usage: body.usage || {}, model: chosen };
}

/** Models wrap JSON in fences often enough that this is worth having. */
export function parseJson(text) {
  let t = (text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`Model did not return JSON. Got: ${t.slice(0, 300)}`);
  }
  return JSON.parse(t.slice(start, end + 1));
}
