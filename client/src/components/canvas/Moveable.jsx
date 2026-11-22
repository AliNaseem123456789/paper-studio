import React, { useCallback, useEffect, useRef, useState } from 'react';

export const GRID_COLS = 12;
export const GRID_ROW_MM = 11;

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_W = 1;
const MIN_H = 1;

const snap = (v, fine) => (fine ? Math.round(v * 2) / 2 : Math.round(v));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Drag + resize for one canvas block.
 *
 * Positions stay in grid units throughout -- the pointer delta is converted to
 * grid units immediately, so the block lands on the same cell at any zoom and
 * the document never stores pixels.
 */
export default function Moveable({
  block, selected, editable, onSelect, onChange, onDelete, onMenu, rtl, children,
}) {
  const ref = useRef(null);
  const drag = useRef(null);
  const [live, setLive] = useState(null); // { x, y, w, h } while dragging

  const b = live || block;

  /** Size of one grid unit in px, measured from the parent each time. */
  const unit = useCallback(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return { ux: 1, uy: 1 };
    const r = parent.getBoundingClientRect();
    return { ux: r.width / GRID_COLS, uy: r.height / rowsFor(parent) };
  }, []);

  function rowsFor(parent) {
    // The grid page is sized in mm; derive rows from its measured height so
    // the unit stays correct under browser zoom.
    const h = parent.getBoundingClientRect().height;
    const mmPx = h / parseFloat(getComputedStyle(parent).minHeight || h) || 1;
    return h / (GRID_ROW_MM * (mmPx || 1)) || 24;
  }

  const begin = (mode) => (e) => {
    if (!editable) return;
    /* Anything inside the block that is a target in its own right -- a
       nested block, a piece of editable text, a picture -- handles its own
       pointer. Starting a drag here would preventDefault and the click and
       double-click would never arrive. The block still drags by its
       heading, its padding and its handles. */
    if (mode === 'move' && e.target?.closest?.('.blk-pick, .editable-text, .pickable')) {
      /* A nested block selects itself on click; anything else inside this
         one (its own title, its picture) still selects this block, it just
         does not start a drag. */
      if (!e.target.closest('.blk-pick')) onSelect?.(block.id);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(block.id);

    const { ux, uy } = unit();
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      ux, uy,
      orig: { x: block.x, y: block.y, w: block.w, h: block.h },
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const move = (e) => {
    const d = drag.current;
    if (!d) return;

    const fine = e.shiftKey;
    const sign = rtl ? -1 : 1;
    const dx = ((e.clientX - d.startX) / d.ux) * sign;
    const dy = (e.clientY - d.startY) / d.uy;
    const o = d.orig;
    let { x, y, w, h } = o;

    if (d.mode === 'move') {
      x = clamp(snap(o.x + dx, fine), 0, GRID_COLS - o.w);
      y = Math.max(0, snap(o.y + dy, fine));
    } else {
      const m = d.mode;
      if (m.includes('e')) w = clamp(snap(o.w + dx, fine), MIN_W, GRID_COLS - o.x);
      if (m.includes('s')) h = Math.max(MIN_H, snap(o.h + dy, fine));
      if (m.includes('w')) {
        const nx = clamp(snap(o.x + dx, fine), 0, o.x + o.w - MIN_W);
        w = o.w + (o.x - nx);
        x = nx;
      }
      if (m.includes('n')) {
        const ny = clamp(snap(o.y + dy, fine), 0, o.y + o.h - MIN_H);
        h = o.h + (o.y - ny);
        y = ny;
      }
    }
    setLive({ x, y, w, h });
  };

  const end = () => {
    if (drag.current && live) onChange?.(block.id, live);
    drag.current = null;
    setLive(null);
  };

  // Keyboard nudge and delete while selected.
  useEffect(() => {
    if (!selected || !editable) return;
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const step = e.shiftKey ? 0.5 : 1;
      const map = {
        ArrowLeft:  { x: block.x - step },
        ArrowRight: { x: block.x + step },
        ArrowUp:    { y: block.y - step },
        ArrowDown:  { y: block.y + step },
      };
      if (map[e.key]) {
        e.preventDefault();
        const patch = map[e.key];
        if (patch.x != null) patch.x = clamp(patch.x, 0, GRID_COLS - block.w);
        if (patch.y != null) patch.y = Math.max(0, patch.y);
        onChange?.(block.id, patch);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.(block.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, editable, block, onChange, onDelete]);

  return (
    <div
      ref={ref}
      data-block={block.id}
      data-rows={b.h}
      onContextMenu={(e) => {
        if (!editable || !onMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onMenu(block.id, e.clientX, e.clientY);
      }}
      className={`grid-cell${editable ? ' editable' : ''}${selected ? ' selected' : ''}`}
      style={{
        insetInlineStart: `${(b.x / GRID_COLS) * 100}%`,
        top: `${b.y * GRID_ROW_MM}mm`,
        width: `${(b.w / GRID_COLS) * 100}%`,
        height: `${b.h * GRID_ROW_MM}mm`,
        /* Enough to lift the selected block over its neighbours, and well
           under the modal layer -- a big number here put the selection on
           top of the asset picker, so its buttons could not be clicked. */
        zIndex: (selected ? 30 : 0) + (block.z || 0),
      }}
      onPointerDown={begin('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {children}

      {editable && selected && (
        <>
          {HANDLES.map((h) => (
            <span
              key={h}
              className={`mv-handle mv-${h}`}
              onPointerDown={begin(h)}
              onPointerMove={move}
              onPointerUp={end}
            />
          ))}
          <span className="mv-size">
            {b.w}×{b.h}
          </span>
        </>
      )}
    </div>
  );
}
