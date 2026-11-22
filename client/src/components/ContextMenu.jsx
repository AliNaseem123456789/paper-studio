import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * The right-click menu for a block on the sheet.
 *
 * Everything here is also reachable from the Layout panel; this is the same
 * set of actions where the hand already is. Items come in as a flat list,
 * with `null` for a separator and an optional `items` array for a submenu
 * (used for "Move to page").
 */
export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });
  const [openSub, setOpenSub] = useState(null);

  // Keep the menu on screen when it is opened near an edge.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - r.width - 8),
      y: Math.min(y, window.innerHeight - r.height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    const away = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    // `capture` so the menu closes before the click lands on the page.
    document.addEventListener('mousedown', away, true);
    document.addEventListener('keydown', key);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('mousedown', away, true);
      document.removeEventListener('keydown', key);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  const run = (it) => {
    if (it.disabled) return;
    it.onClick?.();
    onClose();
  };

  return (
    <div className="ctx" ref={ref} style={{ left: pos.x, top: pos.y }} role="menu">
      {items.filter(Boolean).map((it, i) => (
        it === 'sep' ? <div key={i} className="ctx-sep" /> : (
          <div
            key={i}
            className={`ctx-item${it.disabled ? ' off' : ''}${it.danger ? ' danger' : ''}`}
            onMouseEnter={() => setOpenSub(it.items ? i : null)}
            onClick={() => (it.items ? null : run(it))}
            role="menuitem"
          >
            <span className="ctx-label">{it.label}</span>
            {it.hint && <span className="ctx-hint">{it.hint}</span>}
            {it.items && <span className="ctx-hint">›</span>}

            {it.items && openSub === i && (
              <div className="ctx ctx-sub">
                {it.items.map((s, j) => (
                  <div
                    key={j}
                    className={`ctx-item${s.disabled ? ' off' : ''}`}
                    onClick={(e) => { e.stopPropagation(); run(s); }}
                  >
                    <span className="ctx-label">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      ))}
    </div>
  );
}
