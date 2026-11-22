import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { SHAPE_IDS, SHAPES, resolveShape } from './blocks/shapes.js';
import { ShapeIcon } from './blocks/Shape.jsx';
import { FIGURE_IDS, FIGURES } from './blocks/Figures.jsx';
import Spot, { SPOT_IDS, SPOTS } from './blocks/spots.jsx';
import { DEFAULT_MONOGRAM } from './blocks/Masthead.jsx';

/** Grid of spot illustrations; '' clears the picture. */
function SpotPicker({ value, onPick, allowNone = true }) {
  return (
    <div className="spot-grid">
      {allowNone && (
        <button className={!value ? 'spot-btn on' : 'spot-btn'}
                title="None" onClick={() => onPick('')}>
          <span className="spot-none">—</span>
        </button>
      )}
      {SPOT_IDS.map((id) => (
        <button
          key={id}
          className={value === id ? 'spot-btn on' : 'spot-btn'}
          title={SPOTS[id].name}
          onClick={() => onPick(id)}
        >
          <Spot id={id} size={9} />
        </button>
      ))}
    </div>
  );
}

/* Page geometry, for working out how tall a panel needs to be.
   A4 minus the sheet's 14mm margins, over a 12-column grid of 11mm rows. */
const CONTENT_MM = 210 - 28;
const ROW_MM = 11;

/**
 * How many grid rows a panel needs at `w` columns wide. An estimate, not a
 * measurement: it only has to be close enough that nothing is clipped when
 * the panels are re-flowed, and the teacher can still drag the handle.
 */
function panelRows(block, w) {
  const colMm = (w / 12) * CONTENT_MM;
  const items = block.content?.blocks?.find((c) => c.type === 'list')
    ?.content?.items || [];
  const size = block.style?.size || 10.5;
  const charMm = size * 0.5 * 0.3528;              // ~half an em per character
  const spot = block.content?.spot ? 15 : 0;        // the panel picture
  const usable = Math.max(14, colMm - 8);           // panel padding

  const lines = (text, width) =>
    Math.max(1, Math.ceil(String(text || '').length * charMm / width));

  // Title band, which wraps too, then the bullets.
  let mm = 4 + lines(block.content?.title, usable - 9) * (size * 0.47);
  items.forEach((it, i) => {
    // The picture sits top-right, so only the first few lines are narrowed.
    const width = i < 3 ? usable - spot : usable;
    mm += lines(it.text ?? it.label, width) * (size * 0.47) + 1.6;
  });
  return Math.max(4, Math.ceil((mm + 6) / ROW_MM));
}

/** Find a block by id at any depth: panels carry their own child blocks. */
function deepFind(blocks, id) {
  if (!id) return null;
  for (const b of blocks) {
    if (b.id === id) return b;
    if (Array.isArray(b.content?.blocks)) {
      const hit = deepFind(b.content.blocks, id);
      if (hit) return hit;
    }
  }
  return null;
}

/** Replace one block wherever it sits, leaving the rest of the tree alone. */
function deepMap(blocks, id, fn) {
  return blocks.map((b) => {
    if (b.id === id) return fn(b);
    if (Array.isArray(b.content?.blocks)) {
      return { ...b, content: { ...b.content, blocks: deepMap(b.content.blocks, id, fn) } };
    }
    return b;
  });
}

/* Blocks pinned outside the panel grid: the masthead on top, notes below. */
const TOP = ['masthead'];
const BOTTOM = ['notebox'];

/**
 * Lay a canvas page out as a grid: masthead full width on top, the panels
 * in `cols` equal columns in their present order with each row levelled,
 * then the footer notes. `heightOf(block, colWidth)` decides a panel's
 * rows. Drawn shapes are left exactly where they were drawn.
 */
function layout(blocks, cols, heightOf) {
  const w = 12 / cols;
  const isPanel = (b) => b.type === 'section';
  const tops = blocks.filter((b) => TOP.includes(b.type));
  const mid = blocks.filter(isPanel);
  const bottoms = blocks.filter((b) => BOTTOM.includes(b.type));

  let y = 0;
  const out = new Map();
  for (const b of tops) { out.set(b.id, { x: 0, y, w: 12, h: b.h || 4 }); y += b.h || 4; }

  for (let i = 0; i < mid.length; i += cols) {
    const row = mid.slice(i, i + cols);
    const h = Math.max(4, ...row.map((b) => heightOf(b, w)));
    row.forEach((b, j) => out.set(b.id, { x: +(j * w).toFixed(2), y, w: +w.toFixed(2), h }));
    y += h;
  }

  for (const b of bottoms) { out.set(b.id, { x: 0, y, w: 12, h: b.h || 2 }); y += b.h || 2; }

  return blocks.map((b) => {
    const p = out.get(b.id);
    return p ? { ...b, ...p } : b;
  });
}

/** Friendly names for the sheet's contents list. */
const BLOCK_LABEL = {
  masthead: 'School masthead', section: 'Panel', notebox: 'Footer note',
  list: 'Bullet list', text: 'Paragraph', heading: 'Heading', table: 'Table',
  image: 'Picture', figure: 'Diagram', answer: 'Answer space',
  lines: 'Writing lines', spacer: 'Blank space', shape: 'Shape',
  divider: 'Divider', question: 'Question',
};

const ADDABLE = [
  ['section', 'Coloured panel', '🗂'],
  ['list', 'Bullet list', '•'],
  ['text', 'Paragraph', '¶'],
  ['heading', 'Heading', 'H'],
  ['table', 'Table', '▦'],
  ['image', 'Picture', '🖼'],
  ['figure', 'Diagram', '⌨'],
  ['notebox', 'Footer note', '📌'],
  ['bubble', 'Speech bubble', '💬'],
  ['iconrows', 'Picture rows', '🏷'],
  ['answer', 'Answer space', '✍'],
  ['lines', 'Writing lines', '≡'],
  ['spacer', 'Blank space', '⇕'],
  ['shape', 'Shape', '◻'],
  ['divider', 'Divider', '—'],
];

/**
 * Editing for one picture-rows list: a heading, then a picture, a label and
 * the words for each row.
 */
