import React from 'react';

/**
 * Figures: large diagrams a child works on, as opposed to the small picture
 * slots used for "match the word to the picture".
 *
 * "Colour the keys you use to type your name" needs an actual keyboard across
 * the page, with keys big enough for a crayon. A ⌨️ icon cannot carry that
 * question, which is why these are a separate block type rather than another
 * icon in the library.
 *
 * Everything here is drawn with HTML or SVG, so it scales to the page width
 * and prints at full resolution.
 */

/* ------------------------------------------------------------- keyboard */

const KEY_ROWS = [
  [['~', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1],
   ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['Backspace', 2.2]],
  [['Tab', 1.6], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1],
   ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.6]],
  [['Caps Lock', 2], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1],
   ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['Enter', 2.2]],
  [['Shift', 2.6], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1],
   ['M', 1], [',', 1], ['.', 1], ['/', 1], ['Shift', 2.6]],
  [['Ctrl', 1.5], ['Win', 1.2], ['Alt', 1.2], ['Spacebar', 7],
   ['Alt', 1.2], ['Win', 1.2], ['Ctrl', 1.5]],
];

function Keyboard({ opts }) {
  // A teacher can pre-shade keys for an answer key; normally all are blank
  // because colouring them is the exercise.
  const marked = new Set((opts.highlight || []).map((k) => String(k).toUpperCase()));

  return (
    <div className="fig-keyboard">
      {KEY_ROWS.map((row, r) => (
        <div className="kbd-row" key={r}>
          {row.map(([label, span], i) => (
            <span
              key={i}
              className={`kbd-key${marked.has(label.toUpperCase()) ? ' marked' : ''}` +
                         `${label.length > 2 ? ' wide-label' : ''}`}
              style={{ flexGrow: span, flexBasis: `${span * 6}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- clock */

function Clock({ opts }) {
  const { hour = null, minute = null, numbers = true } = opts;
  const hasHands = hour != null;
  const hAng = hasHands ? ((hour % 12) + (minute || 0) / 60) * 30 - 90 : 0;
  const mAng = hasHands ? (minute || 0) * 6 - 90 : 0;
  const rad = (a) => (a * Math.PI) / 180;

  return (
    <svg className="fig-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="3" />
      {Array.from({ length: 60 }).map((_, i) => {
        const a = rad(i * 6 - 90);
        const big = i % 5 === 0;
        const r1 = big ? 78 : 84;
        return (
          <line key={i}
            x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
            x2={100 + 88 * Math.cos(a)} y2={100 + 88 * Math.sin(a)}
            stroke="currentColor" strokeWidth={big ? 2.5 : 1} />
        );
      })}
      {numbers && Array.from({ length: 12 }).map((_, i) => {
        const a = rad((i + 1) * 30 - 90);
        return (
          <text key={i}
            x={100 + 64 * Math.cos(a)} y={100 + 64 * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central"
            fontSize="20" fontWeight="600" fill="currentColor"
            fontFamily="Inter, system-ui, sans-serif">
            {i + 1}
          </text>
        );
      })}
      {hasHands && (
        <>
          <line x1="100" y1="100"
                x2={100 + 44 * Math.cos(rad(hAng))} y2={100 + 44 * Math.sin(rad(hAng))}
                stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="100"
                x2={100 + 68 * Math.cos(rad(mAng))} y2={100 + 68 * Math.sin(rad(mAng))}
                stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      <circle cx="100" cy="100" r="4" fill="currentColor" />
    </svg>
  );
}

/* ---------------------------------------------------------- number line */

function NumberLine({ opts }) {
  const from = Number.isFinite(opts.from) ? opts.from : 0;
  const to = Number.isFinite(opts.to) ? opts.to : 10;
  const n = Math.max(1, to - from);
  const w = 100;

  return (
    <svg className="fig-svg" viewBox={`-4 0 ${w + 8} 26`} xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="12" x2={w} y2="12" stroke="currentColor" strokeWidth="0.7" />
      {Array.from({ length: n + 1 }).map((_, i) => {
        const x = (i / n) * w;
        return (
          <g key={i}>
            <line x1={x} y1="8" x2={x} y2="16" stroke="currentColor" strokeWidth="0.7" />
            <text x={x} y="24" textAnchor="middle" fontSize="5" fill="currentColor"
                  fontFamily="Inter, system-ui, sans-serif">
              {from + i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------ ten frame */

function TenFrame({ opts }) {
  const count = Math.max(1, Math.min(10, opts.frames || 1));
  return (
    <div className="fig-frames">
      {Array.from({ length: count }).map((_, f) => (
        <div className="ten-frame" key={f}>
          {Array.from({ length: 10 }).map((_, i) => <span key={i} />)}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- tracing */

function TraceBox({ opts }) {
  const text = String(opts.text || 'abc');
  return (
    <div className="fig-trace">
      <span className="trace-ghost-big">{text}</span>
    </div>
  );
}

export const FIGURES = {
  keyboard:   { name: 'Computer keyboard', h: 46, render: Keyboard },
  clock:      { name: 'Clock face',        h: 55, render: Clock },
  numberline: { name: 'Number line',       h: 22, render: NumberLine },
  tenframe:   { name: 'Ten frame',         h: 26, render: TenFrame },
  trace:      { name: 'Tracing letters',   h: 30, render: TraceBox },
};

export const FIGURE_IDS = Object.keys(FIGURES);

export default function Figure({ kind, opts = {}, height }) {
  const def = FIGURES[kind] || FIGURES.keyboard;
  const Render = def.render;
  return (
    <div className="figure-box" style={{ height: `${height || def.h}mm` }}>
      <Render opts={opts} />
    </div>
  );
}
