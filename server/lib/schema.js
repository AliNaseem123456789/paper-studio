// The paper spec. Everything in the app -- the model, the editor, the
// preview, the print sheet -- agrees on this shape.

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

export const BLANK = '____';

/** A minimal empty paper, used when the UI starts cold. */
export function blankPaper() {
  return {
    school: '',
    title: '',
    class: '',
    subject: '',
    language: 'en',
    totalMarks: null,
    duration: '',
    instructions: '',
    questions: [],
  };
}

/**
 * Defensive normaliser. Model output is never trusted directly -- every field
 * is coerced to the shape the renderer expects so one bad key cannot blank
 * the whole preview.
 */
export function normalisePaper(raw) {
  const paper = { ...blankPaper(), ...(raw || {}) };

  paper.language = ['en', 'ur', 'mixed'].includes(paper.language)
    ? paper.language
    : 'en';

  paper.questions = (Array.isArray(raw?.questions) ? raw.questions : [])
    .map((q, i) => normaliseQuestion(q, i))
    .filter(Boolean);

  return paper;
}

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function normaliseQuestion(q, index) {
  if (!q || typeof q !== 'object') return null;

  const type = QUESTION_TYPES[q.type] ? q.type : 'short_answer';
  const base = {
    id: str(q.id) || `q${index + 1}-${Math.random().toString(36).slice(2, 7)}`,
    number: str(q.number) || String(index + 1),
    instruction: str(q.instruction),
    marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : null,
    language: ['en', 'ur'].includes(q.language) ? q.language : undefined,
    type,
  };

  switch (type) {
    case 'fill_blank':
    case 'short_answer':
    case 'handwriting':
      return {
        ...base,
        items: arr(q.items).map((it, j) => ({
          number: str(it?.number) || String(j + 1),
          text: str(it?.text),
          answer: str(it?.answer),
        })),
      };

    case 'mcq':
    case 'true_false':
      return {
        ...base,
        items: arr(q.items).map((it, j) => ({
          number: str(it?.number) || String(j + 1),
          text: str(it?.text),
          options: arr(it?.options).map(str),
          answer: str(it?.answer),
        })),
      };

    case 'match':
      return {
        ...base,
        left: arr(q.left).map((it, j) => ({
          number: str(it?.number) || String(j + 1),
          label: str(it?.label),
          icon: str(it?.icon),
        })),
        right: arr(q.right).map((it) => ({
          label: str(it?.label ?? it),
        })),
      };

    case 'complete_word':
      return {
        ...base,
        items: arr(q.items).map((it, j) => ({
          number: str(it?.number) || String(j + 1),
          // one entry per box; empty string = blank box the child fills
          letters: arr(it?.letters).map((c) => str(c).slice(0, 2)),
          answer: str(it?.answer),
          icon: str(it?.icon),
        })),
      };

    case 'circle_picture':
    case 'write_name':
      return {
        ...base,
        items: arr(q.items).map((it, j) => ({
          number: str(it?.number) || String(j + 1),
          label: str(it?.label),
          icon: str(it?.icon),
          text: str(it?.text),
          answer: str(it?.answer),
        })),
      };

    case 'letter_practice':
      return {
        ...base,
        letters: arr(q.letters).map(str),
        rows: Number.isFinite(Number(q.rows)) ? Number(q.rows) : 2,
      };

    default:
      return base;
  }
}
