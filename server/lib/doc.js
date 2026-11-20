// The document model.
//
// A document is pages; a page is blocks. Every visual thing on the sheet is a
// block with the same contract, so adding a new kind of element is small.
//
// Two page modes:
//   flow   -- blocks stack vertically and reflow. Exam papers.
//   canvas -- blocks are absolutely placed on a 12-column grid. Syllabus
//             posters. Fixed height; you add pages rather than reflowing.
//
// Positions in canvas mode are grid units, not pixels, so a document renders
// identically at any zoom or paper size.

export const BLOCK_TYPES = {
  heading:  'Heading',
  text:     'Paragraph',
  question: 'Question',
  list:     'Bullet list',
  section:  'Coloured panel',
  table:    'Table',
  image:    'Picture',
  figure:   'Diagram (keyboard, clock, number line)',
  masthead: 'Syllabus masthead',
  notebox:  'Footer note',
  shape:    'Shape',
  lines:    'Writing lines',
  answer:   'Answer space',
  spacer:   'Blank space',
  divider:  'Divider',
  raw:      'Raw HTML (escape hatch)',
};

export const QUESTION_TYPES = {
  fill_blank: 'Fill in the blanks',
  mcq: 'Multiple choice (tick / circle the answer)',
  match: 'Match the two columns',
  complete_word: 'Complete the word (letter boxes)',
  circle_picture: 'Circle / colour the correct picture',
  write_name: 'Look at the picture and write its name',
  short_answer: 'Short written answer',
  true_false: 'True or false',
  letter_practice: 'Trace / write the letters',
  handwriting: 'Copy the line in your best handwriting',
};

export const GRID_COLS = 12;
export const GRID_ROWS = 24;

let seq = 0;
const uid = (p = 'b') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/** The school's own mark, shipped with the app. See lib/assets.js. */
export const DEFAULT_MONOGRAM = 'school.monogram';

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v, d = null) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function blankDoc(kind = 'exam') {
  return {
    kind,
    meta: {
      school: '', title: '', class: '', subject: '', term: '',
      duration: '', totalMarks: null, instructions: '', language: 'en',
    },
    theme: kind === 'syllabus' ? 'poster' : 'classic',
    template: null,
    assets: {},
    pages: [{ id: uid('p'), mode: kind === 'syllabus' ? 'canvas' : 'flow', blocks: [] }],
  };
}

/* ------------------------------------------------------------- normalise */

export function normaliseDoc(raw) {
  const base = blankDoc(raw?.kind === 'syllabus' ? 'syllabus' : 'exam');
  const doc = {
    ...base,
    ...(raw || {}),
    meta: { ...base.meta, ...(raw?.meta || {}) },
  };

  doc.kind = raw?.kind === 'syllabus' ? 'syllabus' : 'exam';
  doc.meta.language = ['en', 'ur', 'mixed'].includes(doc.meta.language)
    ? doc.meta.language : 'en';
  doc.meta.totalMarks = num(doc.meta.totalMarks);
  doc.theme = str(doc.theme) || base.theme;
  doc.assets = typeof doc.assets === 'object' && doc.assets ? doc.assets : {};

  const pages = arr(raw?.pages);
  doc.pages = (pages.length ? pages : base.pages).map((p, i) => ({
    id: str(p?.id) || uid('p'),
    mode: p?.mode === 'canvas' ? 'canvas' : 'flow',
    blocks: arr(p?.blocks).map((b, j) => normaliseBlock(b, j, p?.mode === 'canvas'))
      .filter(Boolean),
  }));

  if (!doc.pages.length) doc.pages = base.pages;
  return doc;
}

