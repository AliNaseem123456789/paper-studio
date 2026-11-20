# Paper Studio

Turn a photograph of a handwritten exam paper — or a one-line description —
into a clean, printable paper. Built for Al-Sehr Academy. Works in English and
Urdu, including papers that mix both.

Two modes, switched from the top bar:

**📄 Papers** — build a printable paper.

```
photo of handwriting  ──┐
                        ├──►  structured paper  ──►  edit  ──►  print / PDF
"nursery urdu test"   ──┘
```

**💬 Assistant** — an ordinary chat, independent of the Papers side. Type a
question, attach pictures, or both. It can answer about what it sees, draw
something new, or change a picture already in the conversation. There is no
mode to switch: the model decides from what you ask, through tool calls.

**📊 Usage** — every API call is logged with its tokens and cost, so after a
few papers you know what one actually costs.

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
   a *document* (JSON), not HTML. One API call.
2. **Render** — React draws that document as A4 sheets. This is ordinary code,
   so it is identical every time and costs nothing.

Keeping them apart is what makes everything editable. The model is only ever
asked to understand the page; layout is never its problem.

### The document model

A document is pages; a page is blocks. Every visual thing is a block with the
same contract, so adding an element type is small.

```
Document
 ├─ kind     "exam" | "syllabus"
 ├─ meta     school, class, subject, marks, language
 ├─ theme    which token set to render with
 └─ pages[]
     ├─ mode   "flow" | "canvas"
     └─ blocks[]   id, type, x/y/w/h (canvas only), style, content
```

**Flow** pages stack and reflow — exam papers. **Canvas** pages place blocks on
a 12-column grid at fixed positions — syllabus posters. A canvas page cannot
reflow onto page 2, by design; you add pages instead.

Block types: `heading` `text` `list` `section` `table` `image` `shape` `lines`
`divider` `question` `raw`.

`raw` is the escape hatch: model-authored HTML, rendered as-is. The schema is
never a ceiling. It cannot be edited in the sidebar, so it is a last resort.

### Every picture is its own thing

A question is a block, but each **picture inside it** is separately
addressable. In the Layout tab:

- **Click one picture** — the library opens for that picture alone. The other
  three in the same question are untouched.
- **Drag a picture** onto another in the same question to reorder them.
- The inspector shows "Picture 2 of 4" with its own label, answer, and a
  Clear-picture button; "Select whole question" steps back up.

This is the point of slugs: replacing the artwork rewrites one field, so
nothing moves and nothing is regenerated.

### Moving things around

The **Layout** tab turns the page into a canvas.

- **Drag** a block to move it; **pull a handle** to resize. Both snap to the
  12-column grid, so panels stay aligned without fiddling.
- **Shift** while dragging snaps to half-steps instead.
- **Arrow keys** nudge the selected block; **Delete** removes it.
- The inspector shows exact column/row/width/height if you would rather type.
- **Add to page** drops in a new panel, list, table, picture, heading, shape,
  writing lines or divider.
- Send back / bring forward / duplicate are there too.

Positions are stored in grid units, never pixels, so a document lands on the
same cell at any zoom and prints identically.

Flow pages (exam papers) do not use free positioning — blocks there stack and
reflow by design — but they are still draggable: hover a question to reveal the
⠿ grip and drag it up or down to reorder. A blue line shows where it will land.
Switch the page to Grid in the Design tab if you want free positioning instead.

### Match the columns

The left column prints **pictures only**, numbered. The right column holds the
words, shuffled. A picture's own word is the answer key and is not printed —
printing it beside the picture would give the exercise away. (There is a
"Show words on the left too" toggle for the rare paper that wants both.)

Its editor sits in the **Layout** tab, like the table editor:

- **Pairs** — one row per picture and its correct word. Click the thumbnail to
  choose a picture, type the word, reorder or delete. Numbering renumbers
  itself.
