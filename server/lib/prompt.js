import { BLOCK_TYPES, QUESTION_TYPES, GRID_COLS } from './doc.js';
import { catalogue } from './assets.js';

const QLIST = Object.entries(QUESTION_TYPES)
  .map(([k, v]) => `    "${k}" -- ${v}`).join('\n');

const BLIST = Object.entries(BLOCK_TYPES)
  .map(([k, v]) => `    "${k}" -- ${v}`).join('\n');

export const SYSTEM_PROMPT = `You are a document assistant for Al-Sehr Academy,
a primary school in Karachi, Pakistan. You build two kinds of page: exam papers
and term syllabus posters.

You work in English and Urdu, and many documents mix both. Keep every piece of
text in the language it was written in. Never translate one into the other.

You output JSON only. No prose, no markdown fences.`;

const SCHEMA = `{
  "kind": "exam" | "syllabus",
  "meta": {
    "school": string, "title": string, "class": string, "subject": string,
    "duration": string, "totalMarks": number|null,
    "instructions": string, "language": "en"|"ur"|"mixed"
  },
  "pages": [
    {
      "mode": "flow" | "canvas",
      "blocks": [ <block>, ... ]
    }
  ]
}`;

const BLOCK_SHAPE = `A block is:
{
  "type": <block type>,
  "language": "en" | "ur",        // optional; sets direction and font
  "x": 0, "y": 0, "w": 4, "h": 6, // CANVAS PAGES ONLY, in grid units
  "content": { ...depends on type }
}

Content by type:

"heading"   { "text": "...", "level": 1-4 }
"text"      { "text": "..." }
"divider"   {}
"lines"     { "count": 3, "gap": 8 }              // blank ruled writing lines
"answer"    { "variant": "lines"|"box"|"grid"|"dotted", "count": 4,
              "height": 30, "label": "" }
              Space for the child to write the answer. Use it after any
              question that needs written work. "box" is an empty bordered
              area, "grid" is squared paper for maths, "dotted" is guide
              lines for early handwriting.
"spacer"    { "height": 10 }                      // blank gap, in mm
"shape"     { "kind": "<shape>", "dashed": false }
              One of: line, curve, oval, rect, roundRect, parallelogram,
              triangle, rightTri, diamond, pentagon, hexagon, arrowRight,
              arrowLeft, arrowUp, arrowDown, star4, star5, star6,
              speechRect, speechOval, thought, heart, lightning, cloud,
              cross, tick.
"table"     { "headers": ["..."], "rows": [["..."]] }
"list"      { "title": "...", "ordered": false,
              "items": [ { "text": "Rise early", "assetId": "habit.wake" } ] }
"section"   { "title": "MATHEMATICS", "accent": "#2563c9",
              "blocks": [ <nested blocks, no x/y> ] }
"image"     { "assetId": "animal.lion" }  OR  { "generate": "a friendly lion" }
              A SMALL picture, about the size of a postage stamp. Right for
              "match the word to the picture" or "circle the correct picture".
"figure"    { "kind": "keyboard"|"clock"|"numberline"|"tenframe"|"trace",
              "opts": { ... } }
              A LARGE diagram across the page that the child writes on,
              colours or reads. See the rule below.
"raw"       { "html": "<div>...</div>" }          // escape hatch, see below
"question"  { "qtype": <question type>, "number": "1",
              "instruction": "...", "marks": 10, ...type fields }`;

const QUESTION_FIELDS = `Question content by qtype:

"fill_blank" | "short_answer" | "handwriting"
   "items": [{ "number":"1", "text":"Moving air is called ____.", "answer":"wind" }]
   Use ____ (four underscores) for every blank.

"mcq" | "true_false"
   "items": [{ "number":"1", "text":"Which is a living thing?",
               "options":["Fan","Bird","Car"], "answer":"Bird" }]

"match"
   "left":  [{ "number":"1", "label":"Joystick", "assetId":"tech.joystick" }]
   "right": [{ "label":"Printer" }]
   "right" MUST be shuffled relative to "left".

"complete_word"
   "items": [{ "number":"1", "letters":["M","","M","O","R","Y"],
               "answer":"MEMORY", "assetId":"tech.floppy" }]
   One entry per letter box; "" is a box the child fills in.

"circle_picture" | "write_name"
   "items": [{ "number":"1", "label":"iron", "assetId":"home.iron",
               "answer":"iron" }]
   For circle_picture, "answer" names the item that should be circled.

"letter_practice"
   "letters": ["ا","ب","پ"], "rows": 2`;