export function normaliseBlock(b, index = 0, canvas = false) {
  if (!b || typeof b !== 'object') return null;
  const type = BLOCK_TYPES[b.type] ? b.type : 'text';

  const out = {
    id: str(b.id) || uid(),
    type,
    language: ['en', 'ur'].includes(b.language) ? b.language : undefined,
    style: normaliseStyle(b.style),
  };

  if (canvas) {
    // Grid units. Defaults tile new blocks down the page rather than stacking
    // them all at the origin.
    out.x = clamp(num(b.x, 0), 0, GRID_COLS - 1);
    out.y = clamp(num(b.y, index * 3), 0, GRID_ROWS * 4);
    out.w = clamp(num(b.w, 4), 1, GRID_COLS);
    out.h = clamp(num(b.h, 3), 1, GRID_ROWS * 4);
    out.z = num(b.z, index);
  }

  switch (type) {
    case 'heading':
      out.content = { text: str(b.content?.text ?? b.text), level: clamp(num(b.content?.level ?? b.level, 2), 1, 4) };
      break;

    case 'text':
      out.content = { text: str(b.content?.text ?? b.text) };
      break;

    case 'list':
      out.content = {
        title: str(b.content?.title ?? b.title),
        ordered: Boolean(b.content?.ordered ?? b.ordered),
        items: arr(b.content?.items ?? b.items).map((it) =>
          typeof it === 'string'
            ? { text: it, assetId: '', generate: '' }
            : { text: str(it?.text), assetId: str(it?.assetId), generate: str(it?.generate) }),
      };
      break;

    case 'section':
      out.content = {
        title: str(b.content?.title ?? b.title),
        accent: str(b.content?.accent ?? b.accent),
        number: str(b.content?.number),
        spot: str(b.content?.spot),
        blocks: arr(b.content?.blocks ?? b.blocks)
          .map((c, k) => normaliseBlock(c, k, false)).filter(Boolean),
      };
      break;

    case 'table':
      out.content = {
        headers: arr(b.content?.headers ?? b.headers).map(str),
        rows: arr(b.content?.rows ?? b.rows).map((r) => arr(r).map(str)),
      };
      break;

    case 'image':
      out.content = {
        assetId: str(b.content?.assetId ?? b.assetId),
        generate: str(b.content?.generate ?? b.generate),
        src: str(b.content?.src ?? b.src),
        caption: str(b.content?.caption ?? b.caption),
        fit: ['contain', 'cover'].includes(b.content?.fit) ? b.content.fit : 'contain',
      };
      break;

    // The shape library lives on the client; the server keeps the name as
    // written and lets the renderer resolve aliases, so adding a shape never
    // means touching two files.
    case 'shape':
      out.content = {
        kind: str(b.content?.kind ?? b.kind) || 'rect',
        stroke: str(b.content?.stroke),
        fill: str(b.content?.fill),
        width: clamp(num(b.content?.width, 2), 0.5, 12),
        dashed: Boolean(b.content?.dashed),
        // Drawn size in mm. Used on flow pages, where there is nothing to
        // drag; on canvas pages the block's own box governs instead.
        w: clamp(num(b.content?.w, 40), 2, 190),
        h: clamp(num(b.content?.h, 30), 2, 280),
        align: ['start', 'center', 'end'].includes(b.content?.align)
          ? b.content.align : 'start',
        // A drawn shape floats above the page instead of sitting in the
        // flow, so it can be put over a word. ox/oy are mm from the top-left
        // of the printable area.
        overlay: Boolean(b.content?.overlay),
        ox: clamp(num(b.content?.ox, 0), -20, 220),
        oy: clamp(num(b.content?.oy, 0), -20, 320),
        // Which way the shape was drawn. Lines and arrows need it; for a
        // symmetrical shape it changes nothing.
        flipX: Boolean(b.content?.flipX),
        flipY: Boolean(b.content?.flipY),
      };
      break;

    case 'lines':
      out.content = {
        count: clamp(num(b.content?.count ?? b.count, 3), 1, 40),
        gap: clamp(num(b.content?.gap, 8), 4, 20),   // mm between lines
        ruled: Boolean(b.content?.ruled ?? true),
      };
      break;

    // Where the child writes. 'style' picks what the space looks like:
    //   lines  -- ruled writing lines
    //   box    -- an empty bordered box
    //   grid   -- squared paper, for maths working
    //   dotted -- dotted guide lines for early handwriting
    case 'answer':
      out.content = {
        label: str(b.content?.label ?? b.label),
        variant: ['lines', 'box', 'grid', 'dotted'].includes(b.content?.variant)
          ? b.content.variant : 'lines',
        count: clamp(num(b.content?.count, 4), 1, 40),
        gap: clamp(num(b.content?.gap, 9), 4, 20),
        height: clamp(num(b.content?.height, 30), 8, 250),  // mm, box/grid
        cell: clamp(num(b.content?.cell, 6), 3, 20),        // mm, grid square
      };
      break;

    case 'spacer':
      out.content = { height: clamp(num(b.content?.height, 10), 1, 120) };
      break;

    // The fixed syllabus header. Only the words and the two side pictures
    // vary; the arrangement is the school's house style.
    case 'masthead':
      out.content = {
        school: str(b.content?.school) || 'AL-SEHAR ACADEMY',
        term: str(b.content?.term),
        title: str(b.content?.title) || 'SYLLABUS',
        forLabel: str(b.content?.forLabel) || 'for',
        className: str(b.content?.className),
        /* Was `crestAssetId` before the field was renamed; documents saved
           then still carry it, so read either. Empty means "the school's
           own mark", which the masthead supplies. */
        monogramAssetId: str(b.content?.monogramAssetId)
          || str(b.content?.crestAssetId) || DEFAULT_MONOGRAM,
        spotLeft: str(b.content?.spotLeft),
        spotRight: str(b.content?.spotRight) || 'book-stack',
        accent: str(b.content?.accent),
        pill: str(b.content?.pill),
      };
      break;

    case 'notebox':
      out.content = {
        label: str(b.content?.label) || 'Note',
        text: str(b.content?.text),
      };
      break;

    // A large diagram the child works on, as opposed to a small picture slot.
    // The figure library lives on the client; the server keeps the name.
    case 'figure':
      out.content = {
        kind: str(b.content?.kind ?? b.kind) || 'keyboard',
        height: num(b.content?.height) != null
          ? clamp(num(b.content?.height, 46), 10, 260) : null,
        opts: (b.content?.opts && typeof b.content.opts === 'object')
          ? b.content.opts : {},
      };
      break;

    case 'divider':
      out.content = {};
      break;

    case 'raw':
      out.content = { html: str(b.content?.html ?? b.html) };
      break;

    case 'question':
      out.content = normaliseQuestion(b.content ?? b, index);
      break;

    default:
      out.content = {};
  }

  return out;
}