- **Right column** — the words as they will print. **🔀 Shuffle** rebuilds it
  from the pairs in random order; you can also reorder or retype by hand.
- A warning appears if the two columns fall out of step.

Removing a pair drops its word from the right column by value, not by index,
because the right column is shuffled.

### Syllabus

The third mode. It uses the same document engine as Papers but keeps its own
document in its own storage, so switching between the two never clobbers
either.

**The masthead is one fixed block**, not loose text — it is the part that must
look identical on every sheet the school puts out. Monogram, school name,
semester ribbon, and "SYLLABUS for <class>" in a coloured pill. Only the words
and the two side pictures change; the arrangement does not.

The school's monogram ships with the app as `server/brand/monogram.png`,
registered as the `school.monogram` asset and used by default. Replace it per
sheet from the Layout tab (a campus, a sister school) and come back to the
school one with a button. A drawn shield is the fallback if that file is
missing. The field was called `crestAssetId` before; documents saved under
that name are still read, in the server's normaliser and in the masthead
itself, because those documents live in the teacher's browser.

**Panels on this sheet** lists everything on the page, with a × on each row.
A syllabus is not the same set of panels every term — KG-II wants the Urdu
band, Class 3 may not — so removing one is a single click, and `+ Panel` adds
a numbered one in the next colour. **Arrange in 1–4 columns** re-flows the
panels into an even grid, keeping the masthead on top and the note at the
bottom, and leaving drawn shapes where they were drawn.

Row heights are **estimated, then measured**: `panelRows()` gets the first
pass roughly right, the browser draws it, and a second pass reads the real
overflow out of the DOM and lays out again. Urdu, wrapping, fonts and panel
pictures all land correctly that way, where no formula would get them right.
Note that a panel clips at two levels — the block wrapper and the coloured
section inside it — so the measurement takes the worst overflow in the
subtree, not just the top element.

**Spot illustrations**, a size up from the icon library: ABC blocks, Urdu
letters, numbers with operators, abacus, paint palette, pencil cup, easel,
stack of books, open book, graduation cap, mosque, globe, lion, train,
notepad, toy blocks. Drawn as SVG in colour, so they scale to the panel and
print sharp. Emoji were too small and too inconsistent for the job.

Each coloured panel takes a number badge, a colour, and one of those
illustrations, all from the Layout tab. The footer note is its own block.

The starting template `syllabus-alsehar` assembles the school's standard
sheet: masthead, six numbered panels, a full-width Urdu band and the footer
note. More templates can sit alongside it; the masthead block stays the same
in all of them.

### The assistant

A general chat, separate from Papers and sharing nothing with it.

- **Attach pictures** with the clip, by dragging onto the chat, or by pasting
  a screenshot. Up to four at a time; they appear in the conversation so you
  can see what you sent.
- **Ask about them** — the model sees the images, not just your words.
- **Ask for a picture** and it draws one.
- **Ask for a change** — "make the background blue", "remove the hat" — and it
  edits the picture already in the conversation, whether you attached it or it
  drew it. Every reply with a picture has **Download** and **Change this**;
  the latter puts that image back in the composer for another round.

There is no Chat/Picture switch. The model routes itself by beginning its
reply with `[DRAW] …` or `[EDIT] …`; the server reads that marker, runs the
image call and strips it before you see anything. No marker means an ordinary
answer.

This is deliberately *not* done with function tools. Reasoning models refuse
tools on `/v1/chat/completions` unless `reasoning_effort` is set to `none` —
and since tools would be offered on every turn, that would mean switching
reasoning off for every lesson-planning and grammar question too, to enable a
feature used in a minority of messages. A marker costs nothing, keeps
reasoning on, and works on models with no tool support at all.

The parser tolerates the ways a model drifts from the format — lower case,
spaces inside the brackets, bold wrapping, a trailing colon — and treats a
marker that appears mid-sentence, or with nothing after it, as ordinary text.
If the model forgets the marker entirely you simply get a written answer, so
the failure is a rephrase rather than an error.