function IconRowsEditor({ content, onChange, onPickRow }) {
  const rows = content.rows || [];
  const setRow = (i, p) => onChange({
    rows: rows.map((x, n) => (n === i ? { ...x, ...p } : x)),
  });
  return (
    <>
      <label className="full">
        Heading
        <input value={content.heading || ''} dir="auto"
               onChange={(e) => onChange({ heading: e.target.value })} />
      </label>
      {rows.map((r, i) => (
        <div className="row-edit" key={i}>
          <div className="row-edit-top">
            {r.assetId || r.generate ? (
              <button
                className="chip on"
                title="This row uses your own picture"
                onClick={() => setRow(i, { assetId: '', generate: '' })}
              >own picture ×</button>
            ) : (
              <select value={r.spot || ''} onChange={(e) => setRow(i, { spot: e.target.value })}>
                <option value="">no picture</option>
                {SPOT_IDS.map((id) => (
                  <option key={id} value={id}>{SPOTS[id].name}</option>
                ))}
              </select>
            )}
            {onPickRow && (
              <button className="chip" title="Upload or choose a picture"
                      onClick={() => onPickRow(i)}>⬆</button>
            )}
            <input value={r.label || ''} dir="auto" placeholder="Transport:"
                   onChange={(e) => setRow(i, { label: e.target.value })} />
            <button
              className="blk-row-x"
              title="Remove this row"
              onClick={() => onChange({ rows: rows.filter((_, n) => n !== i) })}
            >×</button>
          </div>
          <input value={r.text || ''} dir="auto" placeholder="car, van, train"
                 onChange={(e) => setRow(i, { text: e.target.value })} />
        </div>
      ))}
      <button
        className="chip on"
        onClick={() => onChange({ rows: [...rows, { spot: '', label: '', text: '' }] })}
      >+ Row</button>
    </>
  );
}

/** A labelled −/+ stepper. Faster than typing for the things teachers nudge. */
function Stepper({ label, value, onChange, min = 1, max = 40, step = 1, suffix = '' }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, Number(v.toFixed(1)))));
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-ctl">
        <button onClick={() => set(value - step)} disabled={value <= min}>−</button>
        <span className="stepper-val">{value}{suffix}</span>
        <button onClick={() => set(value + step)} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

const PALETTE = ['#1f7a3d', '#2563c9', '#b8560f', '#8e3bb0',
                 '#c0392b', '#0f8f98', '#5a7a1f', '#a4307a'];

let n = 0;
const uid = (p = 'b') => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

