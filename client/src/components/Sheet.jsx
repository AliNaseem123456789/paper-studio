import React from 'react';
import Block from './blocks/Blocks.jsx';
import Moveable, { GRID_COLS, GRID_ROW_MM } from './canvas/Moveable.jsx';
import { EditContext } from './EditContext.jsx';
import { AssetContext } from './blocks/Blocks.jsx';
import DrawLayer from './canvas/DrawLayer.jsx';
import { PatternBorder, IconBorder, BORDER_PATTERNS } from './blocks/borders.jsx';

function Corners() {
  return (
    <div className="sheet-frame corners" aria-hidden="true">
      <span className="c tl" /><span className="c tr" />
      <span className="c bl" /><span className="c br" />
    </div>
  );
}

/**
 * Whatever decoration the border style calls for. "icons"/"icons:<set>" draw
 * an emoji strip, anything in the pattern library draws a tiled SVG, and the
 * plain rules are pure CSS on .sheet so they need nothing here.
 */
function BorderArt({ style, color }) {
  if (style === 'corners') return <Corners />;
  if (style === 'icons' || style.startsWith('icons:')) {
    return <IconBorder set={style.split(':')[1] || 'school'} />;
  }
  if (BORDER_PATTERNS[style]) return <PatternBorder id={style} color={color} />;
  return null;
}

function Header({ meta, rtl, showAnswers }) {
  return (
    <>
      <header className="sheet-head">
        {meta.school && <h1 className="sheet-school">{meta.school}</h1>}
        {meta.title && <p className="sheet-title">{meta.title}</p>}
      </header>

      <div className="sheet-meta">
        <span>{rtl ? 'کلاس' : 'Class'}: {meta.class || '______'}</span>
        <span>{rtl ? 'پرچہ' : 'Subject'}: {meta.subject || '______'}</span>
        {meta.duration && <span>{rtl ? 'وقت' : 'Time'}: {meta.duration}</span>}
        {meta.totalMarks != null && (
          <span>{rtl ? 'کل نمبر' : 'Total Marks'}: {meta.totalMarks}</span>
        )}
      </div>
      <hr className="sheet-rule" />

      {meta.instructions && <div className="sheet-note">{meta.instructions}</div>}

      {showAnswers && (
        <div className="sheet-note answer-flag">ANSWER KEY — not for distribution</div>
      )}
    </>
  );
}

function Page({ page, doc, assets, showAnswers, first, tokens, edit }) {
  // A document restored from storage may predate `meta`; losing the whole
  // sheet over a missing field would be the wrong trade.
  const rtl = doc.meta?.language === 'ur';
  const border = tokens.border || 'hairline';
  const canvas = page.mode === 'canvas';
  const drawn = page.blocks.filter((b) => b.type === 'shape' && b.content.overlay);
  const inflow = page.blocks.filter((b) => !(b.type === 'shape' && b.content.overlay));

  return (
    <article
      className={`sheet border-${border.replace(':', '-')} ` +
                 `${BORDER_PATTERNS[border] ? 'border-pattern ' : ''}` +
                 `badge-${tokens.badge || 'circle'} ` +
                 `sec-${tokens.sectionStyle || 'outlined'}${rtl ? ' rtl' : ''}`}
      dir={rtl ? 'rtl' : 'ltr'}
      style={cssVars(tokens)}
    >
      <BorderArt style={border} color={tokens.borderColor || tokens.accent} />

      {/* A syllabus carries its own masthead block, so the exam header
          (Class / Subject / Total Marks) would be a second, wrong one. */}
      {first && doc.kind !== 'syllabus' && (
        <Header meta={doc.meta || {}} rtl={rtl} showAnswers={showAnswers} />
      )}

      {canvas ? (
        <div
          className={`grid-page${edit?.editable ? ' editing' : ''}`}
          onPointerDown={(e) => {
            if (e.target.classList.contains('grid-page')) edit?.onSelect?.(null, null);
          }}
        >
          {edit?.editable && <GridLines />}
          {inflow.map((b) => (
            <Moveable
              key={b.id}
              block={b}
              rtl={rtl}
              editable={Boolean(edit?.editable)}
              selected={edit?.sel?.blockId === b.id}
              onSelect={(id) => edit?.onSelect?.(id, null)}
              onChange={edit?.onChange}
              onDelete={edit?.onDelete}
              onMenu={edit?.onMenu}
            >
              <Block b={b} assets={assets} showAnswers={showAnswers} />
            </Moveable>
          ))}
        </div>
      ) : (
        inflow.map((b, bi) => (
          <FlowBlock
            key={b.id}
            b={b} index={bi}
            assets={assets}
            showAnswers={showAnswers}
            edit={edit}
          />
        ))
      )}

      {(drawn.length > 0 || edit?.tool) && (
        <DrawLayer
          blocks={drawn}
          tool={edit?.tool}
          editable={Boolean(edit?.editable)}
          selectedId={edit?.sel?.blockId}
          onSelect={edit?.onSelect}
          onDraw={(geom) => edit?.onDraw?.(geom)}
          onMove={edit?.onMoveDrawn}
          onDelete={edit?.onDelete}
        />
      )}

      {doc.kind === 'exam' && first && (
        <div className="sheet-foot">
          <span>{rtl ? 'نام' : 'Name'}: ______________________</span>
          <span className="goodluck">{rtl ? 'بہترین' : 'Good Luck'}</span>
          <span>{rtl ? 'رول نمبر' : 'Roll No'}: __________</span>
        </div>
      )}
    </article>
  );
}