**Images stay attached to their turn in the history**, which is what makes
"now make it blue" work — the earlier version sent text only, so the model had
forgotten the picture by the second message. Pictures are kept for the last
three turns and dropped from older ones, since each one costs roughly a
thousand tokens every time it is resent.

### Icons vs diagrams

Not every picture is a small icon, and this distinction matters more than it
sounds.

A **picture** (`image`, or an `assetId` on a question item) is stamp-sized.
The child only looks at it — to match it to a word, circle it, or name it.

A **figure** is a large diagram across the page that the child works *on*:
colours, marks, reads or writes. "Colour the keys you use to type your name"
needs an actual keyboard with keys big enough for a crayon — roughly 11mm
each — not a ⌨️ icon.

Built-in figures:

| Figure | For |
|---|---|
| `keyboard` | Full QWERTY, 60 keys. Colour, circle or mark keys. |
| `clock` | Clock face, blank or with hands at a given time. |
| `numberline` | Configurable range with ticks and labels. |
| `tenframe` | One to five ten-frames for early number work. |
| `trace` | Large faded letters on a ruled guide. |

The prompt teaches the model the difference with worked examples, so a
"colour the keyboard" question comes back as a figure rather than an icon.
Pick or change one in the **Layout** tab; each has its own options (clock
hands, number-line range, letters to trace). The keyboard's "shade these
keys" box is for the answer key only — normally it stays empty, because
colouring them is the exercise.

Figures live in `client/src/components/blocks/Figures.jsx`. The server keeps
the name it is given, so adding one means touching that file and the prompt.

### Space for the child to write

The **Answer space** block comes in four shapes, switched in the inspector:

| Variant | For |
|---|---|
| Ruled lines | Ordinary written answers |
| Dotted guides | Early handwriting practice |
| Empty box | Drawing, or pasting something in |
| Squared paper | Maths working |

Lines and spacing, or box height and square size, are all steppers — nursery
wants about 12mm between lines, Class 3 is comfortable at 7mm. **Blank space**
is a plain gap in millimetres, for pushing a question onto the next page.

### Shapes

26 shapes in a picker grid: line, curve, oval, rectangle, rounded rectangle,
parallelogram, triangle, right triangle, diamond, pentagon, hexagon, four
arrows, 4/5/6-point stars, speech box, speech bubble, thought bubble, heart,
lightning, cloud, cross and tick.

Each is an SVG with `preserveAspectRatio="none"`, so it stretches to its box —
drag a corner and the shape follows. Outline thickness, dashed on/off, line
colour and fill colour are all per-shape; open shapes (line, curve, tick) hide
the fill control because it would do nothing.

### Drawing with the cursor

In the **Layout** tab, the top grid is a set of drawing tools. Pick one and
drag on the page — a rubber-band preview follows the cursor, and on release
the shape is created where you drew it. The tool clears after each shape, like
Paint; Escape cancels.

Drawn shapes go on an **overlay** above the page rather than into the flow, so
a circle can sit over a word without pushing anything around. They work the
same on exam papers and syllabus posters. Drag one to move it, pull its corner
to resize, and its size in millimetres shows while you work.

Lines and arrows follow the direction you drag: down-right, up-right,
down-left and up-left each render the way you drew them, by mirroring inside
the SVG viewBox rather than with a CSS transform (which would distort the
stroke weight).

Coordinates are millimetres from the top-left of the printable area — the same
units as the page — so a shape prints exactly where it looks on screen.

**Sizing depends on the page.** On a Grid page, drag the corners. On a Flow
page (an exam paper) there is nothing to drag, so the inspector gives Width and
Height in millimetres plus left/centre/right alignment. A new shape starts at
40×30mm rather than filling the page.

A dashed oval 150×12mm stretched over a word is how "circle the answer" is
usually marked.

Shape names live in `client/src/components/blocks/shapes.js`. The server keeps
whatever name it is given and the renderer resolves aliases (`circle` → `oval`,
`star` → `star5`), so adding a shape means touching one file.

