import { apiUrl } from '../../lib/api.js';
import React, { createContext, useContext } from 'react';
import { RENDERERS as Q } from '../questions/Renderers.jsx';
import ShapeSvg from './Shape.jsx';
import Figure from './Figures.jsx';
import Masthead from './Masthead.jsx';
import Spot from './spots.jsx';
/* Editing reaches deep into a panel -- a bullet inside a list inside a
   section is three levels down -- so it arrives by context, not by prop. */
import { useEdit } from '../EditContext.jsx';

/* The resolved asset library. Pictures sit deep inside question renderers, so
   passing it down by prop would mean threading it through every one. */
export const AssetContext = createContext({});
export const useAssets = () => useContext(AssetContext);


/**
 * Write into one block's content from wherever it is drawn. The sheet's
 * `editBlock` finds the block by id at any depth, so a bullet inside a list
 * inside a panel can save itself without knowing where it lives.
 */
export function useSetContent(id) {
  const edit = useEdit();
  return (patch) => edit?.editBlock?.(id, (b) => ({
    ...b, content: { ...b.content, ...patch },
  }));
}

/**
 * Text you change by double-clicking it.
 *
 * Deliberately uncontrolled while open: React re-rendering a contentEditable
 * on every keystroke fights the caret, which ends up jumping to the start of
 * the line. The DOM holds the text during the edit and `onCommit` is called
 * once at the end -- Enter, or clicking away. Escape puts the original back.
 */
export function Editable({ value, onCommit, as: Tag = 'span', className = '', multiline = false }) {
  const edit = useEdit();
  const ref = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  if (!edit?.editable) return <Tag className={className}>{value}</Tag>;

  const finish = (save) => {
    const next = ref.current?.innerText.replace(/\n+$/, '') ?? '';
    setOpen(false);
    if (save && next !== value) onCommit(next);
    else if (ref.current) ref.current.innerText = value;
  };

  return (
    <Tag
      ref={ref}
      className={`${className} editable-text${open ? ' editing' : ''}`.trim()}
      title={open ? undefined : 'Double-click to edit'}
      contentEditable={open}
      suppressContentEditableWarning
      onDoubleClick={(e) => {
        e.stopPropagation();
        setOpen(true);
        // Let contentEditable land before putting the caret in it.
        requestAnimationFrame(() => {
          ref.current?.focus();
          const r = document.createRange();
          r.selectNodeContents(ref.current);
          r.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        });
      }}
      onMouseDown={(e) => open && e.stopPropagation()}
      onBlur={() => open && finish(true)}
      onKeyDown={(e) => {
        if (!open) return;
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); finish(true); }
      }}
    >
      {value}
    </Tag>
  );
}

/** Draw an asset: an uploaded/AI image, a built-in glyph, or a placeholder. */
export function Asset({ id, generate, src, assets, size = '12mm', fallbackGlyph }) {
  const ctx = useAssets();
  const lib = assets || ctx;
  const a = id ? lib?.[id] : null;

  if (src) return <img className="asset-img" src={src} alt="" style={{ height: size }} />;
  // The server gives asset URLs as server paths, so they need the same base
  // as the API calls when the client is hosted apart from the server.
  if (a?.url) return <img className="asset-img" src={apiUrl(a.url)} alt={a.label} style={{ height: size }} />;
  if (a?.glyph) return <span className="asset-glyph" style={{ fontSize: size }}>{a.glyph}</span>;
  // v1 documents stored a bare emoji rather than a slug.
  if (fallbackGlyph) return <span className="asset-glyph" style={{ fontSize: size }}>{fallbackGlyph}</span>;

  // Nothing resolved yet. Show a slot the teacher can click rather than a gap.
  return (
    <span className="asset-slot" style={{ width: size, height: size }}
          title={generate || id || 'picture'}>
      {generate ? '✨' : '▢'}
    </span>
  );
}

