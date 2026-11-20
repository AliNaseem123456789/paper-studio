import React from 'react';

/**
 * Spot illustrations for syllabus panels.
 *
 * These are a size up from the icon library: the pictures sitting inside each
 * coloured panel on a syllabus sheet — ABC blocks, a paint palette, a stack of
 * books. Emoji are too small and too inconsistent for that job, so these are
 * drawn properly, in colour, at whatever size the panel gives them.
 *
 * Each is authored in a 100x100 viewBox and scales cleanly to print.
 */

const P = {            // a palette that sits well on white panels
  red: '#e03131', orange: '#f08c00', yellow: '#fcc419', green: '#2f9e44',
  teal: '#0c8599', blue: '#1971c2', indigo: '#3b5bdb', purple: '#7048e8',
  pink: '#e64980', brown: '#a9713b', grey: '#868e96', ink: '#343a40',
  paper: '#ffffff', skin: '#f3c9a0',
};

const Svg = ({ children }) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
       className="spot-svg" preserveAspectRatio="xMidYMid meet">
    {children}
  </svg>
);

/* --------------------------------------------------------------- letters */

const AbcBlocks = () => (
  <Svg>
    {[[8, 40, P.red, 'A'], [36, 30, P.green, 'B'], [64, 42, P.blue, 'C']].map(
      ([x, y, c, ch]) => (
        <g key={ch}>
          <rect x={x} y={y} width="28" height="28" rx="5" fill={c} />
          <rect x={x + 2.5} y={y + 2.5} width="23" height="23" rx="3.5"
                fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" />
          <text x={x + 14} y={y + 20.5} textAnchor="middle" fontSize="18"
                fontWeight="800" fill="#fff"
                fontFamily="Inter, system-ui, sans-serif">{ch}</text>
        </g>
      ))}
  </Svg>
);

const UrduLetters = () => (
  <Svg>
    {[['ا', 14, P.red], ['ب', 44, P.green], ['پ', 74, P.blue]].map(
      ([ch, x, c]) => (
        <text key={ch} x={x} y="68" textAnchor="middle" fontSize="44"
              fontWeight="700" fill={c}
              fontFamily='"Jameel Noori Nastaleeq","Noto Nastaliq Urdu",serif'>
          {ch}
        </text>
      ))}
  </Svg>
);

/* ----------------------------------------------------------------- maths */

const Numbers123 = () => (
  <Svg>
    {[['1', 12, P.green], ['2', 38, P.red], ['3', 64, P.blue]].map(([n, x, c]) => (
      <g key={n}>
        <rect x={x} y="24" width="22" height="26" rx="4" fill={c} />
        <text x={x + 11} y="44" textAnchor="middle" fontSize="18" fontWeight="800"
              fill="#fff" fontFamily="Inter, system-ui, sans-serif">{n}</text>
      </g>
    ))}
    {[['+', 12, P.teal], ['−', 38, P.orange], ['=', 64, P.pink]].map(([s, x, c]) => (
      <g key={s}>
        <rect x={x} y="56" width="22" height="22" rx="4" fill={c} />
        <text x={x + 11} y="73" textAnchor="middle" fontSize="16" fontWeight="800"
              fill="#fff" fontFamily="Inter, system-ui, sans-serif">{s}</text>
      </g>
    ))}
  </Svg>
);

const Abacus = () => (
  <Svg>
    <rect x="12" y="18" width="76" height="64" rx="6" fill="none"
          stroke={P.brown} strokeWidth="5" />
    {[32, 48, 64].map((y, r) => (
      <g key={y}>
        <line x1="12" y1={y} x2="88" y2={y} stroke={P.brown} strokeWidth="2" />
        {[24, 38, 52, 66].map((x, i) => (
          <circle key={x} cx={x} cy={y} r="5.5"
                  fill={[P.red, P.yellow, P.green, P.blue][(i + r) % 4]} />
        ))}
      </g>
    ))}
  </Svg>
);

/* ------------------------------------------------------------- art / fun */

const Palette = () => (
  <Svg>
    <path d="M50 20 C28 20 14 34 14 50 C14 64 26 74 38 72 C46 70 44 62 50 60
             C58 57 72 64 80 56 C86 50 86 20 50 20 Z"
          fill="#fff8e7" stroke={P.ink} strokeWidth="2.5" />
    {[[30, 38, P.red], [44, 32, P.yellow], [58, 34, P.green],
      [66, 46, P.blue], [34, 54, P.purple]].map(([x, y, c]) => (
      <circle key={c} cx={x} cy={y} r="5.5" fill={c} />
    ))}
    <g transform="rotate(32 76 62)">
      <rect x="72" y="36" width="7" height="34" rx="2" fill={P.brown} />
      <rect x="71" y="68" width="9" height="9" rx="2" fill={P.grey} />
      <path d="M71 76 h9 l-2 10 h-5 Z" fill={P.red} />
    </g>
  </Svg>
);