### Text size

Every block has its own font size, bold and alignment in the inspector, with
Reset to drop back to the document default. Useful for enlarging a nursery
paper without touching anything else.

### Tables

Add and remove both rows and columns. Hover a header to reveal its delete
button; rows have up/down/delete beside them. Headers and rows are kept the
same width at all times, so a ragged table from the model can never produce a
cell the editor cannot reach.

### Urdu keyboard

The **⌨ اردو** button in the top bar opens an on-screen Urdu keyboard. Click
any text field, then type — it writes into whichever field was last focused,
so it works for every Urdu field in the app. Standard phonetic layout, with a
Marks tab for اعراب, Urdu digits, and a zero-width non-joiner key for breaking
a ligature. The layout makes room for it so it never covers the field you are
editing.

### Themes

A theme is a token set — colours, fonts, border style, badge shape, panel
treatment — applied as CSS custom properties on the sheet. Switching a theme
never touches content.

Six themes (`classic` `sunny` `poster` `slate` `rose` `plain`) and **31 border
styles**, mixable: the border is a per-document override layered over the
theme's own. The picker groups them and each swatch previews itself.

**Plain** — none, hairline, double rule, corner ornaments, coloured frame.

**Patterns** (16) — dotted, stars, vine scroll, geometric, Islamic lattice,
Greek key, wave, zigzag, rope, maths symbols, numbers, musical staff, hearts
and pearls, flowers, pencils, bunting. Each is a 20×20 SVG tile repeated along
the edges with CSS backgrounds, coloured from the theme. They weigh nothing,
recolour instantly and print at full resolution.

**Pictures** (10) — emoji strips in themed sets: school, jungle animals, sea
life, sweets, stationery, dinosaurs, space, flowers, farm, transport.

Two flags handle motifs that cannot simply be rotated onto the side edges:
`upright` keeps letters and directional art the right way up (numbers, maths,
pencils), and `horizontalOnly` restricts a motif to the top and bottom where
a rotated copy would be meaningless (musical staff, bunting).

Adding one means a single entry in `BORDER_PATTERNS`
(`client/src/components/blocks/borders.jsx`) plus its name in `BORDER_STYLES`
on the server.

The reference designs were supplied as 51 JPEGs. They are deliberately not
shipped: 24MB that prints at screen resolution and cannot take the theme's
colour is worse than a tile that does both. The distinct styles were rebuilt
instead; the hand-drawn illustrated ones became icon sets, since redrawing
them as SVG would have been a poor imitation.

### Pictures and the asset library

Assets have stable slugs (`animal.lion`, `school.pencil`). Blocks reference a
slug, never a file — so **swapping a picture never disturbs its position, size
or crop.** That is the fix for re-prompting an image five times to change one
detail.

The catalogue of slugs is sent to the model with every generation, so it writes
`assetId: "animal.lion"` when your library has a match, and
`generate: "a friendly lion"` only when it does not. Your own artwork lands in
the output automatically.

Three sources, one namespace:

- **built-in** — emoji, free, always present
- **upload** — your own PNG/SVG from Figma or Canva: `POST /api/assets`
- **ai** — generated once, cached in the library, reusable: `POST /api/assets/generate`

Replace any built-in slug with an uploaded file and every document using it
updates at once.

### Drawing the pictures the library could not supply

When the model wants a picture no slug covers, it writes
`generate: "a cartoon brain"` and the slot renders as a placeholder. A banner
then appears above the page: *"3 pictures still to draw — about $0.15"*, with
a **Draw them** button.

One request draws them all. Identical prompts are drawn once, and anything
already drawn for that prompt is reused from the library for nothing — so a
paper that reuses a picture, or a second paper on the same topic, costs less
than the first.

