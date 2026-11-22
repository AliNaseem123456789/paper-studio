import { apiFetch } from './lib/api.js';
import ContextMenu from './components/ContextMenu.jsx';
import { SPOT_IDS, SPOTS } from './components/blocks/spots.jsx';
import { exportSheets } from './lib/exportImage.js';
import React, { useEffect, useRef, useState } from 'react';
import Composer from './components/Composer.jsx';
import Editor from './components/Editor.jsx';
import Sheet from './components/Sheet.jsx';
import DesignPanel from './components/DesignPanel.jsx';
import Inspector from './components/Inspector.jsx';
import AssetPicker from './components/AssetPicker.jsx';
import UrduKeyboard from './components/UrduKeyboard.jsx';
import { pendingPictures, distinctPrompts, applyFill, USD_PER_PICTURE }
  from './lib/pending.js';
import Chat from './components/Chat.jsx';
import UsagePanel from './components/UsagePanel.jsx';

const SETTINGS_KEY = 'paper-studio:settings';
const DOC_KEY = 'paper-studio:doc';
const SYL_KEY = 'paper-studio:syllabus';
const MODE_KEY = 'paper-studio:mode';
const VIEW_KEY = 'paper-studio:view';
const docKey = (mode) => (mode === 'syllabus' ? SYL_KEY : DOC_KEY);

const DEFAULT_SETTINGS = {
  school: 'Al-Sehr Academy',
  term: 'Mid Term Examination 2026',
  class: 'Nursery',
  subject: 'Urdu',
  totalMarks: '50',
  duration: '1 hour',
  language: 'mixed',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/* A document restored from localStorage has not been through the server's
   normaliser, so a block can arrive without an id. Selection and every block
   patch key off that id, so backfill before anything touches the document. */
let idSeq = 0;
function withId(b, path) {
  const out = { ...b, id: b.id || `${path}-${(idSeq++).toString(36)}` };
  // Section panels hold blocks of their own; those need ids too, or React
  // keys collide and the inspector cannot address them.
  if (out.content?.blocks) {
    out.content = {
      ...out.content,
      blocks: out.content.blocks.map((c, i) => withId(c, `${path}.${i}`)),
    };
  }
  return out;
}

function ensureIds(doc) {
  if (!doc?.pages) return doc;
  return {
    ...doc,
    pages: doc.pages.map((p, pi) => ({
      ...p,
      id: p.id || `p${pi}`,
      blocks: (p.blocks || []).map((b, bi) => withId(b, `b${pi}-${bi}`)),
    })),
  };
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode -- fine, we just lose the draft */
  }
}

