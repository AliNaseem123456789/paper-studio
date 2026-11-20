import { apiFetch } from '../lib/api.js';
import React, { useEffect, useState } from 'react';
import { BORDER_PATTERNS, ICON_SETS, tileUrl } from './blocks/borders.jsx';

/* Thirty-odd borders in one flat row is unusable, so they are grouped and
   each one previews itself rather than relying on its name. */
const BORDER_GROUPS = [
  { label: 'Plain', ids: ['none', 'hairline', 'double', 'corners', 'frame'] },
  { label: 'Patterns', ids: Object.keys(BORDER_PATTERNS) },
  { label: 'Pictures', ids: Object.keys(ICON_SETS).map(
      (s) => (s === 'school' ? 'icons' : `icons:${s}`)) },
];

function BorderSwatch({ id, color }) {
  if (BORDER_PATTERNS[id]) {
    return (
      <span
        className="bsw-art"
        style={{
          backgroundImage: tileUrl(id, color),
          backgroundSize: '18px 18px',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
        }}
      />
    );
  }
  if (id === 'icons' || id.startsWith('icons:')) {
    const set = ICON_SETS[id.split(':')[1] || 'school'] || [];
    return <span className="bsw-art emoji">{set.slice(0, 3).join('')}</span>;
  }
  return <span className={`bsw-art rule ${id}`} />;
}

/** Theme, border and template switching. None of it touches content. */
export default function DesignPanel({ doc, setDoc, themes, borders }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    apiFetch('/api/templates')
      .then((r) => r.json())
      .then((b) => setTemplates(b.list || []))
      .catch(() => {});
  }, []);

  if (!doc) return null;

  const setTheme = (id) => setDoc((d) => ({ ...d, theme: id }));

  // Border lives in the theme, so overriding it is a per-document override
  // layered on top rather than an edit to the theme itself.
  const setBorder = (b) =>
    setDoc((d) => ({ ...d, overrides: { ...(d.overrides || {}), border: b } }));

  async function applyTemplate(id) {
    const res = await apiFetch(`/api/templates/${id}`);
    const body = await res.json();
    if (!res.ok) return;
    // Keep the teacher's content; take the template's look and page setup.
    setDoc((d) => ({
      ...body.doc,
      meta: d.meta,
      pages: d.pages?.length && d.pages[0].blocks.length
        ? d.pages.map((p, i) => ({
            ...p,
            mode: body.doc.pages[i]?.mode || p.mode,
          }))
        : body.doc.pages,
    }));
  }

  const currentBorder = doc.overrides?.border
    || themes?.[doc.theme]?.border
    || 'hairline';

  return (
    <div className="panel">
      <h2 className="panel-title">Theme</h2>
      <div className="theme-grid">
        {Object.entries(themes || {}).map(([id, t]) => (
          <button
            key={id}
            className={doc.theme === id ? 'theme-chip on' : 'theme-chip'}
            onClick={() => setTheme(id)}
            title={id}
          >
            <span className="theme-swatch">
              <i style={{ background: t.accent }} />
              <i style={{ background: t.accent2 }} />
              <i style={{ background: t.paper, border: '1px solid #ddd' }} />
            </span>
            <span className="theme-name">{id}</span>
          </button>
        ))}
      </div>

      <h2 className="panel-title">Border</h2>
      {BORDER_GROUPS.map((g) => (
        <div className="bsw-group" key={g.label}>
          <div className="bsw-label">{g.label}</div>
          <div className="bsw-grid">
            {g.ids.map((id) => (
              <button
                key={id}
                className={currentBorder === id ? 'bsw on' : 'bsw'}
                onClick={() => setBorder(id)}
                title={borders?.[id] || id}
              >
                <BorderSwatch id={id} color={themes?.[doc.theme]?.borderColor
                                            || themes?.[doc.theme]?.accent || '#2b2b2b'} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="hint">
        Patterns take the theme's colour and print sharp at any size. Picture
        borders use emoji, so they print in colour on a colour printer.
      </p>

      <h2 className="panel-title">Template</h2>
      <div className="tpl-list">
        {templates.map((t) => (
          <button
            key={t.id}
            className={doc.template === t.id ? 'tpl on' : 'tpl'}
            onClick={() => applyTemplate(t.id)}
          >
            <span className="tpl-name">{t.name}</span>
            <span className="tpl-hint">{t.hint}</span>
          </button>
        ))}
      </div>

      <h2 className="panel-title">Page</h2>
      <div className="chip-row">
        {['flow', 'canvas'].map((m) => (
          <button
            key={m}
            className={doc.pages?.[0]?.mode === m ? 'chip on' : 'chip'}
            onClick={() =>
              setDoc((d) => ({
                ...d,
                pages: d.pages.map((p, i) => (i === 0 ? { ...p, mode: m } : p)),
              }))
            }
          >
            {m === 'flow' ? 'Flow (exam)' : 'Grid (syllabus)'}
          </button>
        ))}
      </div>
      <p className="hint">
        Flow pages reflow and paginate on their own. Grid pages hold blocks in
        fixed positions — right for posters, wrong for a growing question list.
      </p>
    </div>
  );
}
