import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';

import { complete, parseJson, estimateCost, listModels } from './lib/openai.js';
import { SYSTEM_PROMPT, buildUserPrompt, buildRevisePrompt } from './lib/prompt.js';
import { normaliseDoc, migratePaper, referencedAssets,
         QUESTION_TYPES, BLOCK_TYPES } from './lib/doc.js';
import { THEMES, themeTokens, themeList, BORDER_STYLES } from './lib/themes.js';
import { templateList, templateDoc } from './lib/templates.js';
import * as library from './lib/assets.js';
import { chat, image, createImage, editImage, imageCost, parseIntent }
  from './lib/chat.js';
import * as usage from './lib/usage.js';

const app = express();
const PORT = process.env.PORT || 5174;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 6 },
});

const toDataUrl = (f) =>
  `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;

app.get('/api/health', async (_req, res) => {
  res.json({
    ok: true,
    model: process.env.OPENAI_MODEL || 'gpt-6-luna',
    hasKey: Boolean(process.env.OPENAI_API_KEY),
    questionTypes: QUESTION_TYPES,
    blockTypes: BLOCK_TYPES,
    borderStyles: BORDER_STYLES,
  });
});

app.get('/api/models', async (_req, res) => {
  try {
    res.json({ models: await listModels() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/generate
 * multipart: images[] (optional), settings (JSON string), idea, syllabus
 */
app.post('/api/generate', upload.array('images', 6), async (req, res) => {
  const started = Date.now();
  try {
    const settings = req.body.settings ? JSON.parse(req.body.settings) : {};
    const idea = req.body.idea || '';
    const syllabus = req.body.syllabus || '';
    const files = req.files || [];

    if (!files.length && !idea.trim()) {
      return res.status(400).json({
        error: 'Give me either a photo of the handwritten paper, or a description.',
      });
    }

    const mode = files.length ? 'image' : 'idea';
    const kind = req.body.kind === 'syllabus' ? 'syllabus' : 'exam';
    const user = buildUserPrompt({ mode, settings, idea, syllabus, kind });

    const { text, usage: tokens, model } = await complete({
      system: SYSTEM_PROMPT,
      user,
      images: files.map(toDataUrl),
      model: settings.model,
    });

    const doc = normaliseDoc(parseJson(text));
    if (settings.theme) doc.theme = settings.theme;
    if (settings.template) doc.template = settings.template;

    // Fill header fields the teacher typed but the model left blank.
    for (const [k, v] of Object.entries({
      school: settings.school,
      class: settings.class,
      subject: settings.subject,
      title: settings.term,
      duration: settings.duration,
    })) {
      if (v && !doc.meta[k]) doc.meta[k] = v;
    }
    if (settings.totalMarks && !doc.meta.totalMarks) {
      doc.meta.totalMarks = Number(settings.totalMarks);
    }

    const assets = library.resolveMany(referencedAssets(doc));

    const cost = estimateCost(model, tokens);
    const blockCount = doc.pages.reduce((n, p) => n + p.blocks.length, 0);
    usage.record({ route: 'generate', model, usage: tokens, usd: cost.usd,
                   note: `${mode} · ${kind} · ${blockCount} blocks` });

    res.json({
      doc,
      assets,
      meta: {
        model,
        mode,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        ...cost,
      },
    });
  } catch (err) {
    console.error('[generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/revise  { paper, instruction }
 * Teacher asks for a change in plain words; model edits the spec.
 */
app.post('/api/revise', async (req, res) => {
  const started = Date.now();
  try {
    const { doc: incoming, paper, instruction } = req.body || {};
    const source = incoming || paper;
    if (!source || !instruction) {
      return res.status(400).json({ error: 'Need both a document and an instruction.' });
    }

    const user = buildRevisePrompt(migratePaper(source), instruction);

    const { text, usage: tokens, model } = await complete({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: 8000,
    });

    const cost = estimateCost(model, tokens);
    usage.record({ route: 'revise', model, usage: tokens, usd: cost.usd,
                   note: instruction.slice(0, 60) });

    const revised = normaliseDoc(parseJson(text));
    res.json({
      doc: revised,
      assets: library.resolveMany(referencedAssets(revised)),
      meta: {
        model,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        ...cost,
      },
    });
  } catch (err) {
    console.error('[revise]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------------------------------------- chat mode */

/**
 * POST /api/chat
 *   multipart: messages (JSON, each {role, content, images?[]}), images[] files
 *
 * One turn of the assistant. The model may answer in words or call a tool to
 * draw or edit a picture; either way the response shape is the same, so the
 * client does not have to know which happened.
 */
app.post('/api/chat', upload.array('images', 4), async (req, res) => {
  const started = Date.now();
  try {
    const history = JSON.parse(req.body.messages || '[]');
    if (!Array.isArray(history) || !history.length) {
      return res.status(400).json({ error: 'No messages sent.' });
    }

    // Newly attached files belong to the newest user turn.
    const attached = (req.files || []).map(toDataUrl);
    const messages = history.map((m, i) =>
      i === history.length - 1 && attached.length
        ? { ...m, images: [...(m.images || []), ...attached] }
        : m);

    const first = await chat({ messages });
    const intent = parseIntent(first.text);
    let text = intent.text;
    let picture = null;
    let spent = estimateCost(first.model, first.usage);

    usage.record({ route: 'chat', model: first.model, usage: first.usage,
                   usd: spent.usd,
                   note: String(messages.at(-1)?.content || '').slice(0, 60) });

    if (intent.kind !== 'text') {
      if (intent.kind === 'draw') {
        const out = await createImage({ prompt: intent.prompt });
        picture = out.url;
        const usd = imageCost(out.usage);
        usage.record({ route: 'image', model: out.model, usage: out.usage, usd,
                       note: intent.prompt.slice(0, 60) });
        spent = { ...spent, usd: (spent.usd || 0) + (usd || 0) };
        text = text || 'Here it is.';

      } else {
        // The newest picture in the conversation is what gets edited: the one
        // just attached, or the last one drawn.
        const source = [...messages].reverse()
          .flatMap((m) => m.images || []).find(Boolean);
        if (!source) {
          text = 'I need a picture first — attach one, or ask me to draw something.';
        } else {
          const out = await editImage({ dataUrl: source, instruction: intent.prompt });
          picture = out.url;
          const usd = imageCost(out.usage);
          usage.record({ route: 'image', model: out.model, usage: out.usage, usd,
                         note: `edit: ${intent.prompt.slice(0, 50)}` });
          spent = { ...spent, usd: (spent.usd || 0) + (usd || 0) };
          text = text || 'Done.';
        }
      }
    }

    res.json({
      reply: text,
      image: picture,
      attached,           // echoed so the client can show what it sent
      meta: {
        model: first.model,
        dropped: first.dropped,
        tool: intent.kind === 'text' ? null : intent.kind,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        ...spent,
      },
    });
  } catch (err) {
    console.error('[chat]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/image  { prompt, size, quality } */
app.post('/api/image', async (req, res) => {
  const started = Date.now();
  try {
    const { prompt, size, quality } = req.body || {};
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Describe the picture you want.' });
    }

    const styled =
      `${prompt.trim()}\n\nStyle: a simple, friendly, brightly coloured ` +
      `children's worksheet illustration. Bold clean outlines, flat colours, ` +
      `plain white background, no text or lettering anywhere in the image.`;

    const out = await image({ prompt: styled, size, quality });
    const usd = imageCost(out.usage);
    usage.record({ route: 'image', model: out.model, usage: out.usage, usd,
                   note: prompt.slice(0, 60) });

    res.json({
      url: out.url,
      meta: {
        model: out.model,
        usd,
        seconds: Math.round((Date.now() - started) / 100) / 10,
      },
    });
  } catch (err) {
    console.error('[image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------- themes, templates, assets */

app.get('/api/themes', (_req, res) => {
  const tokens = {};
  for (const id of Object.keys(THEMES)) tokens[id] = themeTokens(id);
  res.json({ list: themeList(), tokens, borders: BORDER_STYLES });
});

app.get('/api/templates', (_req, res) => {
  res.json({ list: templateList() });
});

app.get('/api/templates/:id', (req, res) => {
  const doc = templateDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'No such template.' });
  res.json({ doc: normaliseDoc(doc) });
});

