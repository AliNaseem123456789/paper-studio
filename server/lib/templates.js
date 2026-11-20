// Starter documents. A template is just a document skeleton: page setup,
// theme, and a few blocks to show the shape. The LLM fills it, or the teacher
// edits it by hand.

export const TEMPLATES = {
  'exam-plain': {
    name: 'Exam — Plain',
    kind: 'exam',
    theme: 'plain',
    hint: 'No decoration. Cheapest to photocopy, easiest to read.',
    doc: { pages: [{ mode: 'flow', blocks: [] }] },
  },

  'exam-decorated': {
    name: 'Exam — Decorated',
    kind: 'exam',
    theme: 'sunny',
    hint: 'Icon border and coloured headings. For nursery and KG.',
    doc: { pages: [{ mode: 'flow', blocks: [] }] },
  },

  'exam-classic': {
    name: 'Exam — Classic',
    kind: 'exam',
    theme: 'classic',
    hint: 'Ruled header, circled marks. For Class 1 and above.',
    doc: { pages: [{ mode: 'flow', blocks: [] }] },
  },

  'syllabus-alsehar': {
    name: 'Syllabus — Al-Sehar',
    kind: 'syllabus',
    theme: 'poster',
    hint: "The school's standard sheet: masthead, six numbered panels, Urdu band, footer note.",
    doc: { pages: [{ mode: 'canvas', blocks: alsehar() }] },
  },

  'syllabus-3col': {
    name: 'Syllabus — 3 Column',
    kind: 'syllabus',
    theme: 'poster',
    hint: 'Coloured subject panels on a grid. The standard term syllabus.',
    doc: {
      pages: [{
        mode: 'canvas',
        blocks: [
          sec('Letters and Sounds', 0, 0, 4, 7, '#1f7a3d'),
          sec('Mathematics', 4, 0, 4, 7, '#2563c9'),
          sec('Colours and Drawing', 8, 0, 4, 7, '#b8560f'),
          sec('Writing Skills', 0, 7, 4, 7, '#8e3bb0'),
          sec('Good Manners', 4, 7, 4, 7, '#c0392b'),
          sec('Nature Study', 8, 7, 4, 7, '#0f8f98'),
          sec('Urdu', 0, 14, 12, 6, '#2563c9'),
        ],
      }],
    },
  },

  'syllabus-poster': {
    name: 'Syllabus — Poster',
    kind: 'syllabus',
    theme: 'poster',
    hint: 'Big title, two wide columns. Good for wall display.',
    doc: {
      pages: [{
        mode: 'canvas',
        blocks: [
          sec('Subjects', 0, 0, 6, 11, '#1f7a3d'),
          sec('Activities', 6, 0, 6, 11, '#b8560f'),
          sec('Notes for Parents', 0, 11, 12, 6, '#2563c9'),
        ],
      }],
    },
  },

  'worksheet-activity': {
    name: 'Worksheet — Activity',
    kind: 'exam',
    theme: 'rose',
    hint: 'Picture-heavy. Colouring, matching, circling.',
    doc: { pages: [{ mode: 'flow', blocks: [] }] },
  },

  'urdu-practice': {
    name: 'Urdu — Practice',
    kind: 'exam',
    theme: 'classic',
    hint: 'Right-to-left throughout, with tracing rows.',
    doc: {
      pages: [{
        mode: 'flow',
        blocks: [{
          type: 'question', language: 'ur',
          content: {
            qtype: 'letter_practice', number: '1',
            instruction: 'حروف کی مشق کریں', marks: 10,
            letters: ['ا', 'ب', 'پ', 'ت', 'ٹ'], rows: 2,
          },
        }],
      }],
    },
  },
};

/** The school's standard syllabus, as a starting point to edit. */
function alsehar() {
  const panel = (n, title, x, y, w, h, accent, spot, items) => ({
    type: 'section', x, y, w, h,
    content: {
      title, accent, number: String(n), spot,
      blocks: [{ type: 'list', content: { items: items.map((text) => ({ text })) } }],
    },
  });

  return [
    {
      type: 'masthead', x: 0, y: 0, w: 12, h: 4,
      content: {
        school: 'AL-SEHAR ACADEMY',
        term: 'FIRST SEMESTER 2026–27',
        title: 'SYLLABUS',
        forLabel: 'for',
        className: 'KG-II',
        spotRight: 'book-stack',
        accent: '#17365d',
        pill: '#7048e8',
      },
    },

    panel(1, 'Letters and Sounds', 0, 4, 4, 7, '#1f7a3d', 'abc-blocks', [
      'Recognition and naming of capital letters A–Z',
      'Recognition and naming of small letters a–z',
      'Sky letters, root letters and grass letters',
      'Vocabulary words with each letter',
      'Vowels: a, e, i, o, u and consonant letters',
    ]),
    panel(2, 'Mathematics', 4, 4, 4, 7, '#1971c2', 'numbers-123', [
      'Number words from one to twenty',
      'Writing numbers from 1–200',
      'Count and match with quantities',
      'Before, after and between numbers',
      'Tables: learn and write 2 and 3',
      'Addition and subtraction of two digits',
    ]),
    panel(3, 'Colours and Drawing', 8, 4, 4, 7, '#e8590c', 'palette', [
      'Identifying and naming primary colours',
      'Relating colours to real objects',
      'Red + Yellow = Orange',
      'Blue + Yellow = Green',
      'Red + Blue = Purple',
    ]),

    panel(4, 'Writing Skills', 0, 11, 4, 6, '#7048e8', 'pencil-cup', [
      'Reading, writing and dictation',
      'Rhymes: high and low volume',
      'Colour names, vegetable names, fruit names',
      'Parts of the body',
    ]),
    panel(5, 'Good Manners and Habits', 4, 11, 4, 6, '#c2255c', 'blocks', [
      'Rise early', 'Brush your teeth', 'Greet elders',
      'Attend school', 'Say sorry', 'Say thank you',
    ]),
    panel(6, 'Nature Study', 8, 11, 4, 6, '#0c8599', 'lion', [
      'Animals: lion, monkey, camel, giraffe',
      'Eatables: bread, cake, chocolate',
      'Stationery: pencil, sharpener, book',
      'Transport: aeroplane, boat, train',
    ]),

    {
      type: 'section', x: 0, y: 17, w: 12, h: 6,
      language: 'ur',
      content: {
        title: 'اردو', accent: '#1971c2', number: '7', spot: 'urdu-letters',
        blocks: [{
          type: 'list', language: 'ur',
          content: {
            items: [
              { text: 'الف سے یے تک لکھیں اور یاد کریں' },
              { text: 'خالی جگہیں پُر کریں' },
              { text: 'تصویر دیکھ کر لفظ لکھیں' },
              { text: 'حروف جوڑیے اور علیحدہ کریں' },
            ],
          },
        }],
      },
    },

    {
      type: 'notebox', x: 0, y: 23, w: 12, h: 2,
      content: {
        label: 'Note',
        text: 'All the above topics will be taught through activities, games, '
            + 'stories and practical work.',
      },
    },
  ];
}

function sec(title, x, y, w, h, accent) {
  return {
    type: 'section', x, y, w, h,
    content: { title, accent, blocks: [{ type: 'list', content: { items: [] } }] },
  };
}

export function templateList() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({
    id, name: t.name, kind: t.kind, theme: t.theme, hint: t.hint,
  }));
}

export function templateDoc(id) {
  const t = TEMPLATES[id];
  if (!t) return null;
  return { kind: t.kind, theme: t.theme, template: id, ...t.doc };
}
