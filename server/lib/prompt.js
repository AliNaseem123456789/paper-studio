import { QUESTION_TYPES } from './schema.js';

const TYPE_LIST = Object.entries(QUESTION_TYPES)
  .map(([k, v]) => `  "${k}" -- ${v}`)
  .join('\n');

const SCHEMA = `{
  "school": string,
  "title": string,                     // e.g. "Mid Term Examination 2026"
  "class": string,
  "subject": string,
  "language": "en" | "ur" | "mixed",
  "totalMarks": number | null,
  "duration": string,                  // e.g. "1 hour", or ""
  "instructions": string,              // the note line under the header, or ""
  "questions": [
    {
      "number": string,                // "1", "2(a)", "Q4" -- as the teacher wrote it
      "instruction": string,           // the wording of the question
      "marks": number | null,
      "language": "en" | "ur",         // language of THIS question
      "type": <one of the types below>,
      ...type-specific fields
    }
  ]
}`;

const TYPE_FIELDS = `
"fill_blank" | "short_answer" | "handwriting"
   "items": [{ "number": "1", "text": "Moving air is called ____.", "answer": "wind" }]
   Use ____ (four underscores) for every blank inside "text".

"mcq" | "true_false"
   "items": [{ "number": "1", "text": "Which of these is a living thing?",
               "options": ["Fan", "Bird", "Car", "Aeroplane"], "answer": "Bird" }]

"match"
   "left":  [{ "number": "1", "label": "Joystick", "icon": "🕹️" }]
   "right": [{ "label": "Printer" }]
   The child draws a line between the columns, so "right" MUST be shuffled
   relative to "left".

"complete_word"
   "items": [{ "number": "1", "letters": ["M","","M","O","R","Y"],
               "answer": "MEMORY", "icon": "💾" }]
   One array entry per letter box. "" means an empty box the child fills in.

"circle_picture" | "write_name"
   "items": [{ "number": "1", "label": "iron", "icon": "🔌",
               "text": "", "answer": "iron" }]
   For circle_picture, "answer" names the item that should be circled.

"letter_practice"
   "letters": ["ا","ب","پ"], "rows": 2
`;

export const SYSTEM_PROMPT = `You are a primary-school exam-paper assistant for a
school in Pakistan. Teachers give you a photograph of a handwritten draft paper,
or a short description of what they want, and you turn it into a clean,
structured exam paper.

You work in English and Urdu. Many papers mix both: an English section and an
Urdu section in the same paper. Keep every piece of text in the language the
teacher used. Never translate Urdu into English or the reverse.

You output JSON only. No prose, no markdown fences.`;

export function buildUserPrompt({ mode, settings, idea, syllabus }) {
  const s = settings || {};

  const header = [
    s.school && `School: ${s.school}`,
    s.class && `Class: ${s.class}`,
    s.subject && `Subject: ${s.subject}`,
    s.term && `Exam: ${s.term}`,
    s.totalMarks && `Total marks: ${s.totalMarks}`,
    s.duration && `Duration: ${s.duration}`,
    s.language && `Language: ${
      { en: 'English only', ur: 'Urdu only', mixed: 'English and Urdu' }[s.language]
      || s.language}`,
    s.questionCount && `Roughly ${s.questionCount} questions`,
  ].filter(Boolean).join('\n');

  const task = mode === 'image'
    ? `The attached image(s) are a teacher's HANDWRITTEN DRAFT of an exam paper.
Read them and reproduce the paper faithfully as structured JSON.

- Reproduce every question that is on the page, in the same order, with the
  same numbering and the same marks the teacher wrote.
- Do NOT invent questions that are not in the draft.
- Do NOT fill in the children's answers. Blanks stay blank. But DO fill the
  "answer" field where you can work it out, so the teacher can print a key.
- Where the draft has a hand-drawn picture, choose the single emoji that best
  represents it and put it in "icon". Never leave a picture out.
- Urdu text is right-to-left. Transcribe it exactly as written.`
    : `The teacher has described the paper they want. Create it as structured JSON.

Teacher's request:
"""
${idea || ''}
"""

- Write age-appropriate questions for the class given above.
- Vary the question types; do not make every question multiple choice.
- Fill the "answer" field for every question so the teacher can print a key.
- Choose a fitting emoji for "icon" wherever a picture would help.`;

  const syl = syllabus
    ? `\n\nThe school's syllabus for this class covers the following. Stay inside
it and reuse its vocabulary:\n"""\n${String(syllabus).slice(0, 6000)}\n"""`
    : '';

  return `${task}

${header ? `Settings the teacher chose:\n${header}\n` : ''}${syl}

Return JSON matching exactly this schema:
${SCHEMA}

Allowed values for "type":
${TYPE_LIST}

Type-specific fields:
${TYPE_FIELDS}

Rules:
- Output raw JSON only. No markdown fences, no commentary.
- Every question needs "type", "instruction" and its type-specific field.
- Keep Urdu in Urdu script and English in Latin script.
- "icon" must be a single emoji character, or "".`;
}