app.get('/api/assets', (_req, res) => {
  res.json({ assets: library.listAssets() });
});

/** Artwork shipped with the app (the school's monogram). */
app.get('/api/assets/brand/:file', (req, res) => {
  const safe = path.basename(req.params.file);
  res.sendFile(path.join(library.BRAND_DIR, safe), (err) => {
    if (err) res.status(404).end();
  });
});

app.get('/api/assets/file/:file', (req, res) => {
  const safe = path.basename(req.params.file);
  res.sendFile(path.join(library.UPLOAD_DIR, safe), (err) => {
    if (err) res.status(404).end();
  });
});

/** Upload your own artwork from Figma, Canva, anywhere. */
app.post('/api/assets', upload.array('files', 40), (req, res) => {
  try {
    const group = req.body.group || 'custom';
    const added = (req.files || []).map((f) =>
      library.addAsset({
        group,
        label: (f.originalname || 'icon').replace(/\.[^.]+$/, ''),
        buffer: f.buffer,
        mime: f.mimetype,
      }));
    res.json({ added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assets/:id', (req, res) => {
  res.json({ ok: library.removeAsset(req.params.id) });
});

/** Generate a picture and keep it in the library under a slug. */
app.post('/api/assets/generate', async (req, res) => {
  try {
    const { prompt, group = 'ai', label } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Describe the picture.' });

    const styled = `${prompt}\n\nStyle: a simple, friendly, brightly coloured ` +
      `children's worksheet illustration. Bold clean outlines, flat colours, ` +
      `plain white background, no text or lettering anywhere in the image.`;

    const out = await image({ prompt: styled, size: '1024x1024', quality: 'low' });
    const b64 = String(out.url).split(',')[1];
    const asset = library.addAsset({
      group,
      label: label || prompt.slice(0, 40),
      buffer: Buffer.from(b64, 'base64'),
      mime: 'image/png',
      kind: 'ai',
    });

    const usd = imageCost(out.usage);
    usage.record({ route: 'image', model: out.model, usage: out.usage, usd,
                   note: prompt.slice(0, 60) });
    res.json({ asset: { ...asset, url: `/api/assets/file/${asset.file}` }, usd });
  } catch (err) {
    console.error('[asset-gen]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/assets/fill  { prompts: ["a cartoon brain", ...] }
 *
 * Draws every picture the document is missing and returns a prompt -> assetId
 * map the client can patch straight in. Identical prompts are drawn once, and
 * anything already drawn for that prompt is reused for free.
 */
app.post('/api/assets/fill', async (req, res) => {
  const prompts = [...new Set(
    (req.body?.prompts || []).map((s) => String(s || '').trim()).filter(Boolean)
  )].slice(0, 30);

  if (!prompts.length) return res.json({ map: {}, drawn: 0, reused: 0, usd: 0 });

  const map = {};
  const failed = {};
  let drawn = 0;
  let reused = 0;
  let spent = 0;

  for (const prompt of prompts) {
    const cached = library.findByPrompt(prompt);
    if (cached) {
      map[prompt] = cached.id;
      reused += 1;
      continue;
    }
    try {
      const styled = `${prompt}\n\nStyle: a simple, friendly, brightly coloured ` +
        `children's worksheet illustration. Bold clean outlines, flat colours, ` +
        `plain white background, no text or lettering anywhere in the image.`;
      const out = await image({ prompt: styled, size: '1024x1024', quality: 'low' });
      const b64 = String(out.url).split(',')[1];
      const asset = library.addAsset({
        group: 'ai', label: prompt.slice(0, 40), prompt,
        buffer: Buffer.from(b64, 'base64'), mime: 'image/png', kind: 'ai',
      });
      map[prompt] = asset.id;
      drawn += 1;
      const usd = imageCost(out.usage);
      spent += usd || 0;
      usage.record({ route: 'image', model: out.model, usage: out.usage, usd,
                     note: prompt.slice(0, 60) });
    } catch (err) {
      // One bad prompt must not lose the pictures already drawn.
      console.error('[fill]', prompt, err.message);
      failed[prompt] = err.message;
    }
  }

  res.json({
    map, drawn, reused,
    usd: Math.round(spent * 100000) / 100000,
    failed,
    assets: library.resolveMany(Object.values(map)),
  });
});

/* ------------------------------------------------------------------ usage */

app.get('/api/usage', (_req, res) => {
  res.json({ summary: usage.summary(), entries: usage.entries(50) });
});

app.delete('/api/usage', (_req, res) => {
  usage.reset();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  const model = process.env.OPENAI_MODEL || 'gpt-6-luna';
  console.log(`\n  Paper Studio API  ->  http://localhost:${PORT}`);
  console.log(`  model: ${model}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('  !! OPENAI_API_KEY missing -- copy server/.env.example to server/.env\n');
  } else {
    console.log('  key loaded\n');
  }
});
