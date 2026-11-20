import React from 'react';
import Slot from '../blocks/Slot.jsx';

/* Every picture is its own Slot: individually selectable, replaceable and
   draggable. `blockId` identifies the question, `index` the item within it. */
function Pic({ it, blockId, index, size }) {
  return <Slot blockId={blockId} index={index} item={it} size={size} />;
}

/* Splits "Moving air is called ____." into text + blank spans so the answer
   can be dropped in when printing a key. */
export function withBlanks(text, answer, showAnswers) {
  const parts = String(text || '').split(/_{2,}/);
  if (parts.length === 1) return text;
  return parts.flatMap((part, i) =>
    i === parts.length - 1
      ? [<span key={`t${i}`}>{part}</span>]
      : [
          <span key={`t${i}`}>{part}</span>,
          <span className="blank-line" key={`b${i}`}>
            {showAnswers && i === 0 ? answer : ' '}
          </span>,
        ]
  );
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

export function FillBlank({ q, showAnswers }) {
  return (
    <div className="q-body">
      {q.items.map((it, i) => (
        <div className="item" key={i}>
          <span className="item-num">{it.number}.</span>
          {withBlanks(it.text, it.answer, showAnswers)}
        </div>
      ))}
    </div>
  );
}

export function ShortAnswer({ q, showAnswers }) {
  return (
    <div className="q-body">
      {q.items.map((it, i) => (
        <div className="item" key={i}>
          <span className="item-num">{it.number}.</span>
          {it.text}
          {showAnswers && it.answer ? (
            <span className="blank-line" style={{ minWidth: '40mm' }}>
              {it.answer}
            </span>
          ) : (
            <div
              className="blank-line"
              style={{ display: 'block', minWidth: '100%', marginTop: '4mm' }}
            >
              &nbsp;
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Mcq({ q, showAnswers }) {
  return (
    <div className="q-body">
      {q.items.map((it, i) => (
        <div className="item" key={i}>
          <div>
            <span className="item-num">{it.number}.</span>
            {it.text}
          </div>
          <div className="mcq-opts">
            {it.options.map((opt, j) => {
              const correct = showAnswers && opt && opt === it.answer;
              return (
                <span className={`mcq-opt${correct ? ' correct' : ''}`} key={j}>
                  <span className="mcq-letter">({LETTERS[j] || j + 1})</span>
                  {opt}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrueFalse({ q, showAnswers }) {
  return (
    <div className="q-body">
      {q.items.map((it, i) => (
        <div className="item" key={i}>
          <span className="item-num">{it.number}.</span>
          {it.text}
          <span className="blank-line" style={{ minWidth: '18mm' }}>
            {showAnswers ? it.answer : ' '}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Match({ q, blockId, assets, showAnswers }) {
  // The left column is pictures the child looks at; the right column is the
  // words. Showing a picture's own word beside it would give the answer
  // away, so `showLabels` is off unless a teacher turns it on.
  const showLabels = Boolean(q.showLabels);

  return (
    <div className="q-body">
      <div className="match">
        <div className="match-col left">
          {q.left.map((it, i) => (
            <div className="match-cell" key={i}>
              <span className="match-num">{it.number}.</span>
              <span className="match-pic">
                <Pic it={it} blockId={blockId} index={i} size="11mm" />
              </span>
              {showLabels && <span className="match-word">{it.label}</span>}
              <span className="match-dot" />
            </div>
          ))}
        </div>

        <div className="match-col right">
          {q.right.map((it, i) => (
            <div className="match-cell" key={i}>
              <span className="match-dot" />
              <span className="match-word">{it.label}</span>
            </div>
          ))}
        </div>
      </div>

      {showAnswers && (
        <div className="match-key">
          {q.left.map((it) => `${it.number}. ${it.label}`).join('    ')}
        </div>
      )}
    </div>
  );
}

export function CompleteWord({ q, blockId, assets, showAnswers }) {
  return (
    <div className="q-body">
      {q.items.map((it, i) => {
        const answer = String(it.answer || '');
        return (
          <div className="item" key={i} style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
            <span className="item-num">{it.number}.</span>
            <Pic it={it} blockId={blockId} index={i} size="6mm" />
            <span className="boxes">
              {it.letters.map((ch, j) => (
                <span className={`box${!ch && showAnswers ? ' filled-answer' : ''}`} key={j}>
                  {ch || (showAnswers ? answer[j] || '' : '')}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CirclePicture({ q, blockId, assets, showAnswers }) {
  return (
    <div className="q-body">
      {q.items.some((it) => it.text) &&
        q.items.map(
          (it, i) =>
            it.text && (
              <div className="item" key={`t${i}`}>
                <span className="item-num">{it.number}.</span>
                {it.text}
              </div>
            )
        )}
      <div className="pics">
        {q.items.map((it, i) => (
          <div
            className={`pic${showAnswers && it.answer && it.answer === it.label ? ' correct' : ''}`}
            key={i}
          >
            <span className="pic-art"><Pic it={it} blockId={blockId} index={i} size="12mm" /></span>
            {it.label && <div className="pic-label">{it.label}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WriteName({ q, blockId, assets, showAnswers }) {
  return (
    <div className="q-body">
      <div className="pics">
        {q.items.map((it, i) => (
          <div className="pic" key={i}>
            <span className="pic-art"><Pic it={it} blockId={blockId} index={i} size="12mm" /></span>
            <span className="pic-line">
              {showAnswers ? it.answer || it.label : ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LetterPractice({ q }) {
  const rows = Math.max(1, q.rows || 2);
  return (
    <div className="q-body">
      {q.letters.map((ch, i) => (
        <div className="trace-row" key={i}>
          <span className="trace-letter">{ch}</span>
          {Array.from({ length: rows * 3 }).map((_, j) => (
            <span className="trace-ghost" key={j}>
              {ch}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Handwriting({ q }) {
  return (
    <div className="q-body">
      {q.items.map((it, i) => (
        <div key={i}>
          <div className="item">{it.text}</div>
          {[0, 1].map((n) => (
            <div
              className="blank-line"
              style={{ display: 'block', minWidth: '100%', marginBottom: '5mm' }}
              key={n}
            >
              &nbsp;
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const RENDERERS = {
  fill_blank: FillBlank,
  short_answer: ShortAnswer,
  mcq: Mcq,
  true_false: TrueFalse,
  match: Match,
  complete_word: CompleteWord,
  circle_picture: CirclePicture,
  write_name: WriteName,
  letter_practice: LetterPractice,
  handwriting: Handwriting,
};