Tick **Always** on that banner and it runs by itself after every generation.
It is off by default on purpose: pictures are the one genuinely expensive part
of the app, roughly 20–30× a text generation, so the first spend should be a
choice rather than a surprise. The banner always shows the estimate before
you commit, and the result line afterwards gives the real figure — drawn,
reused and actual cost.

A prompt that fails does not lose the pictures already drawn; the result says
how many failed and the rest are kept.

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
  index.js            routes: generate, revise, chat, image, usage
  lib/openai.js       text/vision call, pricing, helpful 404s
  lib/chat.js         chat + image generation, history trimming
  lib/usage.js        the token/cost ledger
  lib/prompt.js       the system + user prompts
  lib/schema.js       the paper shape, and a defensive normaliser
client/
  src/App.jsx         state, mode switch, localStorage
  src/components/
    Composer.jsx      upload or describe, plus settings
    Editor.jsx        per-question editing
    Paper.jsx         the A4 sheet
    Chat.jsx          the assistant, and the Picture button
    UsagePanel.jsx    token and cost breakdown
    questions/        one renderer per question type
  src/paper.css       the printed sheet (mm units)
  src/ui.css          the app around it
```

## Costs and token usage

Two places to look:

- **After each generation**, a line under the top bar shows that call's tokens,
  time and cost.
- **📊 Usage** in the top bar opens the full ledger: total calls and tokens,
  a breakdown per feature, the last 50 calls, and — the number that matters —
  **cost per finished paper**, in dollars and rupees per 100 papers. It needs
  three or four papers before the average means anything, and says so.

Text rates live in `PRICING` in `server/lib/openai.js`; image rates in
`imageCost` in `server/lib/chat.js`. Update them if yours differ.

The ledger is in memory, so it resets when the server restarts. To keep history,
write `log` to a JSON file in `server/lib/usage.js`.

**Images cost far more than text** — roughly 20–30× a paper generation, because
they bill at $8/$30 per million against Luna's $0.10/$0.50. The Usage panel
makes this obvious; generate artwork deliberately, not by reflex.

### A note on chat and tokens

Chat history is trimmed to a token budget before every call
(`trimHistory` in `server/lib/chat.js`). Without that, each turn resends the
whole conversation and token use grows quadratically with the number of turns —
the usual way a chat loop quietly burns through a TPM limit. The budget is
3000 approximate tokens; raise it in `trimHistory` if replies start losing
earlier context.

## Deploying

One process serves everything: the server hands out `client/dist` and answers
`/api` on the same origin, so there is no CORS and no API base URL to
configure. Locally nothing changes — Vite still proxies `/api` to the server.

On Render, as one Web Service:

| Setting | Value |
| --- | --- |
| Root Directory | **empty** |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/themes` |

Root Directory is the one that bites. Set it to `client` and the build runs
inside the client folder, where there is no server to start. The build needs
both halves, so it has to run from the repository root. `render.yaml` carries
the same settings for a Blueprint deploy.

Environment variables: `OPENAI_API_KEY` (required), `OPENAI_MODEL` (optional,
defaults to `gpt-6-luna`). Never commit either.

The root `package.json` installs the client with `--include=dev` on purpose.
Hosts commonly set `NODE_ENV=production`, npm then skips devDependencies, and
the build dies on a missing Vite.

**The free instance has no persistent disk.** Uploaded icons under
`server/assets/` and the usage ledger are gone on every deploy and on every
restart, and a free service sleeps after about 15 minutes idle, so the first
request afterwards takes the better part of a minute. The school monogram is
safe because it ships in the repo under `server/brand/`. Teacher uploads are
not: for those, attach a Render persistent disk or push them to object
storage. Saved drafts live in the browser, so they survive regardless.

## Notes

- The API key stays on the server and is never sent to the browser.
- Pictures are emoji. They print cleanly and need no image hosting. If you want
  real clip-art later, swap the `icon` field for an image URL and update the
  `pic-art` rule in `paper.css`.
- Nothing is stored server-side. Drafts live in the browser only.