const PencilCup = () => (
  <Svg>
    {[[32, 18, P.red], [42, 12, P.yellow], [52, 16, P.green],
      [62, 10, P.blue], [72, 20, P.purple]].map(([x, y, c], i) => (
      <g key={i}>
        <rect x={x} y={y} width="8" height="46" rx="1.5" fill={c} />
        <path d={`M${x} ${y} l4 -8 l4 8 Z`} fill={P.skin} />
      </g>
    ))}
    <path d="M26 56 h52 l-5 30 a4 4 0 0 1 -4 3 h-34 a4 4 0 0 1 -4 -3 Z"
          fill={P.teal} />
    <rect x="24" y="52" width="56" height="7" rx="3" fill="#0b6e7f" />
  </Svg>
);

const Easel = () => (
  <Svg>
    <path d="M22 86 L34 34 M78 86 L66 34" stroke={P.brown} strokeWidth="4"
          strokeLinecap="round" />
    <rect x="24" y="18" width="52" height="42" rx="3" fill="#fff"
          stroke={P.ink} strokeWidth="2.5" />
    <circle cx="36" cy="28" r="4" fill={P.yellow} />
    <path d="M28 52 l10 -14 l8 10 l7 -9 l19 15 Z" fill={P.green} />
    <rect x="18" y="58" width="64" height="5" rx="2.5" fill={P.brown} />
  </Svg>
);

/* ------------------------------------------------------------ books etc. */

const BookStack = () => (
  <Svg>
    {[[P.green, 66], [P.red, 52], [P.blue, 38]].map(([c, y], i) => (
      <g key={i}>
        <rect x={18 + i * 3} y={y} width={64 - i * 6} height="14" rx="2.5" fill={c} />
        <rect x={18 + i * 3} y={y} width="6" height="14" fill="#0003" />
      </g>
    ))}
    <path d="M34 36 q16 -8 32 0 v-4 q-16 -8 -32 0 Z" fill="#fff"
          stroke={P.ink} strokeWidth="1.6" />
    <circle cx="74" cy="28" r="7" fill={P.red} />
    <path d="M74 21 q3 -5 7 -4 q-2 4 -7 4" fill={P.green} />
  </Svg>
);

const OpenBook = () => (
  <Svg>
    <path d="M50 30 C40 22 24 22 14 26 v46 c10 -4 26 -4 36 4 Z"
          fill="#fff" stroke={P.ink} strokeWidth="2.5" />
    <path d="M50 30 C60 22 76 22 86 26 v46 c-10 -4 -26 -4 -36 4 Z"
          fill="#fff" stroke={P.ink} strokeWidth="2.5" />
    {[38, 46, 54].map((y) => (
      <g key={y}>
        <line x1="21" y1={y} x2="42" y2={y} stroke={P.grey} strokeWidth="2" />
        <line x1="58" y1={y} x2="79" y2={y} stroke={P.grey} strokeWidth="2" />
      </g>
    ))}
  </Svg>
);

const GradCap = () => (
  <Svg>
    <path d="M50 24 L92 40 L50 56 L8 40 Z" fill={P.ink} />
    <path d="M28 46 v16 c0 6 10 10 22 10 s22 -4 22 -10 v-16"
          fill="none" stroke={P.ink} strokeWidth="5" />
    <path d="M92 40 v22" stroke={P.yellow} strokeWidth="3" />
    <circle cx="92" cy="66" r="5" fill={P.yellow} />
  </Svg>
);

/* ---------------------------------------------------------- world / faith */

const Mosque = () => (
  <Svg>
    <rect x="22" y="52" width="56" height="32" fill="#eaf4ef"
          stroke={P.green} strokeWidth="2.5" />
    <path d="M50 22 C38 34 32 42 32 52 h36 c0 -10 -6 -18 -18 -30 Z" fill={P.green} />
    <path d="M50 14 a5 5 0 1 1 -3 9 a6 6 0 1 0 3 -9" fill={P.yellow} />
    {[18, 82].map((x) => (
      <g key={x}>
        <rect x={x - 4} y="38" width="8" height="46" fill="#eaf4ef"
              stroke={P.green} strokeWidth="2" />
        <path d={`M${x - 5} 38 q5 -9 10 0 Z`} fill={P.green} />
      </g>
    ))}
    <path d="M44 84 v-14 a6 6 0 0 1 12 0 v14 Z" fill={P.green} />
  </Svg>
);