function assetRules() {
  return `PICTURES AND DIAGRAMS — read this carefully.

Not every picture is a small icon. Decide first which of the two you need:

A "figure" is a large diagram the child works ON. Use it whenever the question
asks them to colour, mark, read or write on the thing itself. Examples:
  "Colour the keys you use to type your name"   -> figure, kind "keyboard"
  "Colour the vowels on the keyboard"           -> figure, kind "keyboard"
  "Draw the hands to show 3 o'clock"            -> figure, kind "clock"
  "Circle the number 7 on the number line"      -> figure, kind "numberline"
  "Trace the letters"                           -> figure, kind "trace",
                                                   opts {"text":"a b c"}
A keyboard, clock or number line must NEVER be a small icon. A child cannot
colour a stamp-sized keyboard.

An "image"/assetId is a small picture the child only looks AT, to match,
circle or name. "Match the word Printer to its picture" is an image.

Figure options:
  keyboard   opts {} normally. For an answer key only,
             opts {"highlight":["A","L","I"]} shades those keys.
  clock      opts {"hour":3,"minute":0} draws the hands; omit both for a
             blank face the child draws on.
  numberline opts {"from":0,"to":10}
  tenframe   opts {"frames":2}
  trace      opts {"text":"a b c"}

PICTURES — read this carefully.

The school has its own icon library. Prefer it. When a picture is wanted,
look for a matching slug in the catalogue below and write
  "assetId": "<slug>"
Only when nothing in the catalogue fits, write instead
  "generate": "<short description of the picture>"
and the app will draw it or let the teacher choose one.

Never invent a slug that is not listed. Never put both assetId and generate on
the same item.

Catalogue:
${catalogue()}`;
}

const CANVAS_RULES = `CANVAS PAGES (syllabus posters)

A canvas page is a ${GRID_COLS}-column grid. Every top-level block needs
"x", "y", "w", "h" in grid units. One grid row is about 11mm tall, so a page
holds roughly 24 rows.

- Blocks must not overlap.
- A three-column syllabus uses w:4 panels at x:0, x:4, x:8.
- A full-width panel is x:0, w:${GRID_COLS}.
- Give each "section" a distinct "accent" colour.
- Put the real content inside each section's nested "blocks" -- usually one
  "list", sometimes a "table" or "text".
- Leave y:0 for the top row; the document header is drawn above the grid
  automatically, so do not add a heading block for the school name.`;

const FLOW_RULES = `FLOW PAGES (exam papers)

Blocks stack top to bottom and reflow automatically. Do NOT set x/y/w/h.
Order them exactly as they appear on the paper.`;

const ESCAPE = `ESCAPE HATCH

If the page contains something none of the block types can express, use
{ "type": "raw", "content": { "html": "..." } } with self-contained inline
styles. Use it sparingly, as a last resort -- a raw block cannot be edited in
the sidebar. Never use it for something a real block type covers.`;

export function buildUserPrompt({ mode, settings = {}, idea = '', syllabus = '', kind = 'exam' }) {
  const header = [
    settings.school && `School: ${settings.school}`,
    settings.class && `Class: ${settings.class}`,
    settings.subject && `Subject: ${settings.subject}`,
    settings.term && `Title: ${settings.term}`,
    settings.totalMarks && `Total marks: ${settings.totalMarks}`,
    settings.duration && `Duration: ${settings.duration}`,
    settings.language && `Language: ${
      { en: 'English only', ur: 'Urdu only', mixed: 'English and Urdu' }[settings.language]
      || settings.language}`,
  ].filter(Boolean).join('\n');

  const isSyllabus = kind === 'syllabus';

  const task = mode === 'image'
    ? `The attached image(s) are a ${isSyllabus ? 'syllabus sheet' : "teacher's handwritten draft exam paper"}.
Read them and reproduce the document faithfully as structured JSON.

- Reproduce every item that is on the page, in the same order, with the same
  numbering and marks.
- Do NOT invent content that is not there.
- Do NOT fill in the children's answers. Blanks stay blank. But DO fill the
  "answer" field where you can work it out, so a key can be printed.
- Urdu is right-to-left. Transcribe it exactly, and set "language":"ur" on
  those blocks.`
    : `The teacher has described what they want. Build it as structured JSON.

Teacher's request:
"""
${idea}
"""

- Write age-appropriate content for the class given above.
- Vary the block and question types.
- Fill the "answer" field wherever it makes sense.`;

  const syl = syllabus
    ? `\n\nThe school's syllabus for this class covers the following. Stay inside
it and reuse its vocabulary:\n"""\n${String(syllabus).slice(0, 6000)}\n"""\n`
    : '';

  return `${task}

${header ? `Settings the teacher chose:\n${header}\n` : ''}${syl}
Build a "${kind}" document. Use ${isSyllabus ? '"canvas"' : '"flow"'} mode for its page.

Return JSON matching exactly this schema:
${SCHEMA}

Block types:
${BLIST}

${BLOCK_SHAPE}

Question types:
${QLIST}

${QUESTION_FIELDS}

${isSyllabus ? CANVAS_RULES : FLOW_RULES}

${assetRules()}

${ESCAPE}

Output raw JSON only. No markdown fences, no commentary.`;
}

export function buildRevisePrompt(doc, instruction) {
  return `Here is a document as JSON:

${JSON.stringify(doc)}

The teacher asks for this change:
"""
${instruction}
"""

Apply it and return the COMPLETE updated document in the same schema.
Change only what was asked; keep every other block exactly as it is, including
its id, and on canvas pages its x/y/w/h. Keep Urdu in Urdu and English in
English. Prefer "assetId" from the library over "generate".

Return raw JSON only.`;
}
