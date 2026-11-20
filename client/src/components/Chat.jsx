import { apiFetch } from '../lib/api.js';
import React, { useEffect, useRef, useState } from 'react';

const STORE = 'paper-studio:chat';

const STARTERS = [
  'Give me 10 General Knowledge questions for KG-I',
  'نرسری کے لیے اردو کے پانچ سوال لکھیں',
  'Draw a friendly duck wearing a hat',
  'How do I explain living and non-living things to 4-year-olds?',
];

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

/**
 * A general assistant. One input: type, attach pictures, or both. The model
 * decides whether to answer in words, draw something, or edit a picture
 * already in the conversation — there is no mode to switch.
 *
 * Nothing here touches the Papers side of the app.
 */
export default function Chat({ onUsage }) {
  const [messages, setMessages] = useState(load);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dragging, setDragging] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    try {
      // Pictures are big; keep the last 20 turns so storage does not overflow.
      localStorage.setItem(STORE, JSON.stringify(messages.slice(-20)));
    } catch { /* quota or private mode -- the chat still works */ }
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function attach(list) {
    const picked = Array.from(list || []).filter((f) => f.type.startsWith('image/')).slice(0, 4);
    if (!picked.length) return;
    setFiles(picked);
    setPreviews(await Promise.all(picked.map(readAsDataUrl)));
  }

  function clearAttachments() {
    setFiles([]);
    setPreviews([]);
    if (fileRef.current) fileRef.current.value = '';
  }

  /** Paste a screenshot straight into the conversation. */
  function onPaste(e) {
    const imgs = Array.from(e.clipboardData?.files || [])
      .filter((f) => f.type.startsWith('image/'));
    if (imgs.length) {
      e.preventDefault();
      attach(imgs);
    }
  }

  async function send(textOverride, extraImages) {
    const text = (textOverride ?? draft).trim();
    const imgs = extraImages ?? previews;
    if ((!text && !imgs.length) || busy) return;

    const mine = { role: 'user', content: text, images: imgs };
    const next = [...messages, mine];
    setMessages(next);
    setDraft('');
    const sending = extraImages ? [] : files;
    clearAttachments();
    setBusy(true);
    setError('');

    try {
      const form = new FormData();
      // Images ride along inside the history, so a follow-up like
      // "now make it blue" still has the picture in view.
      form.append('messages', JSON.stringify(
        next.map(({ role, content, images }) => ({ role, content, images }))
      ));
      sending.forEach((f) => form.append('images', f));

      const res = await apiFetch('/api/chat', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Chat failed');

      setMessages((m) => [...m, {
        role: 'assistant',
        content: body.reply || '',
        images: body.image ? [body.image] : [],
        tool: body.meta?.tool || null,
      }]);
      onUsage?.();
    } catch (err) {
      setError(err.message);
      setMessages((m) => m.slice(0, -1));
      setDraft(text);
      setPreviews(imgs);
      setFiles(sending);
    } finally {
      setBusy(false);
      taRef.current?.focus();
    }
  }

  /** "Change this picture" on a reply: re-send that image with a new message. */
  function editThis(url) {
    setPreviews([url]);
    setFiles([]);
    setDraft('');
    taRef.current?.focus();
  }

  function clear() {
    setMessages([]);
    clearAttachments();
    try { localStorage.removeItem(STORE); } catch { /* ignore */ }
  }

  function grow(el) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }

  return (
    <div
      className={`chat${dragging ? ' dropping' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); attach(e.dataTransfer.files); }}
    >
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="empty-art">💬</div>
            <h2>Ask me anything</h2>
            <p>
              Type a question, attach a picture, or both. I can answer, draw
              something new, or change a picture you give me — just say what
              you want.
            </p>
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s} className="starter" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div className={`bubble ${m.role}`} key={i}>
            {(m.images || []).length > 0 && (
              <div className="bubble-imgs">
                {m.images.map((src, j) => (
                  <div className="bubble-img-wrap" key={j}>
                    <img className="bubble-img" src={src} alt="" />
                    {m.role === 'assistant' && (
                      <div className="bubble-actions">
                        <a href={src} download={`picture-${i}.png`} className="link-btn">
                          Download
                        </a>
                        <button className="link-btn" onClick={() => editThis(src)}>
                          Change this
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {m.content && <div className="bubble-text">{m.content}</div>}
          </div>
        ))}

        {busy && (
          <div className="bubble assistant">
            <div className="bubble-text typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="banner error" style={{ margin: '0 14px 8px' }}>
          {error}
          <button className="link-btn" onClick={() => setError('')}>dismiss</button>
        </div>
      )}

      <div className="chat-bar">
        {previews.length > 0 && (
          <div className="attached">
            {previews.map((src, i) => (
              <span className="attached-thumb" key={i}>
                <img src={src} alt="" />
              </span>
            ))}
            <button className="link-btn" onClick={clearAttachments}>remove</button>
            <span className="attached-hint">
              Say what to do with {previews.length > 1 ? 'these' : 'this'} — ask about
              {previews.length > 1 ? ' them' : ' it'}, or ask for a change.
            </span>
          </div>
        )}

        <div className="chat-input-row">
          <button
            className="ghost icon"
            title="Attach a picture"
            onClick={() => fileRef.current?.click()}
          >📎</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => attach(e.target.files)}
          />
          <textarea
            ref={taRef}
            rows={1}
            placeholder="Ask anything, or attach a picture… (Shift+Enter for a new line)"
            value={draft}
            dir="auto"
            onPaste={onPaste}
            onInput={(e) => grow(e.target)}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className="primary small"
            disabled={busy || (!draft.trim() && !previews.length)}
            onClick={() => send()}
          >
            {busy ? '…' : 'Send'}
          </button>
        </div>

        {messages.length > 0 && (
          <button className="link-btn chat-clear" onClick={clear}>Clear chat</button>
        )}
      </div>
    </div>
  );
}