/** Editing for whichever block is selected, plus the add-block palette. */
export default function Inspector({
  doc, setDoc, sel, onSelect, onPatchItem, onLibrary, onOpenPicker,
  tool, onTool, onStartTemplate,
}) {
  const [starters, setStarters] = useState([]);
  useEffect(() => {
    if (!onStartTemplate) return;
    apiFetch('/api/templates')
      .then((r) => r.json())
      .then((b) => setStarters((b.list || []).filter((t) => t.kind === 'syllabus')))
      .catch(() => {});
  }, [onStartTemplate]);

  const selectedId = sel?.blockId || null;
  const itemIndex = sel?.itemIndex;

  /* Which page the panel is editing. A selection wins -- select something on
     page 2 and the controls follow it -- otherwise it is whichever page the
     teacher last clicked a tab for. */
  const [pageTab, setPageTab] = useState(0);
  const held = doc.pages.findIndex((p) => p.blocks.some((b) => b.id === selectedId));
  const pageIndex = held >= 0 ? held : Math.min(pageTab, doc.pages.length - 1);

  const page = doc.pages[pageIndex] || { blocks: [], mode: 'flow' };
  const canvas = page.mode === 'canvas';
  const index = page.blocks.findIndex((b) => b.id === selectedId);
  /* A block inside a panel is selectable too, so the search goes down into
     children. `index` stays the top-level position, and is -1 for a nested
     block -- the handful of controls that reorder blocks check for that. */
  const block = index >= 0 ? page.blocks[index] : deepFind(page.blocks, selectedId);
  const isNested = Boolean(block) && index < 0;

  // Which collection a question's pictures live in.
  const itemsKey = block?.content?.items ? 'items'
    : block?.content?.left ? 'left' : null;
  const item = block && itemIndex != null && itemsKey
    ? block.content[itemsKey][itemIndex] : null;

  const write = (fn) =>
    setDoc((d) => {
      const pages = [...d.pages];
      const i = Math.min(pageIndex, pages.length - 1);
      pages[i] = { ...pages[i], blocks: fn([...pages[i].blocks]) };
      return { ...d, pages };
    });

  /* ------------------------------------------------------------- pages
     A syllabus that outgrows one sheet spills onto a second. Rebalancing
     then means moving a panel across, which no amount of dragging can do:
     a block belongs to a page. */

  function movePage(blockId, to) {
    setDoc((d) => {
      const pages = d.pages.map((p) => ({ ...p, blocks: [...p.blocks] }));
      if (!pages[to]) return d;
      let moved = null;
      for (const p of pages) {
        const i = p.blocks.findIndex((b) => b.id === blockId);
        if (i >= 0) { [moved] = p.blocks.splice(i, 1); break; }
      }
      if (!moved) return d;
      // Lands at the foot of the target page, full width of its column span.
      const bottom = pages[to].blocks.reduce((m, b) => Math.max(m, (b.y || 0) + (b.h || 0)), 0);
      pages[to].blocks.push({ ...moved, y: bottom });
      return { ...d, pages };
    });
    setPageTab(to);
  }

  function addPage() {
    setDoc((d) => ({
      ...d,
      pages: [...d.pages, { id: uid('p'), mode: page.mode, blocks: [] }],
    }));
    setPageTab(doc.pages.length);
  }

  function removePage(i) {
    if (doc.pages.length < 2) return;
    setDoc((d) => ({ ...d, pages: d.pages.filter((_, n) => n !== i) }));
    setPageTab(Math.max(0, i - 1));
    onSelect?.(null);
  }

  /* By id, not by position: the selected block may be nested inside a
     panel, where there is no top-level index to write to. */
  const patch = (p) => write((bs) => deepMap(bs, selectedId, (b) => ({ ...b, ...p })));

  const patchContent = (p) => write((bs) => deepMap(bs, selectedId, (b) => ({
    ...b, content: { ...b.content, ...p },
  })));

  function add(type) {
    const b = {
      id: uid(), type,
      ...(canvas ? { x: 0, y: nextY(), w: 4, h: 4, z: page.blocks.length } : {}),
      content: defaults(type),
      style: {},
    };
    write((bs) => [...bs, b]);
    onSelect?.(b.id);
  }

  function nextY() {
    return page.blocks.reduce((m, b) => Math.max(m, (b.y || 0) + (b.h || 0)), 0);
  }

  function defaults(type) {
    switch (type) {
      case 'section': return { title: 'New panel', accent: PALETTE[page.blocks.length % 8],
                               blocks: [{ id: uid(), type: 'list', style: {},
                                          content: { items: [{ text: 'First item' }] } }] };
      case 'list':    return { items: [{ text: 'First item' }] };
      case 'text':    return { text: 'Type here.' };
      case 'heading': return { text: 'Heading', level: 2 };
      case 'table':   return { headers: ['Topic', 'Items'], rows: [['', '']] };
      case 'image':   return { assetId: '', generate: '', fit: 'contain' };
      case 'figure':  return { kind: 'keyboard', opts: {}, height: null };
      case 'notebox': return { label: 'Note', text: 'Type the note here.' };
      case 'bubble':  return { text: 'Well done!', shape: 'speech', tail: 'left',
                               colour: '#dbe9ff' };
      case 'iconrows': return { heading: 'November to December',
                                rows: [{ spot: 'lion', label: 'Animals:',
                                         text: 'lion, camel, giraffe' }] };
      case 'lines':   return { count: 3, gap: 8 };
      case 'answer':  return { variant: 'lines', count: 4, gap: 9, height: 30, cell: 6, label: '' };
      case 'spacer':  return { height: 10 };
      case 'shape':   return { kind: 'rect', width: 2, w: 40, h: 30, align: 'start' };
      default:        return {};
    }
  }

  /* ------------------------------------------------ the panel manager
     A syllabus is a set of panels, and which panels a given sheet needs
     changes from class to class -- KG-II wants the Urdu band, Class 3 may
     not. These act on the page as a whole, so they work without hunting
     for the right block first. */

  /** Every block that behaves as a panel in the grid. */
  const panels = page.blocks.filter((b) => b.type === 'section');

  function addPanel() {
    const cols = guessCols();
    const w = Math.round(12 / cols);
    const b = {
      id: uid(), type: 'section', x: 0, y: nextY(), w, h: 6, z: page.blocks.length,
      content: {
        title: 'New panel',
        number: String(panels.length + 1),
        accent: PALETTE[panels.length % PALETTE.length],
        spot: '',
        blocks: [{ id: uid(), type: 'list', style: {},
                   content: { items: [{ text: 'First topic' }] } }],
      },
      style: {},
    };
    /* After the last panel rather than at the very end, so the footer note
       stays the last thing on the sheet. */
    const at = page.blocks.reduce(
      (m, x, i) => (x.type === 'section' ? i + 1 : m), page.blocks.length);
    const next = [...page.blocks.slice(0, at), b, ...page.blocks.slice(at)];
    write(() => next);
    arrange(cols, next);
    onSelect?.(b.id);
  }

  /** How many columns the panels are currently laid out in. */
  function guessCols() {
    const w = panels.find((b) => b.w)?.w;
    return w ? Math.max(1, Math.round(12 / w)) : 3;
  }

  /**
   * Re-flow every panel into `cols` equal columns, in their present order,
   * with the masthead kept on top and notes kept at the bottom. Heights are
   * levelled per row so the sheet reads as a grid rather than a collage.
   */
  function arrange(cols, source) {
    place(cols, source || page.blocks, (b, w) => panelRows(b, w));
    /* The estimate above only has to be close. Once the browser has drawn
       the result we can see exactly how much text overflowed, so lay it out
       a second time with the real heights. */
    fitHeights(cols);
  }

  function place(cols, all, heightOf) {
    write(() => layout(all, cols, heightOf));
  }

  /**
   * Measure what the panels actually came out as, then lay them out again
   * at the heights the text really needs. Fonts, Urdu, pictures and
   * wrapping all land here for free, where no formula would get them right.
   */
  function fitHeights(cols, pass = 0) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const grown = new Map();
      for (const cell of document.querySelectorAll('.grid-page .grid-cell[data-block]')) {
        const rows = Number(cell.dataset.rows);
        if (!rows) continue;
        const rowPx = cell.getBoundingClientRect().height / rows;
        if (!(rowPx > 0)) continue;
        /* A panel clips at more than one level -- the block wrapper and the
           coloured section inside it both hide their overflow -- so take the
           worst overflow anywhere in the subtree, not just the top element. */
        let over = 0;
        for (const el of cell.querySelectorAll('*')) {
          over = Math.max(over, el.scrollHeight - el.clientHeight);
        }
        if (over > 1) grown.set(cell.dataset.block, rows + Math.ceil(over / rowPx));
      }
      if (!grown.size) return;
      write((bs) => layout(
        bs.map((b) => (grown.has(b.id) ? { ...b, h: grown.get(b.id) } : b)),
        cols,
        (b) => b.h || 4,
      ));
      /* Growing a block can change what fits inside it -- a line that no
         longer needs to wrap, a picture that stops being squeezed -- so
         look once more. Twice is enough; it converges from above. */
      if (pass < 1) fitHeights(cols, pass + 1);
    }));
  }

  /**
   * 1, 2, 3 … down the page, after a panel has been added or removed.
   * The counter lives inside the updater: React may call an updater twice,
   * and a counter held outside it would carry on from where it left off.
   */
  function renumber() {
    write((bs) => {
      let n = 0;
      return bs.map((b) => (b.type === 'section' && b.content.number != null
        ? { ...b, content: { ...b.content, number: String(++n) } }
        : b));
    });
  }

  function removeById(id) {
    write((bs) => bs.filter((b) => b.id !== id));
    if (selectedId === id) onSelect?.(null);
  }

  function order(dir) {
    if (isNested) return;   // reordering is a top-level idea
    write((bs) => {
      const j = index + dir;
      if (j < 0 || j >= bs.length) return bs;
      [bs[index], bs[j]] = [bs[j], bs[index]];
      return bs;
    });
  }

  function duplicate() {
    const copy = {
      ...block, id: uid(),
      ...(canvas ? { y: (block.y || 0) + (block.h || 2) } : {}),
    };
    write((bs) => [...bs, copy]);
    onSelect?.(copy.id);
  }

  function remove() {
    write((bs) => bs.filter((_, i) => i !== index));
    onSelect?.(null);
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Draw with the cursor</h2>
      <div className="shape-grid">
        {SHAPE_IDS.map((k) => (
          <button
            key={k}
            className={tool === k ? 'shape-btn on' : 'shape-btn'}
            title={`Draw a ${SHAPES[k].name.toLowerCase()}`}
            onClick={() => onTool?.(tool === k ? null : k)}
          >
            <ShapeIcon kind={k} />
          </button>
        ))}
      </div>
      <p className="hint">
        {tool
          ? `Drag on the page to draw a ${SHAPES[tool].name.toLowerCase()}. Press Escape to cancel.`
          : 'Pick a shape, then drag on the page. Drawn shapes float above the content, so a circle can go over a word.'}
      </p>

      {canvas && (
        <>
          {onStartTemplate && (
            <>
              <h2 className="panel-title">Start from</h2>
              <div className="chip-row">
                {starters.map((t) => (
                  <button
                    key={t.id}
                    className={doc.template === t.id ? 'chip on' : 'chip'}
                    title={`${t.hint} — replaces what is on the sheet`}
                    onClick={() => {
                      if (doc.template === t.id) return;
                      // eslint-disable-next-line no-alert
                      if (window.confirm(
                        `Start again from "${t.name}"? This replaces the panels `
                        + 'on this syllabus.')) onStartTemplate(t.id);
                    }}
                  >{t.name.replace(/^Syllabus — /, '')}</button>
                ))}
              </div>
            </>
          )}

          <h2 className="panel-title">Sheets</h2>
          <div className="chip-row">
            {doc.pages.map((_, i) => (
              <button
                key={i}
                className={i === pageIndex ? 'chip on' : 'chip'}
                onClick={() => { setPageTab(i); onSelect?.(null); }}
              >Page {i + 1}</button>
            ))}
            <button className="chip" onClick={addPage}>+ Page</button>
            {doc.pages.length > 1 && (
              <button className="chip" onClick={() => removePage(pageIndex)}>
                Delete page {pageIndex + 1}
              </button>
            )}
          </div>

          <h2 className="panel-title">On page {pageIndex + 1}</h2>

          <div className="blk-list">
            {page.blocks.filter((b) => !(b.type === 'shape' && b.content.overlay))
              .map((b) => (
              <div
                key={b.id}
                className={b.id === selectedId ? 'blk-row on' : 'blk-row'}
                onClick={() => onSelect?.(b.id)}
              >
                <span className="blk-row-name">
                  {b.content?.number ? `${b.content.number}. ` : ''}
                  {b.type === 'masthead'
                    ? (b.content?.school || BLOCK_LABEL.masthead)
                    : (b.content?.title || b.content?.label
                       || BLOCK_LABEL[b.type] || b.type)}
                </span>
                {doc.pages.length > 1 && (
                  <select
                    className="blk-row-page"
                    title="Move to another page"
                    value={pageIndex}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => movePage(b.id, Number(e.target.value))}
                  >
                    {doc.pages.map((_, i) => (
                      <option key={i} value={i}>p{i + 1}</option>
                    ))}
                  </select>
                )}
                <button
                  className="blk-row-x"
                  title="Remove from this sheet"
                  onClick={(e) => { e.stopPropagation(); removeById(b.id); }}
                >×</button>
              </div>
            ))}
            {!page.blocks.length && <p className="hint">Nothing on the sheet yet.</p>}
          </div>

          <div className="chip-row" style={{ marginTop: 8 }}>
            <button className="chip on" onClick={addPanel}>+ Panel</button>
            <button className="chip" onClick={renumber}>Renumber</button>
          </div>

          <h3 className="panel-title">Arrange in</h3>
          <div className="chip-row">
            {[1, 2, 3, 4].map((c) => (
              <button
                key={c}
                className={guessCols() === c ? 'chip on' : 'chip'}
                onClick={() => arrange(c)}
              >{c} {c === 1 ? 'column' : 'columns'}</button>
            ))}
          </div>
          <p className="hint">
            Re-flows the panels into an even grid and levels each row, keeping
            the masthead on top and the note at the bottom. Drawn shapes stay
            where you put them. Drag or resize any panel afterwards.
          </p>
        </>
      )}

      <h2 className="panel-title">Add to page</h2>
      <div className="add-grid">
        {ADDABLE.map(([type, label, glyph]) => (
          <button key={type} className="add-btn" onClick={() => add(type)} title={label}>
            <span className="add-glyph">{glyph}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {item ? (
        <>
          <h2 className="panel-title">
            Picture {itemIndex + 1} of {block.content[itemsKey].length}
          </h2>

          <div className="pic-preview">
            {item.assetId
              ? <span className="muted">{item.assetId}</span>
              : item.generate
                ? <span className="muted">✨ {item.generate}</span>
                : <span className="muted">No picture yet</span>}
          </div>

          <button
            className="primary"
            onClick={() => onOpenPicker({ blockId: block.id, index: itemIndex })}
          >
            {item.assetId ? 'Replace picture' : 'Choose picture'}
          </button>

          <label className="full">
            Label
            <input
              value={item.label ?? item.text ?? ''}
              dir="auto"
              onChange={(e) => onPatchItem(block.id, itemIndex,
                item.label !== undefined
                  ? { label: e.target.value }
                  : { text: e.target.value })}
            />
          </label>

          <label className="full">
            Answer
            <input
              value={item.answer || ''}
              dir="auto"
              onChange={(e) => onPatchItem(block.id, itemIndex, { answer: e.target.value })}
            />
          </label>

          <div className="chip-row" style={{ marginTop: 10 }}>
            <button
              className="chip"
              onClick={() => onPatchItem(block.id, itemIndex, { assetId: '', generate: '' })}
            >Clear picture</button>
            <button className="chip" onClick={() => onSelect(block.id, null)}>
              Select whole question
            </button>
          </div>

          <p className="hint">
            Drag a picture on the page to reorder it within this question.
            Replacing one never moves the others.
          </p>
        </>
      ) : !block ? (
        <p className="hint" style={{ marginTop: 16 }}>
          {canvas
            ? 'Click a block to move, resize or edit it. Drag to move, pull a handle to resize, arrow keys to nudge, Delete to remove. Hold Shift for half-steps.'
            : 'Click any block to edit it, or click a single picture inside a question to swap just that one. Drag the ⠿ grip to reorder questions; drag a picture to reorder it within its question.'}
        </p>
      ) : (
        <>
          <h2 className="panel-title">
            Selected — {block.type.replace(/_/g, ' ')}
          </h2>

          {canvas && (
            <div className="fields">
              {['x', 'y', 'w', 'h'].map((k) => (
                <label key={k}>
                  {{ x: 'Column', y: 'Row', w: 'Width', h: 'Height' }[k]}
                  <input
                    type="number" step="0.5"
                    value={block[k] ?? 0}
                    onChange={(e) => patch({ [k]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
          )}

          <div className="chip-row" style={{ marginTop: 10 }}>
            <button className="chip" onClick={() => order(-1)}>Send back</button>
            <button className="chip" onClick={() => order(1)}>Bring forward</button>
            <button className="chip" onClick={duplicate}>Duplicate</button>
            <button className="chip danger" onClick={remove}>Delete</button>
          </div>

          <label className="full">
            Language
            <select
              value={block.language || 'en'}
              onChange={(e) => patch({ language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="ur">اردو (right to left)</option>
            </select>
          </label>

          {/* Font size does nothing on a shape, a gap or a rule, so the
              control is not offered there. */}
          {!['shape', 'spacer', 'divider', 'lines'].includes(block.type) && (
          <>
          <h3 className="panel-title">Text size</h3>
          <Stepper
            label="Font"
            value={block.style?.size ?? doc.baseSize ?? 11}
            min={6} max={40} step={0.5} suffix="pt"
            onChange={(size) => patch({ style: { ...block.style, size } })}
          />
          <div className="chip-row" style={{ marginTop: 6 }}>
            <button
              className={block.style?.bold ? 'chip on' : 'chip'}
              onClick={() => patch({ style: { ...block.style, bold: !block.style?.bold } })}
            >Bold</button>
            {['start', 'center', 'end'].map((a) => (
              <button
                key={a}
                className={block.style?.align === a ? 'chip on' : 'chip'}
                onClick={() => patch({ style: { ...block.style, align: a } })}
              >{a === 'start' ? 'Left' : a === 'end' ? 'Right' : 'Centre'}</button>
            ))}
            {(block.style?.size || block.style?.bold || block.style?.align) && (
              <button className="chip" onClick={() => patch({ style: {} })}>Reset</button>
            )}
          </div>
          </>
          )}

          {/* ---------------------------------------------- per-type fields */}

          {(block.type === 'heading' || block.type === 'text') && (
            <label className="full">
              Text
              <textarea
                rows={3}
                value={block.content.text || ''}
                onChange={(e) => patchContent({ text: e.target.value })}
                dir="auto"
              />
            </label>
          )}

          {block.type === 'masthead' && (
            <>
              <h3 className="panel-title">Masthead</h3>
              {[['school', 'School name'], ['term', 'Semester ribbon'],
                ['title', 'Title'], ['forLabel', 'Joining word'],
                ['className', 'Class (in the pill)']].map(([k, label]) => (
                <label className="full" key={k}>
                  {label}
                  <input
                    value={block.content[k] || ''}
                    dir="auto"
                    onChange={(e) => patchContent({ [k]: e.target.value })}
                  />
                </label>
              ))}

              <h3 className="panel-title">Monogram</h3>
              <button
                className="primary"
                onClick={() => onOpenPicker({ blockId: block.id, field: 'monogramAssetId' })}
              >
                Replace monogram
              </button>
              {block.content.monogramAssetId !== DEFAULT_MONOGRAM && (
                <button
                  className="chip"
                  style={{ marginTop: 6 }}
                  onClick={() => patchContent({ monogramAssetId: DEFAULT_MONOGRAM })}
                >Back to the school monogram</button>
              )}
              <p className="hint">
                The school monogram is used by default. Replace it here for a
                campus or a sister school.
              </p>

              <h3 className="panel-title">Picture, right</h3>
              <SpotPicker value={block.content.spotRight}
                          onPick={(spotRight) => patchContent({ spotRight })} />
              <h3 className="panel-title">Picture, left</h3>
              <SpotPicker value={block.content.spotLeft}
                          onPick={(spotLeft) => patchContent({ spotLeft })} />

              <h3 className="panel-title">Colours</h3>
              <div className="swatch-row">
                {PALETTE.map((c) => (
                  <button key={c} className={block.content.accent === c ? 'sw on' : 'sw'}
                          style={{ background: c }}
                          onClick={() => patchContent({ accent: c })} />
                ))}
              </div>
              <p className="hint">School-name colour. The class pill uses the next row.</p>
              <div className="swatch-row">
                {PALETTE.map((c) => (
                  <button key={c} className={block.content.pill === c ? 'sw on' : 'sw'}
                          style={{ background: c }}
                          onClick={() => patchContent({ pill: c })} />
                ))}
              </div>
            </>
          )}

          {block.type === 'notebox' && (
            <>
              <label className="full">
                Label
                <input value={block.content.label || ''} dir="auto"
                       onChange={(e) => patchContent({ label: e.target.value })} />
              </label>
              <label className="full">
                Note
                <textarea rows={3} value={block.content.text || ''} dir="auto"
                          onChange={(e) => patchContent({ text: e.target.value })} />
              </label>
            </>
          )}

          {block.type === 'bubble' && (
            <>
              <label className="full">
                Words
                <textarea rows={2} value={block.content.text || ''} dir="auto"
                          onChange={(e) => patchContent({ text: e.target.value })} />
              </label>
              <p className="hint">A line break puts the next word underneath.</p>
              <h3 className="panel-title">Shape</h3>
              <div className="chip-row">
                {[['speech', 'Speech'], ['cloud', 'Cloud'], ['burst', 'Star burst']]
                  .map(([id, name]) => (
                    <button
                      key={id}
                      className={block.content.shape === id ? 'chip on' : 'chip'}
                      onClick={() => patchContent({ shape: id })}
                    >{name}</button>
                  ))}
              </div>
              <h3 className="panel-title">Pointer</h3>
              <div className="chip-row">
                {[['left', 'Left'], ['right', 'Right'], ['none', 'None']].map(([id, name]) => (
                  <button
                    key={id}
                    className={block.content.tail === id ? 'chip on' : 'chip'}
                    onClick={() => patchContent({ tail: id })}
                  >{name}</button>
                ))}
              </div>
              <label>
                Colour
                <input type="color" value={block.content.colour || '#e7f1ff'}
                       onChange={(e) => patchContent({ colour: e.target.value })} />
              </label>
            </>
          )}

          {block.type === 'iconrows' && (
            <IconRowsEditor
              content={block.content}
              onChange={patchContent}
              onPickRow={(i) => onOpenPicker({ blockId: block.id, index: i, rows: true })}
            />
          )}

          {/* A panel can hold picture-row lists -- the Nature Study one holds
              two. They are children of the panel, so they are edited here
              rather than being separately selectable on the page. */}
          {block.type === 'section'
            && block.content.blocks?.some((c) => c.type === 'iconrows')
            && block.content.blocks.map((c, i) => (c.type !== 'iconrows' ? null : (
              <IconRowsEditor
                key={c.id || i}
                content={c.content}
                onChange={(p) => patchContent({
                  blocks: block.content.blocks.map((x, n) => (n === i
                    ? { ...x, content: { ...x.content, ...p } } : x)),
                })}
                onPickRow={(row) => onOpenPicker({ blockId: c.id, index: row, rows: true })}
              />
            )))}

          {block.type === 'section' && (
            <>
              <label className="full">
                Panel title
                <input
                  value={block.content.title || ''}
                  dir="auto"
                  onChange={(e) => patchContent({ title: e.target.value })}
                />
              </label>
              <label className="full">
                Number (optional)
                <input
                  value={block.content.number || ''}
                  placeholder="1"
                  onChange={(e) => patchContent({ number: e.target.value })}
                />
              </label>

              <h3 className="panel-title">Colour</h3>
              <div className="swatch-row">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    className={block.content.accent === c ? 'sw on' : 'sw'}
                    style={{ background: c }}
                    onClick={() => patchContent({ accent: c })}
                  />
                ))}
              </div>

              <h3 className="panel-title">Panel picture</h3>
              {(block.content.assetId || block.content.generate) ? (
                <>
                  <button
                    className="primary"
                    onClick={() => onOpenPicker({ blockId: block.id })}
                  >Replace picture…</button>
                  <button
                    className="chip"
                    style={{ marginTop: 6 }}
                    onClick={() => patchContent({ assetId: '', generate: '' })}
                  >Back to a drawn picture</button>
                </>
              ) : (
                <>
                  <SpotPicker value={block.content.spot}
                              onPick={(spot) => patchContent({ spot })} />
                  <button
                    className="chip"
                    style={{ marginTop: 6 }}
                    onClick={() => onOpenPicker({ blockId: block.id })}
                  >Upload your own…</button>
                </>
              )}
              <p className="hint">
                Your own artwork — a PNG or SVG from Figma or Canva — replaces
                the drawn picture. Clicking the picture on the page opens the
                same chooser.
              </p>
            </>
          )}

          {(block.type === 'list' || block.type === 'section') && (
            <ListEditor
              list={block.type === 'list'
                ? block.content
                : block.content.blocks?.find((c) => c.type === 'list')?.content}
              onChange={(items) => {
                if (block.type === 'list') return patchContent({ items });
                const blocks = (block.content.blocks || []).map((c) =>
                  c.type === 'list' ? { ...c, content: { ...c.content, items } } : c);
                patchContent({ blocks });
              }}
              onPick={(i) => onOpenPicker({ blockId: block.id, index: i, list: true })}
            />
          )}

          {block.type === 'image' && (
            <>
              <div className="pic-preview">
                {block.content.assetId || block.content.generate
                  ? <span className="muted">{block.content.assetId || `✨ ${block.content.generate}`}</span>
                  : <span className="muted">No picture chosen</span>}
              </div>
              <button className="primary" onClick={() => onOpenPicker({ blockId: block.id })}>
                {block.content.assetId ? 'Replace picture' : 'Choose picture'}
              </button>
              <p className="hint">
                Swapping the picture keeps this block exactly where it is — no
                re-prompting, no re-positioning.
              </p>
            </>
          )}

          {block.type === 'figure' && (() => {
            const fk = FIGURES[block.content.kind] ? block.content.kind : 'keyboard';
            const o = block.content.opts || {};
            const setOpt = (patch) => patchContent({ opts: { ...o, ...patch } });
            return (
              <>
                <h3 className="panel-title">Diagram</h3>
                <div className="chip-row">
                  {FIGURE_IDS.map((k) => (
                    <button
                      key={k}
                      className={fk === k ? 'chip on' : 'chip'}
                      onClick={() => patchContent({ kind: k, opts: {}, height: null })}
                    >{FIGURES[k].name}</button>
                  ))}
                </div>

                <Stepper
                  label="Height" value={block.content.height ?? FIGURES[fk].h}
                  min={10} max={260} step={2} suffix="mm"
                  onChange={(height) => patchContent({ height })}
                />

                {fk === 'keyboard' && (
                  <>
                    <label className="full">
                      Shade these keys (answer key only)
                      <input
                        placeholder="e.g. A, L, I — leave blank for the pupil to colour"
                        value={(o.highlight || []).join(', ')}
                        onChange={(e) => setOpt({
                          highlight: e.target.value.split(',')
                            .map((s) => s.trim()).filter(Boolean),
                        })}
                      />
                    </label>
                    <p className="hint">
                      Normally leave this empty — colouring the keys is the
                      exercise. Fill it only for the answer key.
                    </p>
                  </>
                )}

                {fk === 'clock' && (
                  <>
                    <Stepper label="Hour" value={o.hour ?? 0} min={0} max={12}
                             onChange={(hour) => setOpt({ hour })} />
                    <Stepper label="Minute" value={o.minute ?? 0} min={0} max={55} step={5}
                             onChange={(minute) => setOpt({ minute })} />
                    <div className="chip-row" style={{ marginTop: 7 }}>
                      <button className="chip" onClick={() => setOpt({ hour: null, minute: null })}>
                        Blank face
                      </button>
                    </div>
                  </>
                )}

                {fk === 'numberline' && (
                  <>
                    <Stepper label="From" value={o.from ?? 0} min={0} max={100}
                             onChange={(from) => setOpt({ from })} />
                    <Stepper label="To" value={o.to ?? 10} min={1} max={100}
                             onChange={(to) => setOpt({ to })} />
                  </>
                )}

                {fk === 'tenframe' && (
                  <Stepper label="Frames" value={o.frames ?? 1} min={1} max={5}
                           onChange={(frames) => setOpt({ frames })} />
                )}

                {fk === 'trace' && (
                  <label className="full">
                    Letters to trace
                    <input
                      value={o.text || ''} dir="auto" placeholder="a b c"
                      onChange={(e) => setOpt({ text: e.target.value })}
                    />
                  </label>
                )}
              </>
            );
          })()}

          {block.type === 'question' && block.content.qtype === 'match' && (
            <MatchEditor
              content={block.content}
              onChange={(patch) => patchContent(patch)}
              onPickPicture={(i) => onOpenPicker({ blockId: block.id, index: i })}
            />
          )}

          {block.type === 'table' && (
            <TableEditor
              content={block.content}
              onChange={(c) => patchContent(c)}
            />
          )}

          {block.type === 'lines' && (
            <>
              <h3 className="panel-title">Writing lines</h3>
              <Stepper label="Lines" value={block.content.count} min={1} max={40}
                       onChange={(count) => patchContent({ count })} />
              <Stepper label="Spacing" value={block.content.gap ?? 8} min={4} max={20}
                       suffix="mm" onChange={(gap) => patchContent({ gap })} />
              <p className="hint">
                Wider spacing for younger children — nursery needs about 12mm,
                Class 3 is comfortable at 7mm.
              </p>
            </>
          )}

          {block.type === 'answer' && (
            <>
              <h3 className="panel-title">Answer space</h3>
              <div className="chip-row">
                {[['lines', 'Ruled lines'], ['dotted', 'Dotted guides'],
                  ['box', 'Empty box'], ['grid', 'Squared paper']].map(([v, label]) => (
                  <button
                    key={v}
                    className={block.content.variant === v ? 'chip on' : 'chip'}
                    onClick={() => patchContent({ variant: v })}
                  >{label}</button>
                ))}
              </div>

              {['lines', 'dotted'].includes(block.content.variant) ? (
                <>
                  <Stepper label="Lines" value={block.content.count} min={1} max={40}
                           onChange={(count) => patchContent({ count })} />
                  <Stepper label="Spacing" value={block.content.gap} min={4} max={20}
                           suffix="mm" onChange={(gap) => patchContent({ gap })} />
                </>
              ) : (
                <>
                  <Stepper label="Height" value={block.content.height} min={8} max={250}
                           step={5} suffix="mm" onChange={(height) => patchContent({ height })} />
                  {block.content.variant === 'grid' && (
                    <Stepper label="Square" value={block.content.cell} min={3} max={20}
                             suffix="mm" onChange={(cell) => patchContent({ cell })} />
                  )}
                </>
              )}

              <label className="full">
                Label (optional)
                <input
                  value={block.content.label || ''}
                  dir="auto"
                  placeholder="e.g. Answer:"
                  onChange={(e) => patchContent({ label: e.target.value })}
                />
              </label>
            </>
          )}

          {block.type === 'spacer' && (
            <>
              <h3 className="panel-title">Blank space</h3>
              <Stepper label="Height" value={block.content.height} min={1} max={120}
                       step={2} suffix="mm"
                       onChange={(height) => patchContent({ height })} />
              <p className="hint">
                An empty gap. Use it to push a question onto the next page, or
                to leave room for the teacher to paste something in.
              </p>
            </>
          )}

          {block.type === 'shape' && (() => {
            const kind = resolveShape(block.content.kind);
            const open = SHAPES[kind].open;
            return (
              <>
                <h3 className="panel-title">Shape</h3>
                <div className="shape-grid">
                  {SHAPE_IDS.map((k) => (
                    <button
                      key={k}
                      className={kind === k ? 'shape-btn on' : 'shape-btn'}
                      title={SHAPES[k].name}
                      onClick={() => patchContent({ kind: k })}
                    >
                      <ShapeIcon kind={k} />
                    </button>
                  ))}
                </div>

                {!canvas && (
                  <>
                    <h3 className="panel-title">Size</h3>
                    <Stepper label="Width" value={block.content.w ?? 40}
                             min={5} max={190} step={5} suffix="mm"
                             onChange={(w) => patchContent({ w })} />
                    <Stepper label="Height" value={block.content.h ?? 30}
                             min={5} max={260} step={5} suffix="mm"
                             onChange={(h) => patchContent({ h })} />
                    <div className="chip-row" style={{ marginTop: 7 }}>
                      {[['start', 'Left'], ['center', 'Centre'], ['end', 'Right']].map(
                        ([a, label]) => (
                        <button
                          key={a}
                          className={(block.content.align || 'start') === a ? 'chip on' : 'chip'}
                          onClick={() => patchContent({ align: a })}
                        >{label}</button>
                      ))}
                    </div>
                  </>
                )}

                <h3 className="panel-title">Outline</h3>
                <Stepper
                  label="Thickness" value={block.content.width ?? 2}
                  min={0.5} max={12} step={0.5} suffix="pt"
                  onChange={(width) => patchContent({ width })}
                />
                <div className="chip-row" style={{ marginTop: 7 }}>
                  <button
                    className={block.content.dashed ? 'chip on' : 'chip'}
                    onClick={() => patchContent({ dashed: !block.content.dashed })}
                  >Dashed</button>
                </div>

                <h3 className="panel-title">Line colour</h3>
                <div className="swatch-row">
                  {['', ...PALETTE, '#16181d'].map((c) => (
                    <button
                      key={c || 'theme'}
                      className={(block.content.stroke || '') === c ? 'sw on' : 'sw'}
                      style={c ? { background: c }
                               : { background: 'var(--accent)', outline: '1px solid #ccc' }}
                      title={c || 'Theme colour'}
                      onClick={() => patchContent({ stroke: c })}
                    />
                  ))}
                </div>

                {!open && (
                  <>
                    <h3 className="panel-title">Fill</h3>
                    <div className="swatch-row">
                      <button
                        className={!block.content.fill ? 'sw none on' : 'sw none'}
                        title="No fill"
                        onClick={() => patchContent({ fill: '' })}
                      />
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          className={block.content.fill === c ? 'sw on' : 'sw'}
                          style={{ background: c }}
                          onClick={() => patchContent({ fill: c })}
                        />
                      ))}
                    </div>
                  </>
                )}

                <p className="hint">
                  {canvas
                    ? 'Drag a corner on the page to reshape — the shape stretches to its box.'
                    : 'Set the size here. On a Grid page you could drag the corners instead.'}
                  {' '}A dashed oval over a word is how "circle the answer" is
                  usually marked.
                </p>
              </>
            );
          })()}

          {block.type === 'raw' && (
            <p className="hint">
              This block is raw HTML from the assistant. It renders as written
              and cannot be edited here — ask for a change in the Content tab,
              or delete it.
            </p>
          )}
        </>
      )}

    </div>
  );
}

function ListEditor({ list, onChange, onPick }) {
  if (!list) return null;
  const items = list.items || [];

  const set = (i, p) => {
    const next = [...items];
    next[i] = { ...next[i], ...p };
    onChange(next);
  };

  return (
    <>
      <h3 className="panel-title">Items</h3>
      {items.map((it, i) => (
        <div className="itemedit" key={i}>
          <button className="icon-btn" title="Picture" onClick={() => onPick(i)}>
            {it.assetId ? '🖼' : '＋'}
          </button>
          <input
            value={it.text || ''}
            dir="auto"
            onChange={(e) => set(i, { text: e.target.value })}
          />
          <button
            className="icon-btn danger"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >×</button>
        </div>
      ))}
      <button className="link-btn" onClick={() => onChange([...items, { text: '' }])}>
        + Add item
      </button>
    </>
  );
}

/**
 * Match-the-columns editor.
 *
 * A pair is one picture and its correct word. The right column is the same
 * words shuffled, kept as its own list so a teacher can reorder it by hand
 * and it stays put when the pairs are edited.
 */
function MatchEditor({ content, onChange, onPickPicture }) {
  const left = content.left || [];
  const right = content.right || [];

  const writeLeft = (next) => onChange({
    left: next.map((it, i) => ({ ...it, number: String(i + 1) })),
  });

  const setPair = (i, patch) => {
    const next = [...left];
    next[i] = { ...next[i], ...patch };
    writeLeft(next);
  };

  const addPair = () => {
    const next = [...left, { number: String(left.length + 1), label: '', assetId: '' }];
    onChange({
      left: next.map((it, i) => ({ ...it, number: String(i + 1) })),
      right: [...right, { label: '' }],
    });
  };

  const removePair = (i) => {
    const word = left[i]?.label;
    onChange({
      left: left.filter((_, j) => j !== i).map((it, j) => ({ ...it, number: String(j + 1) })),
      // Drop the matching word from the right column, by value not index,
      // since the right column is shuffled.
      right: (() => {
        const k = right.findIndex((r) => r.label === word);
        return k === -1 ? right.slice(0, -1) : right.filter((_, j) => j !== k);
      })(),
    });
  };

  const movePair = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= left.length) return;
    const next = [...left];
    [next[i], next[j]] = [next[j], next[i]];
    writeLeft(next);
  };

  /** Rebuild the right column from the pairs, shuffled. */
  const shuffle = () => {
    const words = left.map((it) => it.label).filter(Boolean);
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    onChange({ right: words.map((label) => ({ label })) });
  };

  const setRight = (i, label) => {
    const next = [...right];
    next[i] = { label };
    onChange({ right: next });
  };

  const moveRight = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= right.length) return;
    const next = [...right];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ right: next });
  };

  const mismatch = left.length !== right.length;

  return (
    <>
      <h3 className="panel-title">Pairs — picture and its word</h3>
      {left.map((it, i) => (
        <div className="pair-row" key={i}>
          <span className="pair-num">{i + 1}</span>
          <button
            className="pair-pic"
            title={it.assetId || 'Choose a picture'}
            onClick={() => onPickPicture(i)}
          >
            {it.assetId ? '🖼' : '＋'}
          </button>
          <input
            value={it.label || ''}
            dir="auto"
            placeholder="word"
            onChange={(e) => setPair(i, { label: e.target.value })}
          />
          <div className="tbl-rowctl">
            <button onClick={() => movePair(i, -1)} disabled={i === 0}>↑</button>
            <button onClick={() => movePair(i, 1)} disabled={i === left.length - 1}>↓</button>
            <button className="danger" onClick={() => removePair(i)}>×</button>
          </div>
        </div>
      ))}
      <div className="chip-row" style={{ marginTop: 7 }}>
        <button className="chip" onClick={addPair}>+ Pair</button>
      </div>

      <h3 className="panel-title">Right column — the words, shuffled</h3>
      {mismatch && (
        <p className="hint warn">
          {left.length} pictures but {right.length} words. Press Shuffle to
          rebuild the column.
        </p>
      )}
      {right.map((it, i) => (
        <div className="pair-row" key={i}>
          <span className="pair-num">{String.fromCharCode(97 + i)}</span>
          <input
            value={it.label || ''}
            dir="auto"
            onChange={(e) => setRight(i, e.target.value)}
          />
          <div className="tbl-rowctl">
            <button onClick={() => moveRight(i, -1)} disabled={i === 0}>↑</button>
            <button onClick={() => moveRight(i, 1)} disabled={i === right.length - 1}>↓</button>
          </div>
        </div>
      ))}
      <div className="chip-row" style={{ marginTop: 7 }}>
        <button className="chip" onClick={shuffle}>🔀 Shuffle</button>
        <button
          className={content.showLabels ? 'chip on' : 'chip'}
          onClick={() => onChange({ showLabels: !content.showLabels })}
        >Show words on the left too</button>
      </div>
      <p className="hint">
        The left column prints pictures only — its words are the answer key.
        Turn the last option on only if you want the word beside each picture.
      </p>
    </>
  );
}