function Heading({ b }) {
  const L = Math.min(4, Math.max(1, b.content.level || 2));
  const set = useSetContent(b.id);
  return (
    <Editable
      as={`h${L}`}
      className={`blk-heading lvl${L}`}
      value={b.content.text}
      onCommit={(text) => set({ text })}
    />
  );
}

function Text({ b }) {
  const set = useSetContent(b.id);
  return (
    <Editable as="p" className="blk-text" multiline
              value={b.content.text} onCommit={(text) => set({ text })} />
  );
}

function List({ b, assets }) {
  const { title, ordered, items } = b.content;
  const Tag = ordered ? 'ol' : 'ul';
  const set = useSetContent(b.id);
  const edit = useEdit();
  const setItem = (i, text) => set({
    items: items.map((x, n) => (n === i ? { ...x, text } : x)),
  });
  return (
    <div className="blk-list">
      {title && (
        <Editable className="blk-list-title" value={title}
                  onCommit={(t) => set({ title: t })} />
      )}
      <Tag>
        {items.map((it, i) => (
          <li key={i}>
            {(it.assetId || it.generate) && (
              <span
                className={edit?.editable ? 'li-pic pickable' : 'li-pic'}
                title={edit?.editable ? 'Click to change this picture' : undefined}
                onClick={edit?.editable ? (e) => {
                  e.stopPropagation();
                  edit.openPicker?.({ blockId: b.id, index: i, list: true });
                } : undefined}
              >
                <Asset id={it.assetId} generate={it.generate} assets={assets} size="5.5mm" />
              </span>
            )}
            <Editable value={it.text} onCommit={(t) => setItem(i, t)} />
          </li>
        ))}
      </Tag>
    </div>
  );
}

