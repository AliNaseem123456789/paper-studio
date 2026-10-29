import React, { useEffect, useState } from 'react';
import Composer from './components/Composer.jsx';
import Editor from './components/Editor.jsx';
import Paper from './components/Paper.jsx';

const SETTINGS_KEY = 'paper-studio:settings';
const PAPER_KEY = 'paper-studio:paper';

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

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode -- fine, we just lose the draft */
  }
}

export default function App() {
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [paper, setPaper] = useState(() => load(PAPER_KEY, null));
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [decorated, setDecorated] = useState(true);
  const [view, setView] = useState('new');

  useEffect(() => save(SETTINGS_KEY, settings), [settings]);
  useEffect(() => { if (paper) save(PAPER_KEY, paper); }, [paper]);

  async function generate({ files, idea }) {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      files.forEach((f) => form.append('images', f));
      form.append('settings', JSON.stringify(settings));
      form.append('idea', idea || '');

      const res = await fetch('/api/generate', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Something went wrong');

      setPaper(body.paper);
      setMeta(body.meta);
      setView('edit');
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
      const res = await fetch('/api/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper, instruction }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Revision failed');
      setPaper(body.paper);
      setMeta(body.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    setPaper(null);
    setMeta(null);
    setView('new');
    try { localStorage.removeItem(PAPER_KEY); } catch { /* ignore */ }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">📝</span>
          <div>
            <strong>Paper Studio</strong>
            <span className="brand-sub">Al-Sehr Academy</span>
          </div>
        </div>

        <div className="topbar-actions">
          {paper && (
            <>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={decorated}
                  onChange={(e) => setDecorated(e.target.checked)}
                />
                Border
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                />
                Answer key
              </label>
              <button className="ghost" onClick={startNew}>New</button>
              <button className="primary small" onClick={() => window.print()}>
                Print / PDF
              </button>
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

      {meta && (
        <div className="banner info">
          Read in {meta.seconds}s with {meta.model} · {meta.inTok} in / {meta.outTok} out
          {meta.usd != null && ` · $${meta.usd.toFixed(4)}`}
        </div>
      )}

      <main className="layout">
        <aside className="side">
          {paper && (
            <div className="tabs" style={{ marginBottom: 12 }}>
              <button
                className={view === 'new' ? 'tab on' : 'tab'}
                onClick={() => setView('new')}
              >
                Create
              </button>
              <button
                className={view === 'edit' ? 'tab on' : 'tab'}
                onClick={() => setView('edit')}
              >
                Edit
              </button>
            </div>
          )}

          {view === 'new' || !paper ? (
            <Composer
              settings={settings}
              setSettings={setSettings}
              onGenerate={generate}
              busy={busy}
            />
          ) : (
            <Editor paper={paper} setPaper={setPaper} onRevise={revise} busy={busy} />
          )}
        </aside>

        <section className="stage">
          {paper ? (
            <div className="print-root">
              <Paper paper={paper} showAnswers={showAnswers} decorated={decorated} />
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
    </div>
  );
}