function TableEditor({ content, onChange }) {
  const headers = content.headers || [];
  const rows = content.rows || [];
  const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1);

  /* Rows and headers are kept the same width at all times, so a ragged table
     from the model cannot produce cells the editor is unable to reach. */
  const squared = (list, width, fill = '') =>
    Array.from({ length: width }, (_, i) => list[i] ?? fill);

  const write = (nextHeaders, nextRows, width) =>
    onChange({
      headers: squared(nextHeaders, width),
      rows: nextRows.map((r) => squared(r, width)),
    });

  const setHeader = (i, v) => {
    const next = squared(headers, cols);
    next[i] = v;
    write(next, rows, cols);
  };

  const setCell = (r, c, v) => {
    const next = rows.map((row) => squared(row, cols));
    next[r][c] = v;
    write(headers, next, cols);
  };

  const addColumn = () => write(headers, rows, cols + 1);

  const removeColumn = (c) => {
    if (cols <= 1) return;
    write(
      squared(headers, cols).filter((_, i) => i !== c),
      rows.map((r) => squared(r, cols).filter((_, i) => i !== c)),
      cols - 1
    );
  };

  const addRow = () => write(headers, [...rows, Array(cols).fill('')], cols);
  const removeRow = (r) => write(headers, rows.filter((_, i) => i !== r), cols);

  const moveRow = (r, dir) => {
    const j = r + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.map((row) => squared(row, cols));
    [next[r], next[j]] = [next[j], next[r]];
    write(headers, next, cols);
  };

  return (
    <>
      <h3 className="panel-title">Table — {cols} column{cols === 1 ? '' : 's'} × {rows.length} row{rows.length === 1 ? '' : 's'}</h3>

      <div className="tbl-edit">
        <div className="tbl-row head">
          {squared(headers, cols).map((h, i) => (
            <div className="tbl-cell" key={i}>
              <input
                value={h}
                dir="auto"
                placeholder={`Column ${i + 1}`}
                onChange={(e) => setHeader(i, e.target.value)}
              />
              <button
                className="col-del"
                title="Delete this column"
                disabled={cols <= 1}
                onClick={() => removeColumn(i)}
              >×</button>
            </div>
          ))}
        </div>

        {rows.map((row, r) => (
          <div className="tbl-row" key={r}>
            {squared(row, cols).map((c, ci) => (
              <div className="tbl-cell" key={ci}>
                <input value={c} dir="auto" onChange={(e) => setCell(r, ci, e.target.value)} />
              </div>
            ))}
            <div className="tbl-rowctl">
              <button onClick={() => moveRow(r, -1)} disabled={r === 0} title="Move up">↑</button>
              <button onClick={() => moveRow(r, 1)} disabled={r === rows.length - 1} title="Move down">↓</button>
              <button className="danger" onClick={() => removeRow(r)} title="Delete row">×</button>
            </div>
          </div>
        ))}
      </div>

      <div className="chip-row" style={{ marginTop: 8 }}>
        <button className="chip" onClick={addRow}>+ Row</button>
        <button className="chip" onClick={addColumn}>+ Column</button>
      </div>
    </>
  );
}
