import { apiFetch, apiUrl } from '../lib/api.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Browse the library, upload your own artwork, or generate one.
 * Returns a slug, never a file — so swapping a picture never disturbs the
 * block's position, size or crop.
 */
export default function AssetPicker({ onPick, onClose, onLibraryChange }) {
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('library');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const fileRef = useRef(null);

  async function load() {
    try {
      const r = await apiFetch('/api/assets');
      const b = await r.json();
      setAll(b.assets || []);
      onLibraryChange?.(b.assets || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const hit = term
      ? all.filter((a) => a.id.includes(term) || (a.label || '').toLowerCase().includes(term))
      : all;
    const g = {};
    for (const a of hit) (g[a.group || 'custom'] ||= []).push(a);
    return g;
  }, [all, q]);

  async function upload(files) {
    if (!files?.length) return;
    setBusy(true); setError('');
    try {
      const form = new FormData();
      Array.from(files).slice(0, 40).forEach((f) => form.append('files', f));
      form.append('group', 'custom');
      const r = await apiFetch('/api/assets', { method: 'POST', body: form });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || 'Upload failed');
      await load();
      setTab('library');
      if (b.added?.[0]) onPick?.(b.added[0].id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!prompt.trim()) return;
    setBusy(true); setError('');
    try {
      const r = await apiFetch('/api/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || 'Generation failed');
      await load();
      onPick?.(b.asset.id);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id, e) {
    e.stopPropagation();
    await apiFetch(`/api/assets/${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="usage-overlay" onClick={onClose}>
      <div className="usage-modal picker" onClick={(e) => e.stopPropagation()}>
        <div className="usage-head">
          <h2>Choose a picture</h2>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>

        <div className="tabs" style={{ marginBottom: 12 }}>
          {[['library', 'Library'], ['upload', 'Upload'], ['ai', 'Generate']].map(([id, label]) => (
            <button key={id} className={tab === id ? 'tab on' : 'tab'} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="banner error" style={{ margin: '0 0 10px' }}>{error}</div>}

        {tab === 'library' && (
          <>
            <input
              placeholder="Search — lion, pencil, train…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <div className="picker-scroll">
              {Object.entries(groups).map(([g, items]) => (
                <div key={g}>
                  <h3 className="panel-title">{g}</h3>
                  <div className="asset-grid">
                    {items.map((a) => (
                      <button
                        key={a.id}
                        className="asset-cell"
                        title={a.id}
                        onClick={() => { onPick?.(a.id); onClose?.(); }}
                      >
                        {a.url
                          ? <img src={apiUrl(a.url)} alt={a.label} />
                          : <span className="cell-glyph">{a.glyph}</span>}
                        <span className="cell-label">{a.label}</span>
                        {a.kind !== 'builtin' && (
                          <span className="cell-del" onClick={(e) => remove(a.id, e)}>×</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!Object.keys(groups).length && <p className="muted">Nothing matches “{q}”.</p>}
            </div>
          </>
        )}

        {tab === 'upload' && (
          <div
            className="dropzone"
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
                   onChange={(e) => upload(e.target.files)} />
            <div className="dz-icon">🖼️</div>
            <p className="dz-main">{busy ? 'Uploading…' : 'Drop your artwork here'}</p>
            <p className="dz-sub">
              PNG or SVG exported from Figma or Canva. Up to 40 at once.<br />
              Each becomes a slug the assistant can use by name.
            </p>
          </div>
        )}

        {tab === 'ai' && (
          <div>
            <label className="full">
              Describe the picture
              <input
                placeholder="a friendly duck wearing a hat"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
              />
            </label>
            <p className="hint">
              Drawn in a children's-worksheet style and saved to your library,
              so you only pay for it once. Pictures cost far more than text —
              check the Usage panel.
            </p>
            <button className="primary" disabled={busy || !prompt.trim()} onClick={generate}>
              {busy ? 'Drawing…' : 'Generate and add to library'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
