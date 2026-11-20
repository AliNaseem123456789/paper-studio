import React, { createContext, useContext } from 'react';
import { RENDERERS as Q } from '../questions/Renderers.jsx';
import ShapeSvg from './Shape.jsx';
import Figure from './Figures.jsx';
import Masthead from './Masthead.jsx';
import Spot from './spots.jsx';

/* The resolved asset library. Pictures sit deep inside question renderers, so
   passing it down by prop would mean threading it through every one. */
export const AssetContext = createContext({});
export const useAssets = () => useContext(AssetContext);

/** Draw an asset: an uploaded/AI image, a built-in glyph, or a placeholder. */
export function Asset({ id, generate, src, assets, size = '12mm', fallbackGlyph }) {
  const ctx = useAssets();
  const lib = assets || ctx;
  const a = id ? lib?.[id] : null;

  if (src) return <img className="asset-img" src={src} alt="" style={{ height: size }} />;
  if (a?.url) return <img className="asset-img" src={a.url} alt={a.label} style={{ height: size }} />;
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
  const Tag = `h${L}`;
  return <Tag className={`blk-heading lvl${L}`}>{b.content.text}</Tag>;
}

function Text({ b }) {
  return <p className="blk-text">{b.content.text}</p>;
}

function List({ b, assets }) {
  const { title, ordered, items } = b.content;
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <div className="blk-list">
      {title && <div className="blk-list-title">{title}</div>}
      <Tag>
        {items.map((it, i) => (
          <li key={i}>
            {(it.assetId || it.generate) && (
              <Asset id={it.assetId} generate={it.generate} assets={assets} size="5.5mm" />
            )}
            <span>{it.text}</span>
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
  return (
    <div className="notebox">
      {b.content.label && <span className="nb-label">{b.content.label}</span>}
      <span className="nb-text">{b.content.text}</span>
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
  return (
    <div className="blk-section" style={{ '--sec': accent }}>
      {b.content.title && (
        <div className="blk-section-head">
          {b.content.number && <span className="sec-num">{b.content.number}</span>}
          <span>{b.content.title}</span>
        </div>
      )}
      <div className="blk-section-body">
        {b.content.spot && (
          <span className="sec-spot"><Spot id={b.content.spot} size={20} /></span>
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

  return (
    <div
      className={`blk blk-${b.type}${b.language === 'ur' ? ' rtl' : ''}`}
      style={style}
      data-block-id={b.id}
    >
      <C b={b} assets={assets} showAnswers={showAnswers} depth={depth} />
    </div>
  );
}