function normaliseStyle(s) {
  if (!s || typeof s !== 'object') return {};
  const out = {};
  if (s.bg) out.bg = str(s.bg);
  if (s.color) out.color = str(s.color);
  if (s.border) out.border = str(s.border);
  if (s.align) out.align = ['start', 'center', 'end'].includes(s.align) ? s.align : undefined;
  if (s.size) out.size = num(s.size);
  if (s.bold != null) out.bold = Boolean(s.bold);
  return out;
}

function normaliseQuestion(q, index) {
  const qtype = QUESTION_TYPES[q?.qtype] ? q.qtype
    : QUESTION_TYPES[q?.type] ? q.type
    : 'short_answer';

  const base = {
    qtype,
    number: str(q?.number) || String(index + 1),
    instruction: str(q?.instruction),
    marks: num(q?.marks),
  };

  const items = (mapper) => arr(q?.items).map(mapper);

  switch (qtype) {
    case 'fill_blank':
    case 'short_answer':
    case 'handwriting':
      return { ...base, items: items((it, j) => ({
        number: str(it?.number) || String(j + 1),
        text: str(it?.text),
        answer: str(it?.answer),
      })) };

    case 'mcq':
    case 'true_false':
      return { ...base, items: items((it, j) => ({
        number: str(it?.number) || String(j + 1),
        text: str(it?.text),
        options: arr(it?.options).map(str),
        answer: str(it?.answer),
      })) };

    case 'match':
      return { ...base,
        // Off by default: a word printed beside its own picture gives the
        // answer away.
        showLabels: Boolean(q?.showLabels),
        left: arr(q?.left).map((it, j) => ({
          number: str(it?.number) || String(j + 1),
          label: str(it?.label),
          assetId: str(it?.assetId),
          generate: str(it?.generate),
          icon: str(it?.icon),
        })),
        right: arr(q?.right).map((it) => ({ label: str(it?.label ?? it) })),
      };

    case 'complete_word':
      return { ...base, items: items((it, j) => ({
        number: str(it?.number) || String(j + 1),
        letters: arr(it?.letters).map((c) => str(c).slice(0, 2)),
        answer: str(it?.answer),
        assetId: str(it?.assetId),
        generate: str(it?.generate),
        icon: str(it?.icon),
      })) };

    case 'circle_picture':
    case 'write_name':
      return { ...base, items: items((it, j) => ({
        number: str(it?.number) || String(j + 1),
        label: str(it?.label),
        text: str(it?.text),
        answer: str(it?.answer),
        assetId: str(it?.assetId),
        generate: str(it?.generate),
        icon: str(it?.icon),
      })) };

    case 'letter_practice':
      return { ...base, letters: arr(q?.letters).map(str), rows: num(q?.rows, 2) };

    default:
      return base;
  }
}

/* -------------------------------------------- migration from v1 spec ---- */

/** Turn the old flat { questions: [...] } paper into a v2 document. */
export function migratePaper(paper) {
  if (!paper || paper.pages) return normaliseDoc(paper);

  return normaliseDoc({
    kind: 'exam',
    theme: 'classic',
    meta: {
      school: paper.school, title: paper.title, class: paper.class,
      subject: paper.subject, duration: paper.duration,
      totalMarks: paper.totalMarks, instructions: paper.instructions,
      language: paper.language,
    },
    pages: [{
      mode: 'flow',
      blocks: (paper.questions || []).map((q) => ({
        type: 'question',
        language: q.language,
        content: { ...q, qtype: q.type },
      })),
    }],
  });
}

/** Every asset slug the document actually references. */
export function referencedAssets(doc) {
  const out = new Set();
  const walk = (b) => {
    const c = b?.content || {};
    if (c.assetId) out.add(c.assetId);
    if (c.monogramAssetId) out.add(c.monogramAssetId);
    for (const key of ['items', 'left', 'blocks']) {
      for (const it of arr(c[key])) {
        if (it?.assetId) out.add(it.assetId);
        if (it?.content) walk(it);
      }
    }
  };
  for (const p of arr(doc?.pages)) for (const b of arr(p.blocks)) walk(b);
  return [...out];
}
