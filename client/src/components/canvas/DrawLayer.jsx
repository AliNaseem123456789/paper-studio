import React, { useRef, useState } from 'react';
import ShapeSvg from '../blocks/Shape.jsx';

const MM_PER_PX = 25.4 / 96;
const MIN_MM = 2;

/**
 * Draw shapes with the cursor, and move the ones already drawn.
 *
 * Drawn shapes float above the page rather than sitting in the flow, so a
 * circle can go over a word on an exam paper without disturbing the layout.
 * Coordinates are millimetres from the top-left of the printable area, which
 * is what the page itself is measured in, so a shape prints where it looks.
 */
export default function DrawLayer({
  blocks, tool, editable, selectedId,
  onSelect, onDraw, onMove, onDelete,
}) {
  const ref = useRef(null);
  const [band, setBand] = useState(null);   // the rubber band while drawing
  const drag = useRef(null);
  const [live, setLive] = useState(null);   // a shape being moved or resized

  const toMm = (e) => {
    const r = ref.current.getBoundingClientRect();
    // getBoundingClientRect is in CSS px; the sheet may be zoomed, so scale
    // by the element's own ratio rather than assuming 96dpi.
    const scale = r.width / ref.current.offsetWidth || 1;
    return {
      x: ((e.clientX - r.left) / scale) * MM_PER_PX,
      y: ((e.clientY - r.top) / scale) * MM_PER_PX,
    };
  };

  /* ------------------------------------------------------------- drawing */

  function startDraw(e) {
    if (!tool) return;
    e.preventDefault();
    e.stopPropagation();
    const p = toMm(e);
    setBand({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    ref.current.setPointerCapture?.(e.pointerId);
  }

  function moveDraw(e) {
    if (band) {
      const p = toMm(e);
      setBand((b) => ({ ...b, x1: p.x, y1: p.y }));
      return;
    }
    if (drag.current) moveShape(e);
  }

  function endDraw(e) {
    if (band) {
      const { x0, y0, x1, y1 } = band;
      setBand(null);
      const w = Math.abs(x1 - x0);
      const h = Math.abs(y1 - y0);
      // A click rather than a drag: give a usable default instead of nothing.
      const tiny = w < MIN_MM && h < MIN_MM;
      onDraw({
        ox: Math.round(tiny ? x0 : Math.min(x0, x1)),
        oy: Math.round(tiny ? y0 : Math.min(y0, y1)),
        w: Math.max(MIN_MM, Math.round(tiny ? 40 : w)),
        h: Math.max(MIN_MM, Math.round(tiny ? 30 : h)),
        // Which way it was dragged. Only lines and arrows notice.
        flipX: x1 < x0,
        flipY: y1 < y0,
      });
      return;
    }
    endShape(e);
  }

  /* ------------------------------------------- moving an existing shape */

  const beginShape = (block, mode) => (e) => {
    if (tool) return;            // drawing takes priority
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(block.id, null);
    const p = toMm(e);
    drag.current = {
      mode, id: block.id, startX: p.x, startY: p.y,
      orig: { ...block.content },
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  function moveShape(e) {
    const d = drag.current;
    if (!d) return;
    const p = toMm(e);
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    const o = d.orig;

    const next = d.mode === 'move'
      ? { ox: Math.round(o.ox + dx), oy: Math.round(o.oy + dy) }
      : {
          w: Math.max(MIN_MM, Math.round(o.w + dx)),
          h: Math.max(MIN_MM, Math.round(o.h + dy)),
        };
    setLive({ id: d.id, ...next });
  }

  function endShape() {
    if (drag.current && live) onMove(live.id, live);
    drag.current = null;
    setLive(null);
  }

  /* -------------------------------------------------------------- render */

  const mm = (v) => `${v}mm`;

  return (
    <div
      ref={ref}
      className={`draw-layer${tool ? ' drawing' : ''}${editable ? ' editable' : ''}`}
      onPointerDown={startDraw}
      onPointerMove={moveDraw}
      onPointerUp={endDraw}
      onPointerCancel={() => { setBand(null); drag.current = null; setLive(null); }}
    >
      {blocks.map((b) => {
        const c = live?.id === b.id ? { ...b.content, ...live } : b.content;
        const selected = selectedId === b.id;
        return (
          <div
            key={b.id}
            className={`drawn${editable ? ' editable' : ''}${selected ? ' selected' : ''}`}
            style={{
              left: mm(c.ox), top: mm(c.oy),
              width: mm(c.w), height: mm(c.h),
              color: c.stroke || 'var(--accent)',
            }}
            onPointerDown={beginShape(b, 'move')}
            onPointerMove={moveShape}
            onPointerUp={endShape}
          >
            <ShapeSvg
              kind={c.kind} stroke={c.stroke} fill={c.fill}
              width={c.width} dashed={c.dashed}
              flipX={c.flipX} flipY={c.flipY}
            />
            {editable && selected && (
              <>
                <span
                  className="drawn-handle"
                  onPointerDown={beginShape(b, 'resize')}
                  onPointerMove={moveShape}
                  onPointerUp={endShape}
                />
                <span className="drawn-size">{Math.round(c.w)}×{Math.round(c.h)}mm</span>
              </>
            )}
          </div>
        );
      })}

      {band && (
        <div
          className="band"
          style={{
            left: mm(Math.min(band.x0, band.x1)),
            top: mm(Math.min(band.y0, band.y1)),
            width: mm(Math.abs(band.x1 - band.x0)),
            height: mm(Math.abs(band.y1 - band.y0)),
          }}
        >
          <ShapeSvg
            kind={tool} width={2}
            flipX={band.x1 < band.x0} flipY={band.y1 < band.y0}
          />
        </div>
      )}
    </div>
  );
}