function Table({ b }) {
  const { headers, rows } = b.content;
  return (
    <table className="blk-table">
      {headers.length > 0 && (
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Picture({ b, assets }) {
  const { assetId, generate, src, caption, fit } = b.content;
  return (
    <figure className={`blk-image fit-${fit}`}>
      <Asset id={assetId} generate={generate} src={src} assets={assets} size="100%" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Shape({ b }) {
  const { kind, stroke, fill, width, dashed, w, h, align } = b.content;

  // Canvas blocks carry x/y, and their grid box already sets the size.
  // On a flow page nothing does, so the shape draws at its own mm size.
  const canvas = b.x != null;
  const style = canvas
    ? undefined
    : { width: `${w ?? 40}mm`, height: `${h ?? 30}mm` };

  const box = (
    <div className="shape-box" style={style}>
      <ShapeSvg kind={kind} stroke={stroke} fill={fill}
                width={width} dashed={dashed} />
    </div>
  );

  if (canvas) return box;
  return (
    <div className="shape-row" style={{ justifyContent: flexAlign(align) }}>
      {box}
    </div>
  );
}

const flexAlign = (a) =>
  a === 'center' ? 'center' : a === 'end' ? 'flex-end' : 'flex-start';

function Lines({ b }) {
  const { count, gap = 8 } = b.content;
  return (
    <div className="blk-lines" style={{ '--gap': `${gap}mm` }}>
      {Array.from({ length: count }).map((_, i) => (
        <span className="rule-line" key={i} />
      ))}
    </div>
  );
}

/** Where the child writes. Four shapes, one block. */
function AnswerSpace({ b }) {
  const { variant, count, gap, height, cell, label } = b.content;

  const body =
    variant === 'box' ? (
      <div className="ans-box" style={{ height: `${height}mm` }} />
    ) : variant === 'grid' ? (
      <div
        className="ans-grid"
        style={{ height: `${height}mm`, '--cell': `${cell}mm` }}
      />
    ) : (
      <div
        className={`blk-lines${variant === 'dotted' ? ' dotted' : ''}`}
        style={{ '--gap': `${gap}mm` }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <span className="rule-line" key={i} />
        ))}
      </div>
    );

  return (
    <div className="blk-answer">
      {label && <div className="ans-label">{label}</div>}
      {body}
    </div>
  );
}

function FigureBlock({ b }) {
  return <Figure kind={b.content.kind} opts={b.content.opts}
                 height={b.content.height} />;
}

function MastheadBlock({ b, assets }) {
  return <Masthead content={b.content} assets={assets} />;
}

function NoteBox({ b }) {
  const setNote = useSetContent(b.id);
  return (
    <div className="notebox">
      {b.content.label && (
        <Editable className="nb-label" value={b.content.label}
                  onCommit={(label) => setNote({ label })} />
      )}
      <Editable className="nb-text" multiline value={b.content.text}
                onCommit={(text) => setNote({ text })} />
    </div>
  );
}

/**
 * A speech bubble or cloud callout. Drawn with CSS rather than an image so
 * it takes the panel's colour and resizes with its box like everything else.
 */
function Bubble({ b }) {
  const { text, shape, tail, colour } = b.content;
  const set = useSetContent(b.id);
  /* The tail is a sibling of the bubble, not a child of it. A rotated box
     hanging below its parent counts towards that parent's scroll height,
     and the fit pass would then grow the block for ever chasing a
     decoration that is only there to point at someone. */
  return (
    <div
      className={`bub-wrap tail-${tail}`}
      style={colour ? { '--bub': colour } : undefined}
    >
      <div className={`bubble bub-${shape}`}>
        <Editable className="bub-text" multiline value={text}
                  onCommit={(t) => set({ text: t })} />
      </div>
      {tail !== 'none' && shape !== 'burst' && <span className="bub-tail" />}
    </div>
  );
}

/**
 * Picture, label, then the words -- the shape the Nature Study panel takes,
 * where each row is a category with its examples listed beside it.
 */
function IconRows({ b, assets }) {
  const { heading, rows } = b.content;
  const set = useSetContent(b.id);
  const edit = useEdit();
  const setRow = (i, p) => set({ rows: rows.map((x, n) => (n === i ? { ...x, ...p } : x)) });
  return (
    <div className="iconrows">
      {heading && (
        <Editable className="ir-heading" value={heading}
                  onCommit={(t) => set({ heading: t })} />
      )}
      {rows.map((r, i) => (
        <div className="ir-row" key={i}>
          <span
            className={edit?.editable ? 'ir-spot pickable' : 'ir-spot'}
            title={edit?.editable ? 'Click to change this picture' : undefined}
            onClick={edit?.editable ? (e) => {
              e.stopPropagation();
              edit.openPicker?.({ blockId: b.id, index: i, rows: true });
            } : undefined}
          >
            {r.assetId || r.generate
              ? <Asset id={r.assetId} generate={r.generate} assets={assets} size="100%" />
              : r.spot && <Spot id={r.spot} size={null} />}
          </span>
          <Editable className="ir-label" value={r.label}
                    onCommit={(t) => setRow(i, { label: t })} />
          <Editable className="ir-text" value={r.text}
                    onCommit={(t) => setRow(i, { text: t })} />
        </div>
      ))}
    </div>
  );
}

function Spacer({ b }) {
  return <div className="blk-spacer" style={{ height: `${b.content.height}mm` }} />;
}

function Divider() {
  return <hr className="blk-divider" />;
}

function Raw({ b }) {
  // Escape hatch: model-authored markup, rendered as-is so the schema is
  // never a ceiling. Not editable in the sidebar, by design.
  return (
    <div className="blk-raw" dangerouslySetInnerHTML={{ __html: b.content.html }} />
  );
}

function Question({ b, assets, showAnswers }) {
  const q = b.content;
  const Renderer = Q[q.qtype];
  return (
    <section className="blk-question">
      <div className="q-head">
        <span>
          {b.language === 'ur' ? 'سوال نمبر' : 'Q'} {q.number}
          {q.instruction ? `: ${q.instruction}` : ''}
        </span>
        {q.marks != null && <span className="q-marks">{q.marks}</span>}
      </div>
      {Renderer
        ? <Renderer q={q} blockId={b.id} assets={assets} showAnswers={showAnswers} />
        : null}
    </section>
  );
}

function Section({ b, assets, showAnswers, depth = 0 }) {
  const accent = b.content.accent || 'var(--accent)';
  const setSec = useSetContent(b.id);
  const edit = useEdit();
  return (
    <div className="blk-section" style={{ '--sec': accent }}>
      {b.content.title && (
        <div className="blk-section-head">
          {b.content.number && (
            <Editable className="sec-num" value={b.content.number}
                      onCommit={(number) => setSec({ number })} />
          )}
          <Editable value={b.content.title} onCommit={(title) => setSec({ title })} />
        </div>
      )}
      {/* Two picture-row lists read as two columns, the way the printed
          Nature Study panel sets them, not as one long stack. */}
      <div className={'blk-section-body'
        + (b.content.blocks.length > 1
           && b.content.blocks.every((c) => c.type === 'iconrows') ? ' sec-2col' : '')}
      >
        {/* The panel's picture: the school's own artwork if it has been
            uploaded for this panel, otherwise one of the drawn spots.
            size={null} lets the panel scale it. */}
        {(b.content.assetId || b.content.generate || b.content.spot) && (
          <span
            className={edit?.editable ? 'sec-spot pickable' : 'sec-spot'}
            title={edit?.editable ? 'Click to change this picture' : undefined}
            onClick={edit?.editable ? (e) => {
              e.stopPropagation();
              edit.openPicker?.({ blockId: b.id });
            } : undefined}
          >
            {b.content.assetId || b.content.generate
              ? <Asset id={b.content.assetId} generate={b.content.generate}
                       assets={assets} size="100%" />
              : <Spot id={b.content.spot} size={null} />}
          </span>
        )}
        {b.content.blocks.map((c, i) => (
          <Block key={c.id || i} b={c} assets={assets} showAnswers={showAnswers}
                 depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

const MAP = {
  heading: Heading, text: Text, list: List, table: Table,
  image: Picture, shape: Shape, lines: Lines, divider: Divider,
  answer: AnswerSpace, spacer: Spacer, figure: FigureBlock,
  masthead: MastheadBlock, notebox: NoteBox,
  bubble: Bubble, iconrows: IconRows,
  raw: Raw, question: Question, section: Section,
};

export default function Block({ b, assets, showAnswers, depth = 0 }) {
  const C = MAP[b.type];
  if (!C) return null;

  const s = b.style || {};
  const style = {};
  if (s.bg) style.background = s.bg;
  if (s.color) style.color = s.color;
  if (s.align) style.textAlign = s.align === 'start' ? 'start' : s.align;
  if (s.size) style.fontSize = `${s.size}pt`;
  if (s.bold) style.fontWeight = 700;
  if (s.border) style.border = s.border;

  /* A block nested inside a panel is its own thing to select and
     right-click. The outermost block on a canvas page already has the
     Moveable wrapper doing this, so only children get it here. */
  const edit = useEdit();
  const nested = depth > 0 && edit?.editable;
  const selected = nested && edit.sel?.blockId === b.id;

  return (
    <div
      className={`blk blk-${b.type}${b.language === 'ur' ? ' rtl' : ''}`
        + (nested ? ' blk-pick' : '') + (selected ? ' blk-on' : '')}
      style={style}
      data-block-id={b.id}
      onClick={nested ? (e) => { e.stopPropagation(); edit.select?.(b.id, null); } : undefined}
      onContextMenu={nested ? (e) => {
        if (!edit.menu) return;
        e.preventDefault();
        e.stopPropagation();
        edit.select?.(b.id, null);
        edit.menu(b.id, e.clientX, e.clientY);
      } : undefined}
    >
      <C b={b} assets={assets} showAnswers={showAnswers} depth={depth} />
    </div>
  );
}
