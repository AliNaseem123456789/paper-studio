// The assistant: a general-purpose chat that can see images, make pictures
// and edit them. Nothing here touches the Papers side of the app.
//
// The model decides what to do through tool calls rather than the person
// flipping a mode switch, which is what makes it behave like an ordinary
// chat: attach a picture, say "make the background blue", and it edits.

const BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export const CHAT_SYSTEM = `You are a helpful assistant for the staff of
Al-Sehr Academy, a primary school in Karachi, Pakistan.

You are a general assistant, not limited to school work: answer whatever is
asked, as clearly and practically as you can. You work in English and Urdu and
reply in whichever the person used.

You can see any images the person attaches. Look at them properly and answer
about what is actually in them.

You can also make and change pictures. To do so, begin your reply with one of
these markers and nothing before it:

[DRAW] <full description of the picture to draw>
    Use this when the person wants a NEW picture.

[EDIT] <what to change, described as a complete picture>
    Use this when the person wants to change a picture already in the
    conversation -- the one they just attached, or the last one you made.
    "Make it blue", "remove the hat", "add a tree" are all [EDIT].

Rules for the markers:
- The marker must be the very first thing in your reply. No greeting before
  it, no markdown around it, nothing.
- Put only the picture description after the marker. Say nothing else.
- Never describe a picture in words instead of drawing it, and never tell the
  person to use some other button.
- For anything that is not a picture request, reply normally with no marker.

Keep written answers short and practical unless asked for detail.`;

/**
 * Read a [DRAW] or [EDIT] marker off the front of a reply.
 *
 * This does the job function tools would, without needing them: reasoning
 * models refuse tools on /v1/chat/completions unless reasoning is switched
 * off, and turning reasoning off for every message to enable a feature used
 * in a minority of them is a bad trade. A marker costs nothing and works on
 * any model.
 */
export function parseIntent(raw) {
  const text = String(raw || '').trim();
  // Tolerate the model wrapping the marker in bold or quotes, which it will
  // do occasionally however firmly the prompt says not to.
  const m = /^[*_"'\s]*\[\s*(draw|edit)\s*\][*_"'\s:-]*([\s\S]*)$/i.exec(text);
  if (!m) return { kind: 'text', text };

  const prompt = m[2].trim();
  if (!prompt) return { kind: 'text', text };
  return { kind: m[1].toLowerCase(), prompt, text: '' };
}

/** Rough token estimate -- 1 token ≈ 4 chars. Good enough for trimming. */
function approxTokens(messages) {
  return Math.ceil(
    messages.reduce((n, m) => {
      const text = typeof m.content === 'string'
        ? m.content
        : (m.content || []).map((c) => c.text || '').join('');
      // An image costs far more than its caption; count it roughly so a
      // conversation full of pictures still gets trimmed.
      const imgs = Array.isArray(m.content)
        ? m.content.filter((c) => c.type === 'image_url').length : 0;
      return n + text.length + imgs * 4000;
    }, 0) / 4
  );
}

/**
 * Keep the conversation under a token budget: always keep the most recent
 * turns, drop the oldest. Without this, every turn resends the whole history
 * and token use grows quadratically.
 */
export function trimHistory(messages, budget = 4000) {
  if (approxTokens(messages) <= budget) return { messages, dropped: 0 };

  const kept = [];
  let running = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const one = approxTokens([messages[i]]);
    if (running + one > budget && kept.length >= 2) break;
    kept.unshift(messages[i]);
    running += one;
  }
  return { messages: kept, dropped: messages.length - kept.length };
}

/**
 * Build the message list the API sees. Images stay attached to the turn they
 * belonged to, so a follow-up like "now make it blue" still has the picture
 * in view -- the previous version dropped them and the model was answering
 * blind.
 */
export function toApiMessages(messages, keepImagesFromLast = 3) {
  const firstWithImages = Math.max(0, messages.length - keepImagesFromLast);

  return messages.map((m, i) => {
    const imgs = (m.images || []).filter(Boolean);
    if (!imgs.length || i < firstWithImages) {
      return { role: m.role, content: String(m.content || '') };
    }
    return {
      role: m.role,
      content: [
        ...(m.content ? [{ type: 'text', text: String(m.content) }] : []),
        ...imgs.map((url) => ({ type: 'image_url', image_url: { url } })),
      ],
    };
  });
}

async function post(path, body, key) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function apiKey() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY is not set. Put it in server/.env');
  return k;
}

/** One chat turn. Returns the raw reply; the caller reads its intent. */
export async function chat({ messages, model, maxTokens = 1500 }) {
  const key = apiKey();
  const chosen = model || process.env.OPENAI_MODEL || 'gpt-6-luna';
  const { messages: trimmed, dropped } = trimHistory(messages);

  const out = await post('/chat/completions', {
    model: chosen,
    messages: [{ role: 'system', content: CHAT_SYSTEM }, ...toApiMessages(trimmed)],
    max_completion_tokens: maxTokens,
  }, key);

  const choice = out.choices?.[0]?.message || {};
  return {
    text: choice.content || '',
    usage: out.usage || {},
    model: chosen,
    dropped,
  };
}

const STYLE_SUFFIX = {
  worksheet:
    "\n\nStyle: a simple, friendly, brightly coloured children's worksheet " +
    'illustration. Bold clean outlines, flat colours, plain white background, ' +
    'no text or lettering anywhere in the image.',
  realistic: '\n\nStyle: a realistic, photographic image.',
  plain: '',
};

/** Draw something new. */
export async function createImage({ prompt, style = 'plain', size = '1024x1024',
                                    quality = 'low', model }) {
  const key = apiKey();
  const chosen = model || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const out = await post('/images/generations', {
    model: chosen,
    prompt: `${prompt}${STYLE_SUFFIX[style] ?? ''}`,
    size,
    quality,
    n: 1,
  }, key);

  const first = out.data?.[0];
  if (!first) throw new Error('No image returned.');
  return {
    url: first.b64_json ? `data:image/png;base64,${first.b64_json}` : first.url,
    usage: out.usage || {},
    model: chosen,
    revised: first.revised_prompt,
  };
}

/**
 * Change an existing picture. Uses the images/edits endpoint, which takes
 * multipart rather than JSON because the source image is a file upload.
 */
export async function editImage({ dataUrl, instruction, size = '1024x1024',
                                  quality = 'low', model }) {
  const key = apiKey();
  const chosen = model || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!m) throw new Error('No source picture to edit.');
  const [, mime, b64] = m;
  const bytes = Buffer.from(b64, 'base64');
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

  const form = new FormData();
  form.append('model', chosen);
  form.append('prompt', instruction);
  form.append('size', size);
  form.append('quality', quality);
  form.append('image', new Blob([bytes], { type: mime }), `source.${ext}`);

  const res = await fetch(`${BASE}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },   // no Content-Type: FormData sets it
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status} on image edit: ${text.slice(0, 300)}`);
  }

  const out = await res.json();
  const first = out.data?.[0];
  if (!first) throw new Error('No edited image returned.');
  return {
    url: first.b64_json ? `data:image/png;base64,${first.b64_json}` : first.url,
    usage: out.usage || {},
    model: chosen,
  };
}

/** Kept for the Papers side, which calls this name. */
export async function image(opts) {
  return createImage({ ...opts, style: 'plain' });
}

export function imageCost(usage = {}) {
  const inTok = usage.input_tokens || 0;
  const outTok = usage.output_tokens || 0;
  if (!inTok && !outTok) return null;
  return (inTok * 8.0 + outTok * 30.0) / 1e6;
}