export default function App() {
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [doc, setDoc] = useState(() => ensureIds(load(DOC_KEY, null)));
  const [syllabus, setSyllabus] = useState(() => ensureIds(load(SYL_KEY, null)));
  const [assets, setAssets] = useState({});
  const [themes, setThemes] = useState(null);
  const [borders, setBorders] = useState(null);
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  // Remembered with the mode, so a reload comes back to the same tab.
  const [view, setView] = useState(() => load(VIEW_KEY, 'new'));
  useEffect(() => save(VIEW_KEY, view), [view]);
  /* 'paper' = the scan/describe builder, 'chat' = free-form assistant,
     'syllabus' = the poster editor. Remembered, so a reload in the middle
     of a syllabus comes back to the syllabus. */
  const [mode, setMode] = useState(() => load(MODE_KEY, 'paper'));
  useEffect(() => save(MODE_KEY, mode), [mode]);
  const [showUsage, setShowUsage] = useState(false);
  // Selection addresses a block, and optionally one item inside it, so each
  // picture in a question is its own target.
  const [sel, setSel] = useState({ blockId: null, itemIndex: null });
  const [picking, setPicking] = useState(null);
  /* The pop-up menu: the right-click one on a block, and the Save menu in
     the toolbar. Both are the same component -- `items` when the caller
     supplies its own list, `id` when it is a block's own menu. */
  const [menu, setMenu] = useState(null);
  const [saving, setSaving] = useState('');
  const [urduKb, setUrduKb] = useState(false);
  // Which shape the cursor draws, or null for the normal pointer.
  const [tool, setTool] = useState(null);
  const [filling, setFilling] = useState(false);
  const [fillNote, setFillNote] = useState('');
  // Off by default: pictures cost real money, so the first spend is a choice.
  const [autoDraw, setAutoDraw] = useState(() => load('paper-studio:autodraw', false));
  useEffect(() => save('paper-studio:autodraw', autoDraw), [autoDraw]);
  const drawing = useRef(false);
  const select = (blockId, itemIndex = null) => setSel({ blockId, itemIndex });
  const [usageKey, setUsageKey] = useState(0);
  const bumpUsage = () => setUsageKey((k) => k + 1);

  useEffect(() => save(SETTINGS_KEY, settings), [settings]);
  useEffect(() => { if (doc) save(DOC_KEY, doc); }, [doc]);
  useEffect(() => { if (syllabus) save(SYL_KEY, syllabus); }, [syllabus]);

  /** Switching mode swaps which document the whole editor is pointed at. */
  function switchMode(next) {
    setMode(next);
    setSel({ blockId: null, itemIndex: null });
    setTool(null);
    if (next === 'syllabus' && !syllabus) loadSyllabusTemplate();
  }

  /**
   * Start a syllabus from a template. Unlike the Design tab -- which keeps
   * the teacher's content and changes only the look -- this takes the
   * template's blocks, because for a syllabus the arrangement IS the thing
   * being chosen.
   */
  async function loadSyllabusTemplate(id = 'syllabus-alsehar') {
    try {
      const res = await apiFetch(`/api/templates/${id}`);
      const body = await res.json();
      if (res.ok) { setSyllabus(ensureIds(body.doc)); setView('layout'); }
    } catch { /* the Create tab still works */ }
  }

  // The whole library, fetched once. Documents reference assets by slug, so
  // this is what turns "animal.lion" into something drawable.
  useEffect(() => {
    apiFetch('/api/assets')
      .then((r) => r.json())
      .then((b) => {
        const map = {};
        for (const a of b.assets || []) map[a.id] = a;
        setAssets((cur) => ({ ...map, ...cur }));
      })
      .catch(() => {});
  }, []);

  // Escape drops the drawing tool, as in any drawing app.
  useEffect(() => {
    if (!tool) return;
    const onKey = (e) => { if (e.key === 'Escape') setTool(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  useEffect(() => {
    apiFetch('/api/themes')
      .then((r) => r.json())
      .then((b) => { setThemes(b.tokens); setBorders(b.borders); })
      .catch(() => {});
  }, []);

  /* Papers and Syllabus are separate documents kept in separate storage, so
     switching between them never clobbers either. Everything below is
     written against `active` so one editor serves both. */
  const active = mode === 'syllabus' ? syllabus : doc;
  const setActive = mode === 'syllabus' ? setSyllabus : setDoc;

  // A per-document border override is layered over the theme's own token.
  const tokens = themes && active
    ? { ...(themes[active.theme] || themes.classic), ...(active.overrides || {}) }
    : null;

  async function generate({ files, idea }) {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      files.forEach((f) => form.append('images', f));
      form.append('settings', JSON.stringify(settings));
      form.append('idea', idea || '');
      form.append('kind', mode === 'syllabus' ? 'syllabus' : 'exam');

      const res = await apiFetch('/api/generate', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Something went wrong');

      setActive(body.doc);
      setAssets((a) => ({ ...a, ...(body.assets || {}) })); // merge, never replace
      setMeta(body.meta);
      setView('edit');
      bumpUsage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function revise(instruction) {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc: active, instruction }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Revision failed');
      setActive(body.doc);
      setAssets((a) => ({ ...a, ...(body.assets || {}) }));
      setMeta(body.meta);
      bumpUsage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Run `fn` over the one block with this id, wherever it sits. Syllabus
   * panels are sections that carry their own child blocks, so a plain
   * `pages[].blocks.map` cannot see a picture inside a panel.
   */
  const mapBlock = (blocks, id, fn) => blocks.map((b) => {
    if (b.id === id) return fn(b);
    if (Array.isArray(b.content?.blocks)) {
      return { ...b, content: { ...b.content, blocks: mapBlock(b.content.blocks, id, fn) } };
    }
    return b;
  });

  const editBlock = (id, fn) =>
    setActive((d) => ({
      ...d,
      pages: d.pages.map((pg) => ({ ...pg, blocks: mapBlock(pg.blocks, id, fn) })),
    }));

  /** Move/resize committed by the canvas. */
  const patchBlock = (id, p) => editBlock(id, (b) => ({ ...b, ...p }));

  /** Write into one item of one block's content. */
  const patchItem = (blockId, index, p) =>
    editBlock(blockId, (b) => {
      const key = b.content.items ? 'items' : b.content.left ? 'left' : null;
      if (!key) return b;
      const items = [...b.content[key]];
      items[index] = { ...items[index], ...p };
      return { ...b, content: { ...b.content, [key]: items } };
    });

  /** Reorder pictures inside one question. */
  const moveItem = (blockId, from, to) =>
    editBlock(blockId, (b) => {
      const key = b.content.items ? 'items' : b.content.left ? 'left' : null;
      if (!key) return b;
      const items = [...b.content[key]];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...b, content: { ...b.content, [key]: items } };
    });

  /** Reorder blocks on a flow page. */
  const moveBlock = (from, to) =>
    setActive((d) => {
      const pages = [...d.pages];
      const blocks = [...pages[0].blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(from < to ? to - 1 : to, 0, moved);
      pages[0] = { ...pages[0], blocks };
      return { ...d, pages };
    });

  /** A shape drawn on the page. It floats above the content as an overlay. */
  const drawShape = (geom) => {
    const id = `d${Date.now().toString(36)}`;
    setActive((d) => {
      const pages = [...d.pages];
      pages[0] = {
        ...pages[0],
        blocks: [...pages[0].blocks, {
          id, type: 'shape', style: {},
          content: {
            kind: tool, width: 2, dashed: false,
            stroke: '', fill: '', align: 'start',
            overlay: true, ...geom,
          },
        }],
      };
      return { ...d, pages };
    });
    setSel({ blockId: id, itemIndex: null });
    setTool(null);   // one shape per click of the tool, like Paint
  };

  const moveDrawn = (id, patch) =>
    setActive((d) => ({
      ...d,
      pages: d.pages.map((pg) => ({
        ...pg,
        blocks: pg.blocks.map((b) =>
          b.id === id ? { ...b, content: { ...b.content, ...patch } } : b),
      })),
    }));

  /** Remove a block from wherever it is, including inside a panel. */
  const deleteBlock = (id) => {
    const drop = (blocks) => blocks
      .filter((b) => b.id !== id)
      .map((b) => (Array.isArray(b.content?.blocks)
        ? { ...b, content: { ...b.content, blocks: drop(b.content.blocks) } }
        : b));
    setActive((d) => ({ ...d, pages: d.pages.map((pg) => ({ ...pg, blocks: drop(pg.blocks) })) }));
    setSel({ blockId: null, itemIndex: null });
  };

  /* ------------------------------------------------- right-click actions
     The same edits the Layout panel offers, reachable where the pointer
     already is. They work on any page, not just the first. */

  /** Find a block by id, including blocks nested inside a panel. */
  const findBlock = (id) => {
    const dig = (blocks) => {
      for (const b of blocks) {
        if (b.id === id) return b;
        if (Array.isArray(b.content?.blocks)) {
          const hit = dig(b.content.blocks);
          if (hit) return hit;
        }
      }
      return null;
    };
    for (let i = 0; i < (active?.pages.length || 0); i += 1) {
      const top = active.pages[i].blocks.find((x) => x.id === id);
      if (top) return { block: top, pageIndex: i, top: true };
      const nested = dig(active.pages[i].blocks);
      if (nested) return { block: nested, pageIndex: i, top: false };
    }
    return { block: null, pageIndex: -1, top: false };
  };

  const duplicateBlock = (id) => {
    const { block, pageIndex, top } = findBlock(id);
    if (!block) return;
    const copy = {
      ...structuredClone(block),
      id: `b${Date.now().toString(36)}`,
      // A free-floating block is offset so the copy is visibly its own
      // thing; one inside a panel just follows its original in the list.
      ...(top && active.pages[pageIndex].mode === 'canvas'
        ? { x: Math.min(block.x + 1, 11), y: block.y + 1 } : {}),
    };
    /* Insert right after the original, wherever that is. */
    const after = (blocks) => {
      const i = blocks.findIndex((b) => b.id === id);
      if (i >= 0) return [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
      return blocks.map((b) => (Array.isArray(b.content?.blocks)
        ? { ...b, content: { ...b.content, blocks: after(b.content.blocks) } }
        : b));
    };
    setActive((d) => ({
      ...d,
      pages: d.pages.map((pg, i) => (i === pageIndex ? { ...pg, blocks: after(pg.blocks) } : pg)),
    }));
    select(copy.id);
  };

  /** Front and back within a page, by the z used for stacking. */
  const orderBlock = (id, dir) => {
    const { pageIndex } = findBlock(id);
    if (pageIndex < 0) return;
    const zs = active.pages[pageIndex].blocks.map((b) => b.z || 0);
    const z = dir === 'front' ? Math.max(0, ...zs) + 1 : Math.min(0, ...zs) - 1;
    patchBlock(id, { z });
  };

  /** Step the block's type size, for a panel that needs to read bigger. */
  const sizeBlock = (id, by) => editBlock(id, (b) => {
    const now = b.style?.size || 10.5;
    return { ...b, style: { ...b.style, size: Math.round((now + by) * 10) / 10 } };
  });

  const moveBlockToPage = (id, to) => {
    setActive((d) => {
      const pages = d.pages.map((p) => ({ ...p, blocks: [...p.blocks] }));
      if (!pages[to]) return d;
      let moved = null;
      for (const p of pages) {
        const i = p.blocks.findIndex((b) => b.id === id);
        if (i >= 0) { [moved] = p.blocks.splice(i, 1); break; }
      }
      if (!moved) return d;
      const bottom = pages[to].blocks.reduce(
        (m, b) => Math.max(m, (b.y || 0) + (b.h || 0)), 0);
      pages[to].blocks.push({ ...moved, y: bottom });
      return { ...d, pages };
    });
  };

  /* ------------------------------------------------------------ saving
     Print still gives the PDF for the photocopier. Pictures are for
     sharing: a syllabus goes to parents on WhatsApp far more often than it
     goes through a printer, and a PDF is awkward there. */

  async function saveImages(format, scale) {
    const name = (mode === 'syllabus' ? 'syllabus' : (meta?.subject || 'paper'))
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sheet';
    try {
      await exportSheets({
        format,
        scale,
        name,
        onProgress: (n, total) => setSaving(
          total > 1 ? `Saving ${n} of ${total}…` : 'Saving…'),
      });
    } catch (e) {
      setError(`Could not save the picture: ${e.message}`);
    } finally {
      setSaving('');
    }
  }

  const saveItems = () => [
    { label: 'Print or save as PDF', hint: 'Ctrl+P', onClick: () => window.print() },
    'sep',
    { label: 'Save as JPG', hint: 'one per page', onClick: () => saveImages('jpeg', 2) },
    { label: 'Save as PNG', hint: 'sharper edges', onClick: () => saveImages('png', 2) },
    {
      label: 'Save as JPG, extra large',
      hint: 'for printing',
      onClick: () => saveImages('jpeg', 3),
    },
  ];

  /** Build the menu for whichever block was right-clicked. */
  function menuItems(id) {
    const { block, pageIndex, top } = findBlock(id);
    if (!block) return [];
    const canvas = active.pages[pageIndex]?.mode === 'canvas' && top;
    const text = block.content?.title || block.content?.text
      || block.content?.school || '';

    /* Pictures, where the block has one. A panel's picture is one of the
       drawn spots; an image block takes anything from the library. */
    const pictures = [];
    if (block.type === 'image') {
      pictures.push({
        label: block.content.assetId ? 'Replace picture…' : 'Choose picture…',
        onClick: () => setPicking({ blockId: id }),
      });
    }
    if (block.type === 'masthead') {
      pictures.push({
        label: 'Replace monogram…',
        onClick: () => setPicking({ blockId: id, field: 'monogramAssetId' }),
      });
    }
    if (block.type === 'section') {
      pictures.push({
        label: 'Panel picture',
        items: [
          { label: 'Upload your own…', onClick: () => setPicking({ blockId: id }) },
          { label: 'None', onClick: () => editBlock(id, (b) => ({
            ...b, content: { ...b.content, spot: '', assetId: '', generate: '' } })) },
          ...SPOT_IDS.map((sid) => ({
            label: SPOTS[sid].name,
            disabled: !block.content.assetId && block.content.spot === sid,
            // Choosing a drawn one puts aside any uploaded picture.
            onClick: () => editBlock(id, (b) => ({
              ...b, content: { ...b.content, spot: sid, assetId: '', generate: '' } })),
          })),
        ],
      });
    }

    return [
      ...pictures,
      pictures.length ? 'sep' : null,
      { label: 'Duplicate', hint: 'Ctrl+D', onClick: () => duplicateBlock(id) },
      { label: 'Delete', hint: 'Del', danger: true, onClick: () => deleteBlock(id) },
      'sep',
      { label: 'Bigger text', onClick: () => sizeBlock(id, 1) },
      { label: 'Smaller text', onClick: () => sizeBlock(id, -1) },
      canvas ? 'sep' : null,
      canvas ? { label: 'Bring to front', onClick: () => orderBlock(id, 'front') } : null,
      canvas ? { label: 'Send to back', onClick: () => orderBlock(id, 'back') } : null,
      canvas && active.pages.length > 1 ? {
        label: 'Move to page',
        items: active.pages.map((_, i) => ({
          label: `Page ${i + 1}`,
          disabled: i === pageIndex,
          onClick: () => moveBlockToPage(id, i),
        })),
      } : null,
      text ? 'sep' : null,
      text ? {
        label: 'Copy text',
        onClick: () => navigator.clipboard?.writeText(text).catch(() => {}),
      } : null,
    ].filter(Boolean);
  }

  const mergeLibrary = (list) =>
    setAssets((cur) => {
      const next = { ...cur };
      for (const a of list) next[a.id] = a;
      return next;
    });

  /* Pictures the model asked for but the library could not supply. */
  const pending = active ? pendingPictures(active) : [];
  const pendingPrompts = distinctPrompts(pending);

  async function fillPictures() {
    if (!pendingPrompts.length) return;
    setFilling(true);
    setError('');
    setFillNote('');
    try {
      const res = await apiFetch('/api/assets/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: pendingPrompts }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not draw the pictures');

      setAssets((a) => ({ ...a, ...(body.assets || {}) }));
      setActive((d) => applyFill(d, pendingPictures(d), body.map));
      bumpUsage();

      const bits = [];
      if (body.drawn) bits.push(`${body.drawn} drawn`);
      if (body.reused) bits.push(`${body.reused} reused from the library`);
      if (body.usd) bits.push(`$${body.usd.toFixed(4)}`);
      const failed = Object.keys(body.failed || {});
      if (failed.length) bits.push(`${failed.length} failed`);
      setFillNote(bits.join(' · '));
    } catch (err) {
      setError(err.message);
    } finally {
      setFilling(false);
    }
  }

  useEffect(() => {
    if (!autoDraw || filling || drawing.current || !pendingPrompts.length) return;
    drawing.current = true;
    fillPictures().finally(() => { drawing.current = false; });
    // Depending on the count rather than the array keeps this from
    // re-running on every unrelated document edit.
  }, [autoDraw, pendingPrompts.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  function startNew() {
    setActive(null);
    /* The library stays. Documents reference assets by slug, so keeping the
       map costs nothing and clearing it left the monogram and every emoji
       unresolved until the next reload. */
    setMeta(null);
    setView('new');
    setSel({ blockId: null, itemIndex: null });
    try { localStorage.removeItem(docKey(mode)); } catch { /* ignore */ }
  }

  return (
    <div className={`app${urduKb ? ' kb-open' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">📝</span>
          <div>
            <strong>Paper Studio</strong>
            <span className="brand-sub">Al-Sehr Academy</span>
          </div>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Mode">
          {[['paper', '📄 Papers'], ['syllabus', '📋 Syllabus'],
            ['chat', '💬 Assistant']].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              className={mode === id ? 'mode on' : 'mode'}
              onClick={() => switchMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="topbar-actions">
          <button
            className={urduKb ? 'ghost on' : 'ghost'}
            onClick={() => setUrduKb((v) => !v)}
            title="On-screen Urdu keyboard"
          >
            ⌨ اردو
          </button>
          <button className="ghost" onClick={() => setShowUsage(true)} title="Token usage">
            📊 Usage
          </button>
          {mode !== 'chat' && active && (
            <>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                />
                Answer key
              </label>
              <button className="ghost" onClick={startNew}>New</button>
              <div className="save-menu">
                <button
                  className="primary small"
                  disabled={Boolean(saving)}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setMenu({
                      x: r.right - 190, y: r.bottom + 4, items: saveItems(),
                    });
                  }}
                >
                  {saving || 'Save or print ▾'}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="banner error" role="alert">
          {error}
          <button className="link-btn" onClick={() => setError('')}>dismiss</button>
        </div>
      )}

      {active && pendingPrompts.length > 0 && (
        <div className="banner draw-offer">
          <span>
            <strong>{pendingPrompts.length} picture
            {pendingPrompts.length === 1 ? '' : 's'}</strong> still to draw
            {pending.length > pendingPrompts.length &&
              ` (${pending.length} slots, some repeat)`}
            {' '}— about ${(pendingPrompts.length * USD_PER_PICTURE).toFixed(2)}.
          </span>
          <span className="offer-actions">
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoDraw}
                onChange={(e) => setAutoDraw(e.target.checked)}
              />
              Always
            </label>
            <button className="primary small" disabled={filling} onClick={fillPictures}>
              {filling ? 'Drawing…' : 'Draw them'}
            </button>
          </span>
        </div>
      )}

      {fillNote && (
        <div className="banner info">
          Pictures: {fillNote}
          <button className="link-btn" onClick={() => setFillNote('')}>dismiss</button>
        </div>
      )}

      {meta && (
        <div className="banner info">
          Read in {meta.seconds}s with {meta.model} · {meta.inTok} in / {meta.outTok} out
          {meta.usd != null && ` · $${meta.usd.toFixed(4)}`}
        </div>
      )}

      {showUsage && (
        <UsagePanel refreshKey={usageKey} onClose={() => setShowUsage(false)} />
      )}

      {urduKb && <UrduKeyboard onClose={() => setUrduKb(false)} />}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items || menuItems(menu.id)}
          onClose={() => setMenu(null)}
        />
      )}

      {picking && (
        <AssetPicker
          onClose={() => setPicking(null)}
          onLibraryChange={mergeLibrary}
          onPick={(assetId) => {
            if (picking.rows) {
              /* A picture-row carries its own picture, so it is indexed
                 like a question's slots but lives under `rows`. */
              editBlock(picking.blockId, (b) => ({
                ...b,
                content: {
                  ...b.content,
                  rows: b.content.rows.map((r, i) => (i === picking.index
                    ? { ...r, assetId, generate: '', spot: '' } : r)),
                },
              }));
              setPicking(null);
            } else if (picking.index != null) {
              patchItem(picking.blockId, picking.index, { assetId, generate: '' });
            } else if (picking.blockId) {
              /* `field` lets a block hold more than one picture: the masthead
                 stores the school monogram in `monogramAssetId`, so writing
                 to the default `assetId` would leave it untouched. */
              const field = picking.field || 'assetId';
              editBlock(picking.blockId, (b) => ({
                ...b,
                content: { ...b.content, [field]: assetId, generate: '' },
              }));
              setPicking(null); // one slot, one choice
            }
          }}
        />
      )}

      {mode === 'chat' ? (
        <main className="chat-layout">
          <Chat onUsage={bumpUsage} />
        </main>
      ) : (
      <main className="layout">
        <aside className="side">
          {active && (
            <div className="tabs" style={{ marginBottom: 12 }}>
              {[['new', 'Create'], ['edit', 'Content'],
                ['layout', 'Layout'], ['design', 'Design']].map(([v, label]) => (
                <button
                  key={v}
                  className={view === v ? 'tab on' : 'tab'}
                  onClick={() => setView(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {view === 'design' && active ? (
            <DesignPanel doc={active} setDoc={setActive} themes={themes} borders={borders} />
          ) : view === 'layout' && active ? (
            <Inspector
              doc={active}
              setDoc={setActive}
              sel={sel}
              onSelect={select}
              onPatchItem={patchItem}
              onLibrary={mergeLibrary}
              onOpenPicker={setPicking}
              tool={tool}
              onTool={setTool}
              onStartTemplate={mode === 'syllabus' ? loadSyllabusTemplate : undefined}
            />
          ) : view === 'edit' && active ? (
            <Editor doc={active} setDoc={setActive} onRevise={revise} busy={busy} />
          ) : (
            <Composer
              settings={settings}
              setSettings={setSettings}
              onGenerate={generate}
              busy={busy}
            />
          )}
        </aside>

        <section className="stage">
          {active && tokens ? (
            <div className="print-root">
              <Sheet
                doc={{ ...active, _tokens: tokens }}
                themes={{ [active.theme]: tokens }}
                assets={assets}
                showAnswers={showAnswers}
                edit={{
                  editable: view === 'layout',
                  sel,
                  onSelect: select,
                  onChange: patchBlock,
                  onDelete: deleteBlock,
                  onPatchItem: patchItem,
                  onMoveItem: moveItem,
                  onMoveBlock: moveBlock,
                  onOpenPicker: setPicking,
                  tool,
                  onDraw: drawShape,
                  onMoveDrawn: moveDrawn,
                  onMenu: (id, x, y) => { select(id); setMenu({ id, x, y }); },
                  onEditBlock: editBlock,
                }}
              />
            </div>
          ) : (
            <div className="empty">
              <div className="empty-art">🖨️</div>
              <h2>Your paper appears here</h2>
              <p>
                Photograph a handwritten draft, or just describe the paper you
                want. Edit anything before printing.
              </p>
            </div>
          )}
        </section>
      </main>
      )}
    </div>
  );
}