const Globe = () => (
  <Svg>
    <circle cx="50" cy="50" r="32" fill="#cfe8ff" stroke={P.blue} strokeWidth="2.5" />
    <path d="M26 36 q14 6 28 0 t20 6 M22 56 q16 8 32 2 t24 4" fill="none"
          stroke={P.blue} strokeWidth="2" />
    <path d="M38 24 q-10 26 0 52 M62 24 q10 26 0 52" fill="none"
          stroke={P.blue} strokeWidth="2" />
    <path d="M34 42 q10 -8 18 0 t-6 12 q-10 2 -12 -12 Z" fill={P.green} />
    <path d="M60 56 q10 -4 14 4 t-10 8 Z" fill={P.green} />
  </Svg>
);

const Lion = () => (
  <Svg>
    {Array.from({ length: 10 }).map((_, i) => (
      <circle key={i} r="7" fill="#d9480f"
              cx={50 + 26 * Math.cos((i * 36 * Math.PI) / 180)}
              cy={52 + 26 * Math.sin((i * 36 * Math.PI) / 180)} />
    ))}
    <circle cx="50" cy="52" r="26" fill={P.orange} />
    <circle cx="50" cy="52" r="20" fill={P.yellow} />
    <circle cx="36" cy="38" r="6" fill={P.orange} />
    <circle cx="64" cy="38" r="6" fill={P.orange} />
    <circle cx="42" cy="47" r="3" fill={P.ink} />
    <circle cx="58" cy="47" r="3" fill={P.ink} />
    <path d="M50 56 l-5 4 h10 Z" fill={P.ink} />
    <path d="M44 64 q6 5 12 0" fill="none" stroke={P.ink} strokeWidth="2"
          strokeLinecap="round" />
  </Svg>
);

const Train = () => (
  <Svg>
    <rect x="10" y="46" width="34" height="26" rx="3" fill={P.red} />
    <rect x="48" y="52" width="24" height="20" rx="3" fill={P.blue} />
    <rect x="74" y="52" width="18" height="20" rx="3" fill={P.green} />
    <rect x="16" y="52" width="12" height="10" rx="2" fill="#fff" />
    <rect x="22" y="32" width="9" height="14" rx="2" fill={P.ink} />
    <circle cx="26" cy="26" r="5" fill="#dee2e6" />
    {[20, 38, 56, 66, 80, 88].map((x) => (
      <circle key={x} cx={x} cy="76" r="6" fill={P.ink} />
    ))}
  </Svg>
);

/* ------------------------------------------------------------------ misc */

const Note = () => (
  <Svg>
    <rect x="22" y="16" width="52" height="68" rx="4" fill="#fff"
          stroke={P.ink} strokeWidth="2.5" />
    {[32, 42, 52, 62].map((y) => (
      <line key={y} x1="31" y1={y} x2="65" y2={y} stroke={P.grey} strokeWidth="2.4" />
    ))}
    <g transform="rotate(38 72 64)">
      <rect x="68" y="28" width="9" height="42" rx="2" fill={P.yellow} />
      <path d="M68 70 l4.5 10 l4.5 -10 Z" fill={P.skin} />
      <path d="M70.5 77 l2 4.5 l2 -4.5 Z" fill={P.ink} />
    </g>
  </Svg>
);

const Blocks = () => (
  <Svg>
    <rect x="16" y="56" width="26" height="26" rx="4" fill={P.red} />
    <rect x="46" y="56" width="26" height="26" rx="4" fill={P.blue} />
    <rect x="31" y="28" width="26" height="26" rx="4" fill={P.yellow} />
    <circle cx="80" cy="40" r="12" fill={P.green} />
    <circle cx="80" cy="40" r="5" fill="#fff" />
  </Svg>
);

export const SPOTS = {
  'abc-blocks':   { name: 'ABC blocks',    el: AbcBlocks },
  'urdu-letters': { name: 'Urdu letters',  el: UrduLetters },
  'numbers-123':  { name: 'Numbers 123',   el: Numbers123 },
  abacus:         { name: 'Abacus',        el: Abacus },
  palette:        { name: 'Paint palette', el: Palette },
  'pencil-cup':   { name: 'Pencil cup',    el: PencilCup },
  easel:          { name: 'Easel',         el: Easel },
  'book-stack':   { name: 'Stack of books', el: BookStack },
  'open-book':    { name: 'Open book',     el: OpenBook },
  'grad-cap':     { name: 'Graduation cap', el: GradCap },
  mosque:         { name: 'Mosque',        el: Mosque },
  globe:          { name: 'Globe',         el: Globe },
  lion:           { name: 'Lion',          el: Lion },
  train:          { name: 'Train',         el: Train },
  note:           { name: 'Notepad',       el: Note },
  blocks:         { name: 'Toy blocks',    el: Blocks },
};

export const SPOT_IDS = Object.keys(SPOTS);

export default function Spot({ id, size = 22 }) {
  const def = SPOTS[id];
  if (!def) return null;
  const El = def.el;
  return (
    <span className="spot" style={{ width: `${size}mm`, height: `${size}mm` }}>
      <El />
    </span>
  );
}