function cssVars(t) {
  const out = {};
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string' || typeof v === 'number') out[`--${k}`] = v;
  }
  return out;
}

/**
 * A block on a flow page. Not freely positioned -- flow pages reflow -- but
 * draggable up and down to reorder, and clickable to select.
 */
function FlowBlock({ b, index, assets, showAnswers, edit }) {
  const [over, setOver] = React.useState(null); // 'above' | 'below'
  const editable = Boolean(edit?.editable);
  const selected = edit?.sel?.blockId === b.id && edit?.sel?.itemIndex == null;

  if (!editable) {
    return <Block b={b} assets={assets} showAnswers={showAnswers} />;
  }

  return (
    <div
      className={`flow-wrap editable${selected ? ' selected' : ''}` +
                 `${over ? ` drop-${over}` : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-block', String(index));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('application/x-block')) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        setOver(e.clientY < r.top + r.height / 2 ? 'above' : 'below');
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => {
        const raw = e.dataTransfer.getData('application/x-block');
        if (!raw) return;
        e.preventDefault();
        const from = Number(raw);
        const to = over === 'below' ? index + 1 : index;
        setOver(null);
        if (from !== to) edit.onMoveBlock?.(from, to);
      }}
      onClick={(e) => {
        e.stopPropagation();
        edit.onSelect?.(b.id, null);
      }}
      onContextMenu={(e) => {
        if (!edit.onMenu) return;
        e.preventDefault();
        e.stopPropagation();
        edit.onMenu(b.id, e.clientX, e.clientY);
      }}
    >
      <span className="flow-grip" title="Drag to reorder">⠿</span>
      <Block b={b} assets={assets} showAnswers={showAnswers} />
    </div>
  );
}

/** Faint 12-column guide, only while editing. Never printed. */
function GridLines() {
  return (
    <div className="grid-lines" aria-hidden="true">
      {Array.from({ length: GRID_COLS - 1 }).map((_, i) => (
        <span key={i} style={{ insetInlineStart: `${((i + 1) / GRID_COLS) * 100}%` }} />
      ))}
    </div>
  );
}

export default function Sheet({ doc, themes, assets, showAnswers = false, edit }) {
  if (!doc) return null;
  const tokens = themes?.[doc.theme] || themes?.classic || {};

  const editCtx = React.useMemo(() => ({
    editable: Boolean(edit?.editable),
    sel: edit?.sel || { blockId: null, itemIndex: null },
    select: (blockId, itemIndex) => edit?.onSelect?.(blockId, itemIndex),
    patchItem: edit?.onPatchItem,
    moveItem: edit?.onMoveItem,
    openPicker: edit?.onOpenPicker,
    moveBlock: edit?.onMoveBlock,
    // For blocks nested inside a panel, which have no Moveable of their own.
    menu: edit?.onMenu,
    editBlock: edit?.onEditBlock,
  }), [edit]);

  return (
    <AssetContext.Provider value={assets || {}}>
      <EditContext.Provider value={editCtx}>
        <div className="sheet-stack">
          {doc.pages.map((p, i) => (
            <Page key={p.id} page={p} doc={doc} assets={assets} tokens={tokens}
                  showAnswers={showAnswers} first={i === 0} edit={edit} />
          ))}
        </div>
      </EditContext.Provider>
    </AssetContext.Provider>
  );
}
