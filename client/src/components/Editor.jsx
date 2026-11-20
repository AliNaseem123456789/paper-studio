import React from 'react';

/**
 * Teacher-facing editing. Deliberately plain: every field is a text input that
 * writes straight back into the paper spec, so the preview updates as you type.
 */
export default function Editor({ doc, setDoc, onRevise, busy }) {
  // The editor works on page 0's question blocks. Other block types are
  // edited on the sheet itself (and in the Design tab).
  const page = doc.pages[0] || { blocks: [] };
  const questions = page.blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.type === 'question');

  const writeBlocks = (fn) =>
    setDoc((d) => {
      const pages = [...d.pages];
      pages[0] = { ...pages[0], blocks: fn([...pages[0].blocks]) };
      return { ...d, pages };
    });

  const [instruction, setInstruction] = React.useState('');

  function patchMeta(key, value) {
    setDoc((d) => ({ ...d, meta: { ...d.meta, [key]: value } }));
  }

  /** bi = index into page.blocks (not into the filtered question list). */
  function patchBlock(bi, patch) {
    writeBlocks((bs) => {
      bs[bi] = { ...bs[bi], ...patch };
      return bs;
    });
  }

  function patchContent(bi, patch) {
    writeBlocks((bs) => {
      bs[bi] = { ...bs[bi], content: { ...bs[bi].content, ...patch } };
      return bs;
    });
  }

  function patchItem(bi, ii, patch) {
    writeBlocks((bs) => {
      const items = [...(bs[bi].content.items || [])];
      items[ii] = { ...items[ii], ...patch };
      bs[bi] = { ...bs[bi], content: { ...bs[bi].content, items } };
      return bs;
    });
  }

  function removeBlock(bi) {
    writeBlocks((bs) => bs.filter((_, i) => i !== bi));
  }

  function move(bi, dir) {
    writeBlocks((bs) => {
      const j = bi + dir;
      if (j < 0 || j >= bs.length) return bs;
      [bs[bi], bs[j]] = [bs[j], bs[bi]];
      return bs;
    });
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Paper details</h2>
      <div className="fields">
        {['school', 'title', 'class', 'subject', 'duration'].map((k) => (
          <label key={k}>
            {k[0].toUpperCase() + k.slice(1)}
            <input value={doc.meta[k] || ''} onChange={(e) => patchMeta(k, e.target.value)} />
          </label>
        ))}
        <label>
          Total marks
          <input
            type="number"
            value={doc.meta.totalMarks ?? ''}
            onChange={(e) => patchMeta('totalMarks', e.target.value ? Number(e.target.value) : null)}
          />
        </label>
      </div>
      <label className="full">
        Instructions
        <input
          value={doc.meta.instructions || ''}
          onChange={(e) => patchMeta('instructions', e.target.value)}
        />
      </label>

      <h2 className="panel-title">Ask for a change</h2>
      <div className="revise">
        <input
          placeholder='e.g. "add two more Urdu questions" or "make question 3 easier"'
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && instruction.trim()) {
              onRevise(instruction);
              setInstruction('');
            }
          }}
        />
        <button
          className="primary small"
          disabled={busy || !instruction.trim()}
          onClick={() => { onRevise(instruction); setInstruction(''); }}
        >
          {busy ? '…' : 'Apply'}
        </button>
      </div>

      <h2 className="panel-title">Questions ({questions.length})</h2>
      {questions.map(({ b, i: bi }) => {
        const q = b.content;
        return (
        <details className="qedit" key={b.id}>
          <summary>
            <span className="qedit-num">{q.number}</span>
            <span className="qedit-label">{q.instruction || q.qtype}</span>
            <span className="qedit-type">{String(q.qtype).replace(/_/g, ' ')}</span>
          </summary>

          <div className="qedit-body">
            <label className="full">
              Instruction
              <input
                value={q.instruction}
                onChange={(e) => patchContent(bi, { instruction: e.target.value })}
              />
            </label>
            <div className="fields">
              <label>
                Number
                <input value={q.number} onChange={(e) => patchContent(bi, { number: e.target.value })} />
              </label>
              <label>
                Marks
                <input
                  type="number"
                  value={q.marks ?? ''}
                  onChange={(e) =>
                    patchContent(bi, { marks: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </label>
              <label>
                Language
                <select
                  value={b.language || 'en'}
                  onChange={(e) => patchBlock(bi, { language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="ur">اردو</option>
                </select>
              </label>
            </div>

            {(q.items || []).map((it, ii) => (
              <div className="itemedit" key={ii}>
                <span className="itemedit-num">{it.number}</span>
                <input
                  value={it.text ?? it.label ?? ''}
                  placeholder="question text"
                  onChange={(e) =>
                    patchItem(bi, ii, it.text !== undefined
                      ? { text: e.target.value }
                      : { label: e.target.value })
                  }
                />
                <input
                  className="ans"
                  value={it.answer || ''}
                  placeholder="answer"
                  onChange={(e) => patchItem(bi, ii, { answer: e.target.value })}
                />
              </div>
            ))}

            <div className="qedit-actions">
              <button className="link-btn" onClick={() => move(bi, -1)}>↑ Up</button>
              <button className="link-btn" onClick={() => move(bi, 1)}>↓ Down</button>
              <button className="link-btn danger" onClick={() => removeBlock(bi)}>
                Remove
              </button>
            </div>
          </div>
        </details>
        );
      })}
    </div>
  );
}
