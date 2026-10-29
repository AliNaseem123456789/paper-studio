import React from 'react';
import { RENDERERS } from './questions/Renderers.jsx';

const ICONS = ['🍎', '🍐', '🍊', '🍇', '🍌', '🧸', '📘', '✏️', '🎨', '🧮',
               '🏀', '🐑', '📒', '🍏', '🧺', '🐻', '⭐', '🌸'];

function Frame() {
  const out = [];
  const cols = 14;
  const rows = 19;
  let n = 0;
  const pick = () => ICONS[(n++ * 7) % ICONS.length];
  for (let i = 0; i < cols; i++) {
    const x = 2 + (i * 95) / (cols - 1);
    out.push(<span key={`t${i}`} style={{ top: '3mm', left: `${x}%` }}>{pick()}</span>);
    out.push(<span key={`b${i}`} style={{ bottom: '3mm', left: `${x}%` }}>{pick()}</span>);
  }
  for (let i = 1; i < rows - 1; i++) {
    const y = 2 + (i * 95) / (rows - 1);
    out.push(<span key={`l${i}`} style={{ left: '3mm', top: `${y}%` }}>{pick()}</span>);
    out.push(<span key={`r${i}`} style={{ right: '3mm', top: `${y}%` }}>{pick()}</span>);
  }
  return <div className="sheet-frame" aria-hidden="true">{out}</div>;
}

function Question({ q, showAnswers }) {
  const Renderer = RENDERERS[q.type];
  const rtl = q.language === 'ur';
  return (
    <section className={`q${rtl ? ' rtl' : ''}`}>
      <div className="q-head">
        <span>
          {rtl ? 'سوال نمبر' : 'Q'} {q.number}
          {q.instruction ? `: ${q.instruction}` : ''}
        </span>
        {q.marks != null && <span className="q-marks">{q.marks}</span>}
      </div>
      {Renderer ? <Renderer q={q} showAnswers={showAnswers} /> : null}
    </section>
  );
}

/** The printable sheet. Pure function of the paper spec. */
export default function Paper({ paper, showAnswers = false, decorated = true }) {
  if (!paper) return null;
  const rtlPaper = paper.language === 'ur';

  return (
    <article
      className={`sheet${decorated ? ' decorated' : ''}${rtlPaper ? ' rtl' : ''}`}
      dir={rtlPaper ? 'rtl' : 'ltr'}
    >
      {decorated && <Frame />}

      <header className="sheet-head">
        {paper.school && <h1 className="sheet-school">{paper.school}</h1>}
        {paper.title && <p className="sheet-title">{paper.title}</p>}
      </header>

      <div className="sheet-meta">
        <span>{rtlPaper ? 'کلاس' : 'Class'}: {paper.class || '______'}</span>
        <span>{rtlPaper ? 'پرچہ' : 'Subject'}: {paper.subject || '______'}</span>
        {paper.duration && <span>{rtlPaper ? 'وقت' : 'Time'}: {paper.duration}</span>}
        {paper.totalMarks != null && (
          <span>{rtlPaper ? 'کل نمبر' : 'Total Marks'}: {paper.totalMarks}</span>
        )}
      </div>
      <hr className="sheet-rule" />

      {paper.instructions && <div className="sheet-note">{paper.instructions}</div>}

      {showAnswers && (
        <div className="sheet-note" style={{ color: '#0b5fa5', fontWeight: 600 }}>
          ANSWER KEY — not for distribution
        </div>
      )}

      {paper.questions.map((q) => (
        <Question key={q.id} q={q} showAnswers={showAnswers} />
      ))}

      <div className="sheet-foot">
        <span>Name: ______________________</span>
        <span className="goodluck">Good Luck</span>
        <span>Roll No: __________</span>
      </div>
    </article>
  );
}
