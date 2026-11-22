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

  'syllabus-poster-kg': {
    name: 'Syllabus — Poster (KG)',
    kind: 'syllabus',
    theme: 'poster',
    hint: 'Pastel panels of mixed widths, speech bubbles, picture rows. '
        + 'The busier wall-poster version.',
    doc: { pages: poster() },
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

/**
 * The wall-poster syllabus: panels of unequal width, speech bubbles in the
 * gaps, and the nature list as picture rows. Deliberately not a uniform
 * grid -- a long subject gets a wide panel and a short one sits beside it.
 *
 * Two sheets, because this much content at a size a five-year-old's parent
 * can read across the room does not fit on one A4. A page is 22 rows of
 * 11mm, and every block below is placed inside that.
 */
function poster() {
  const panel = (n, title, x, y, w, h, accent, spot, items) => ({
    type: 'section', x, y, w, h,
    content: {
      title, accent, number: String(n), spot,
      blocks: [{ type: 'list', content: { items: items.map((text) => ({ text })) } }],
    },
  });

  const bubble = (text, x, y, w, h, colour, shape = 'speech', tail = 'left') => ({
    type: 'bubble', x, y, w, h, content: { text, colour, shape, tail },
  });

  const page1 = [
    {
      type: 'masthead', x: 0, y: 0, w: 12, h: 4,
      content: {
        school: 'AL-SEHAR ACADEMY',
        term: 'Final Semester 2026\u201327',
        title: 'Syllabus',
        forLabel: 'for',
        className: 'KG-II',
        variant: 'pills',
        spotRight: 'abc-blocks',
        accent: '#17365d',
        pill: '#e64980',
      },
    },

    panel(1, 'Oxford Modern English', 0, 4, 8, 10, '#e64980', 'open-book', [
      'Page No. 25 to 53',
      'Write Aa to Zz, prepositions (in, on, behind, in front, under)',
      'Animal names, vegetable names, singular and plural, opposites',
      'Uses of This and That, make sentences (car, fish, mango)',
      'Who are you? What is your name? Fill in the blanks',
      'Essay: My School Bag. Read and write words with -ing',
      'This, These, That, Those. Me and My Family. My Self',
    ]),
    panel(2, 'Spectrum English Workbook', 8, 4, 4, 5, '#1971c2', 'book-stack', [
      'Level 2: page No. 63 to 144',
      'All exercises according to the book',
    ]),
    bubble('Learn\nGrow\nShine', 8, 9, 4, 5, '#dbe9ff', 'cloud', 'none'),

    panel(3, 'Mathematics', 0, 14, 8, 8, '#2f9e44', 'numbers-123', [
      'Learn by heart 201 to 300',
      'Backward counting 200 to 101, inwards counting 21 to 30',
      'Tables 4 and 5, dodging tables 2 to 5',
      'Shapes: triangle, circle, oval, square. Fill in the blanks',
      'Addition, subtraction, time',
      'Mathematics for KG-II: page No. 62 to 134, all exercises',
      'Drawing: straight lines, match the dots, colour the objects',
    ]),
    panel(4, 'Writing and Drawing', 8, 14, 4, 8, '#f08c00', 'pencil-cup', [
      'Reading, writing and dictation',
      'Identify and name the primary colours',
      'Thumb painting',
    ]),
  ];

  const page2 = [
    panel(5, 'General Conversation', 0, 0, 6, 9, '#1098ad', 'note', [
      'What is your name? What is your father\u2019s name?',
      'What is the name of your school? In which class do you study?',
      'What is your class teacher\u2019s name? Where do you live?',
      'How old are you? Who are you?',
      'How do we see, hear and smell? How many eyes do you have?',
      'Tell the parts of a day. How many fingers do you have?',
    ]),
    panel(6, 'General Knowledge', 6, 0, 6, 9, '#7048e8', 'globe', [
      'Which animal is the king of animals? (Lion)',
      'Which bird gives us eggs? (Duck, hen)',
      'Who delivers the letters? (Postman)',
      'Who flies an aeroplane? (Pilot)',
      'Who takes care of our country? (Soldier)',
      'Where was Quaid-e-Azam born? (25 December 1876)',
      'Which animal is called the ship of the desert? (Camel)',
      'Which is the biggest city of Pakistan? (Karachi)',
    ]),

    panel(7, 'Good Manners', 0, 9, 9, 6.5, '#f76707', 'blocks', [
      'When a teacher comes into your class, what would you say? (Good morning)',
      'Always say Bismillah before you start any work',
      'Always say Assalam-o-Alaikum when you meet someone',
      'When do you say sorry, thank you, excuse me?',
      'How to make a queue. How to get permission',
      'When you come into your class, what would you ask? (May I come in)',
    ]),
    bubble('Good\nMorning!', 9, 9, 3, 3, '#d3f9d8', 'speech', 'left'),
    bubble('Thank\nYou!', 9, 12, 3, 3, '#ffdeeb', 'speech', 'right'),

    {
      type: 'section', x: 0, y: 15, w: 12, h: 7,
      content: {
        title: 'Nature Study', accent: '#2f9e44', number: '8', spot: '',
        blocks: [
          {
            type: 'iconrows',
            content: {
              heading: 'November to December',
              rows: [
                { spot: 'note', label: 'Parts of body:', text: 'head, hair, nose, eye, arm, hand' },
                { spot: 'blocks', label: 'Shapes:', text: 'line, angle, square, circle, cone, oval' },
                { spot: 'lion', label: 'Birds:', text: 'hawk, eagle, ostrich, crow, crane, dove' },
                { spot: 'globe', label: 'Sports:', text: 'cricket, hockey, football, tennis' },
              ],
            },
          },
          {
            type: 'iconrows',
            content: {
              heading: 'January to March',
              rows: [
                { spot: 'train', label: 'Transport:', text: 'aeroplane, car, van, train, truck' },
                { spot: 'globe', label: 'Climate:', text: 'summer, winter, autumn, spring, rainy' },
                { spot: 'palette', label: 'Colours:', text: 'white, black, yellow, orange, red, blue' },
                { spot: 'abacus', label: 'Fruits:', text: 'apple, mango, orange, banana, grapes' },
              ],
            },
          },
        ],
      },
    },
  ];

  return [{ mode: 'canvas', blocks: page1 }, { mode: 'canvas', blocks: page2 }];
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
