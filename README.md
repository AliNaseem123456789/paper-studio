# Paper Studio

Turn a photograph of a handwritten exam paper — or a one-line description —
into a clean, printable paper. Built for Al-Sehr Academy. Works in English and
Urdu, including papers that mix both.

```
photo of handwriting  ──┐
                        ├──►  structured paper  ──►  edit  ──►  print / PDF
"nursery urdu test"   ──┘
```

## Setup

You need Node 18 or newer.

```powershell
# 1. backend
cd server
npm install
copy .env.example .env
#    paste your OpenAI key into .env
npm run dev

# 2. frontend, in a second terminal
cd client
npm install
npm run dev
```

Open http://localhost:5173

### The model id

`server/.env` defaults to `OPENAI_MODEL=gpt-6-luna`. If you get a *model not
found* error, the server tells you which models your key can actually see, or
you can check `http://localhost:5174/api/models` directly, then set the right
id in `.env`.

## How it works

Two stages, deliberately separated:

1. **Read** — the photo and your settings go to the vision model, which returns
   a *structured paper* (JSON), not HTML. One API call.
2. **Render** — React draws that structure as an A4 sheet. This is ordinary
   code, so it is identical every time and costs nothing.

Keeping them apart is what makes the paper editable. The model is only ever
asked to understand the page; the layout is never its problem.

## Using it

**Scan handwriting** — photograph the teacher's draft (up to 6 pages), set the
class and subject, hit *Create paper from scan*. The draft is reproduced
question for question; it does not invent extra questions.

**Describe it** — type what you want instead: *"Nursery Urdu mid-term, 50
marks. Trace the first five letters, fill in missing letters, match letter to
picture."* Useful when there is no draft.

**Edit** — every field is editable in the side panel and the preview updates as
you type. Reorder or delete questions there too.

**Ask for a change** — plain English: *"add two more Urdu questions"*, *"make
question 3 easier"*. The model edits the paper and leaves everything else alone.

**Answer key** — the toggle in the top bar fills in every answer in blue. Print
the paper, flip the toggle, print the key.

**Print** — *Print / PDF* opens the browser print dialog. Choose *Save as PDF*
or print straight to paper. The sheet is already A4 with correct margins.

Your draft is saved in the browser, so a refresh does not lose it.

## Question types

| Type | What it looks like |
|---|---|
| `fill_blank` | Sentences with `____` to complete |
| `mcq` | Tick or circle one of (a)(b)(c)(d) |
| `true_false` | Statement with a blank for T/F |
| `match` | Two columns, child draws joining lines |
| `complete_word` | Letter boxes, some pre-filled |
| `circle_picture` | Row of pictures, circle the right ones |
| `write_name` | Picture with a line under it |
| `short_answer` | Question with ruled space |
| `letter_practice` | Letter plus faded tracing guides |
| `handwriting` | A line to copy out twice |

Adding a type means adding a renderer in
`client/src/components/questions/Renderers.jsx` and a case in
`server/lib/schema.js`.

## Urdu rendering

The paper uses *Jameel Noori Nastaleeq* if it is installed on the machine, and
falls back to *Noto Nastaliq Urdu* from Google Fonts. Urdu questions get
`direction: rtl` and extra line-height automatically, based on each question's
own `language` field — so one paper can hold an English section and an Urdu
section and both read correctly.

## Project layout

```
server/
  index.js            two routes: /api/generate, /api/revise
  lib/openai.js       API call, pricing, helpful 404s
  lib/prompt.js       the system + user prompts
  lib/schema.js       the paper shape, and a defensive normaliser
client/
  src/App.jsx         state, generate/revise, localStorage
  src/components/
    Composer.jsx      upload or describe, plus settings
    Editor.jsx        per-question editing
    Paper.jsx         the A4 sheet
    questions/        one renderer per question type
  src/paper.css       the printed sheet (mm units)
  src/ui.css          the app around it
```

## Costs

The app prints tokens and an estimated price under the top bar after each
generation. A typical one-page paper runs a few thousand tokens. At Luna rates
that is well under a cent per paper.

Rates live in `PRICING` in `server/lib/openai.js` — update them if yours differ.

## Notes

- The API key stays on the server and is never sent to the browser.
- Pictures are emoji. They print cleanly and need no image hosting. If you want
  real clip-art later, swap the `icon` field for an image URL and update the
  `pic-art` rule in `paper.css`.
- Nothing is stored server-side. Drafts live in the browser only.
