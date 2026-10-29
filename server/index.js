import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

import { complete, parseJson, estimateCost, listModels } from './lib/openai.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './lib/prompt.js';
import { normalisePaper, QUESTION_TYPES } from './lib/schema.js';

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
    types: QUESTION_TYPES,
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
    const user = buildUserPrompt({ mode, settings, idea, syllabus });

    const { text, usage, model } = await complete({
      system: SYSTEM_PROMPT,
      user,
      images: files.map(toDataUrl),
      model: settings.model,
    });

    const paper = normalisePaper(parseJson(text));

    // Fill header fields the teacher typed but the model left blank.
    for (const [k, v] of Object.entries({
      school: settings.school,
      class: settings.class,
      subject: settings.subject,
      title: settings.term,
      duration: settings.duration,
    })) {
      if (v && !paper[k]) paper[k] = v;
    }
    if (settings.totalMarks && !paper.totalMarks) {
      paper.totalMarks = Number(settings.totalMarks);
    }

    res.json({
      paper,
      meta: {
        model,
        mode,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        ...estimateCost(model, usage),
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
    const { paper, instruction } = req.body || {};
    if (!paper || !instruction) {
      return res.status(400).json({ error: 'Need both a paper and an instruction.' });
    }

    const user = `Here is an exam paper as JSON:

${JSON.stringify(paper)}

The teacher asks for this change:
"""
${instruction}
"""

Apply it and return the COMPLETE updated paper as JSON in the same schema.
Change only what was asked. Keep every other question exactly as it is.
Keep Urdu in Urdu and English in English. Return raw JSON only.`;

    const { text, usage, model } = await complete({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: 8000,
    });

    res.json({
      paper: normalisePaper(parseJson(text)),
      meta: {
        model,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        ...estimateCost(model, usage),
      },
    });
  } catch (err) {
    console.error('[revise]', err.message);
    res.status(500).json({ error: err.message });
  }
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
