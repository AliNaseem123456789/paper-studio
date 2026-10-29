import React from 'react';

/**
 * Teacher-facing editing. Deliberately plain: every field is a text input that
 * writes straight back into the paper spec, so the preview updates as you type.
 */
export default function Editor({ paper, setPaper, onRevise, busy }) {
  const [instruction, setInstruction] = React.useState('');

  function patchPaper(key, value) {
    setPaper((p) => ({ ...p, [key]: value }));
  }

  function patchQuestion(qi, patch) {
    setPaper((p) => {
      const questions = [...p.questions];
      questions[qi] = { ...questions[qi], ...patch };
      return { ...p, questions };
    });
  }

  function patchItem(qi, ii, patch) {
    setPaper((p) => {
      const questions = [...p.questions];
      const items = [...(questions[qi].items || [])];
      items[ii] = { ...items[ii], ...patch };
      questions[qi] = { ...questions[qi], items };
      return { ...p, questions };
    });
  }

  function removeQuestion(qi) {
    setPaper((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== qi) }));
  }

  function move(qi, dir) {
    setPaper((p) => {
      const qs = [...p.questions];
      const j = qi + dir;
      if (j < 0 || j >= qs.length) return p;
      [qs[qi], qs[j]] = [qs[j], qs[qi]];
      return { ...p, questions: qs };
    });
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Paper details</h2>
      <div className="fields">
        {['school', 'title', 'class', 'subject', 'duration'].map((k) => (
          <label key={k}>
            {k[0].toUpperCase() + k.slice(1)}
            <input value={paper[k] || ''} onChange={(e) => patchPaper(k, e.target.value)} />
          </label>
        ))}
        <label>
          Total marks
          <input
            type="number"
            value={paper.totalMarks ?? ''}
            onChange={(e) => patchPaper('totalMarks', e.target.value ? Number(e.target.value) : null)}
          />
        </label>
      </div>
      <label className="full">
        Instructions
        <input
          value={paper.instructions || ''}
          onChange={(e) => patchPaper('instructions', e.target.value)}
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

      <h2 className="panel-title">Questions ({paper.questions.length})</h2>
      {paper.questions.map((q, qi) => (
        <details className="qedit" key={q.id}>
          <summary>
            <span className="qedit-num">{q.number}</span>
            <span className="qedit-label">{q.instruction || q.type}</span>
            <span className="qedit-type">{q.type.replace(/_/g, ' ')}</span>
          </summary>

          <div className="qedit-body">
            <label className="full">
              Instruction
              <input
                value={q.instruction}
                onChange={(e) => patchQuestion(qi, { instruction: e.target.value })}
              />
            </label>
            <div className="fields">
              <label>
                Number
                <input value={q.number} onChange={(e) => patchQuestion(qi, { number: e.target.value })} />
              </label>
              <label>
                Marks
                <input
                  type="number"
                  value={q.marks ?? ''}
                  onChange={(e) =>
                    patchQuestion(qi, { marks: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </label>
              <label>
                Language
                <select
                  value={q.language || 'en'}
                  onChange={(e) => patchQuestion(qi, { language: e.target.value })}
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
                    patchItem(qi, ii, it.text !== undefined
                      ? { text: e.target.value }
                      : { label: e.target.value })
                  }
                />
                <input
                  className="ans"
                  value={it.answer || ''}
                  placeholder="answer"
                  onChange={(e) => patchItem(qi, ii, { answer: e.target.value })}
                />
              </div>
            ))}

            <div className="qedit-actions">
              <button className="link-btn" onClick={() => move(qi, -1)}>↑ Up</button>
              <button className="link-btn" onClick={() => move(qi, 1)}>↓ Down</button>
              <button className="link-btn danger" onClick={() => removeQuestion(qi)}>
                Remove
              </button>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
