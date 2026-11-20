import React from 'react';

/**
 * Page borders.
 *
 * Two families, because the source designs are two different things:
 *
 *  - Pattern borders are drawn here as SVG tiles repeated along each edge with
 *    CSS backgrounds. They take their colour from the theme, weigh nothing and
 *    print at full resolution — better than shipping 24MB of JPEGs that would
 *    print at screen DPI and could not be recoloured.
 *
 *  - Illustrated borders (jungle, sea, candy…) are hand-drawn art. Redrawing
 *    them as SVG would be worse than the originals, so those are icon strips
 *    with a themed set instead.
 *
 * Each tile is authored inside a 20x20 box. The vertical edges reuse the same
 * tile rotated, so one definition covers all four sides.
 */

const S = 20;

/** `body` is SVG markup; {c} is replaced with the border colour. */
export const BORDER_PATTERNS = {
  dotted: {
    name: 'Dotted',
    body: '<circle cx="5" cy="10" r="1.2" fill="{c}"/>' +
          '<circle cx="13" cy="10" r="1.2" fill="{c}"/>',
  },
  stars: {
    name: 'Stars',
    body: '<path d="M6 5.5 L7.2 8.6 L10.5 8.8 L7.9 10.9 L8.8 14.1 L6 12.2 L3.2 14.1 ' +
          'L4.1 10.9 L1.5 8.8 L4.8 8.6 Z" fill="{c}"/>' +
          '<circle cx="15" cy="10" r="1" fill="{c}"/>',
  },
  scroll: {
    name: 'Vine scroll',
    body: '<path d="M0 10 Q5 3 10 10 T20 10" fill="none" stroke="{c}" stroke-width="1.1" ' +
          'stroke-linecap="round"/>' +
          '<path d="M5 7.4 q-2.6 -3 -0.6 -4.5 Q7.2 4.3 5 7.4 Z" fill="{c}"/>' +
          '<path d="M15 12.6 q2.6 3 0.6 4.5 Q12.8 15.7 15 12.6 Z" fill="{c}"/>',
  },
  lattice: {
    name: 'Geometric',
    body: '<rect x="3" y="3" width="14" height="14" fill="none" stroke="{c}" stroke-width="1"/>' +
          '<path d="M10 1 L19 10 L10 19 L1 10 Z" fill="none" stroke="{c}" stroke-width="1"/>',
  },
  islamic: {
    name: 'Islamic lattice',
    body: '<path d="M10 0.5 L13 7 L19.5 10 L13 13 L10 19.5 L7 13 L0.5 10 L7 7 Z" ' +
          'fill="none" stroke="{c}" stroke-width="0.9"/>' +
          '<circle cx="10" cy="10" r="2.6" fill="none" stroke="{c}" stroke-width="0.9"/>',
  },
  greek: {
    name: 'Greek key',
    body: '<path d="M1 17 V4 H16 V14 H6 V9 H11" fill="none" stroke="{c}" ' +
          'stroke-width="1.3" stroke-linejoin="miter"/>',
  },
  wave: {
    name: 'Wave',
    body: '<path d="M0 10 Q5 4 10 10 T20 10" fill="none" stroke="{c}" ' +
          'stroke-width="1.3" stroke-linecap="round"/>',
  },
  zigzag: {
    name: 'Zigzag',
    body: '<path d="M0 14 L5 6 L10 14 L15 6 L20 14" fill="none" stroke="{c}" ' +
          'stroke-width="1.3" stroke-linejoin="round"/>',
  },
  rope: {
    name: 'Rope',
    body: '<path d="M0 6.5 Q5 10.5 10 6.5 T20 6.5" fill="none" stroke="{c}" ' +
          'stroke-width="1.1" stroke-linecap="round"/>' +
          '<path d="M0 13.5 Q5 9.5 10 13.5 T20 13.5" fill="none" stroke="{c}" ' +
          'stroke-width="1.1" stroke-linecap="round"/>',
  },
  maths: {
    name: 'Maths symbols',
    upright: true,
    body: '<text x="5" y="13.5" font-size="9" text-anchor="middle" fill="{c}" ' +
          'font-family="Inter,system-ui,sans-serif">+</text>' +
          '<text x="15" y="13.5" font-size="9" text-anchor="middle" fill="{c}" ' +
          'font-family="Inter,system-ui,sans-serif">×</text>',
  },
  numbers: {
    name: 'Numbers',
    upright: true,
    body: '<text x="5" y="13.5" font-size="8.5" text-anchor="middle" fill="{c}" ' +
          'font-family="Inter,system-ui,sans-serif">1</text>' +
          '<text x="15" y="13.5" font-size="8.5" text-anchor="middle" fill="{c}" ' +
          'font-family="Inter,system-ui,sans-serif">2</text>',
  },
  music: {
    name: 'Musical staff',
    // A staff read sideways is just a grey block, so it runs along the top
    // and bottom only — which is how the printed designs do it too.
    horizontalOnly: true,
    body: '<path d="M0 5 H20 M0 7.5 H20 M0 10 H20 M0 12.5 H20 M0 15 H20" ' +
          'fill="none" stroke="{c}" stroke-width="0.6"/>',
  },
  hearts: {
    name: 'Hearts and pearls',
    body: '<path d="M6 14 C2.2 11.2 1 9 1 7.3 C1 5.8 2.2 4.7 3.6 4.7 C4.6 4.7 5.5 5.3 6 6.2 ' +
          'C6.5 5.3 7.4 4.7 8.4 4.7 C9.8 4.7 11 5.8 11 7.3 C11 9 9.8 11.2 6 14 Z" fill="{c}"/>' +
          '<circle cx="16" cy="10" r="1.4" fill="{c}"/>',
  },
  petals: {
    name: 'Flowers',
    body: [0, 72, 144, 216, 288].map((a) =>
      `<ellipse cx="7" cy="4.6" rx="1.7" ry="3.2" fill="{c}" transform="rotate(${a} 7 10)"/>`
    ).join('') +
      '<circle cx="7" cy="10" r="1.3" fill="#fff"/>' +
      '<circle cx="16" cy="10" r="1" fill="{c}"/>',
  },
  pencils: {
    name: 'Pencils',
    upright: true,
    body: '<g transform="rotate(-20 10 10)">' +
          '<rect x="2" y="8" width="12" height="4" rx="0.6" fill="none" stroke="{c}" stroke-width="0.9"/>' +
          '<path d="M14 8 L18 10 L14 12 Z" fill="{c}"/>' +
          '<path d="M2 8 H4.6 V12 H2 Z" fill="{c}"/></g>',
  },
  bunting: {
    name: 'Bunting',
    horizontalOnly: true,
    body: '<path d="M0 5 Q10 9 20 5" fill="none" stroke="{c}" stroke-width="0.8"/>' +
          '<path d="M3 6.2 L8 7.4 L5 12.5 Z" fill="{c}"/>' +
          '<path d="M11 7.4 L16 6.2 L14.5 12.2 Z" fill="none" stroke="{c}" stroke-width="0.9"/>',
  },
};

export const PATTERN_IDS = Object.keys(BORDER_PATTERNS);

/* --------------------------------------------------------- icon strip sets */

export const ICON_SETS = {
  school:     ['🍎', '🍐', '🍊', '🍇', '🧸', '📘', '✏️', '🎨', '🧮', '⭐'],
  jungle:     ['🦁', '🐘', '🦒', '🐒', '🐅', '🌿', '🌺', '🦋', '🌴', '🐍'],
  sea:        ['🐠', '🐙', '🦀', '⭐', '🐚', '🌊', '🐟', '🐬', '🦑', '🐳'],
  candy:      ['🍬', '🍭', '🧁', '🍪', '🍩', '🍫', '🍦', '🎂', '🍓', '🧃'],
  stationery: ['✏️', '🖍️', '📏', '📐', '✂️', '📚', '📒', '🖊️', '🧮', '📎'],
  dino:       ['🦕', '🦖', '🌋', '🌴', '🥚', '🦴', '🌿', '🏔️'],
  space:      ['🚀', '⭐', '🪐', '🌙', '☄️', '🛸', '🌟', '✨'],
  flowers:    ['🌸', '🌺', '🌻', '🌷', '🍀', '🌼', '🌹', '🪷'],
  farm:       ['🐄', '🐑', '🐔', '🐣', '🚜', '🌾', '🥕', '🌽'],
  transport:  ['🚗', '🚌', '✈️', '🚂', '⛵', '🚲', '🚁', '🛺'],
};

export const ICON_SET_IDS = Object.keys(ICON_SETS);

/* -------------------------------------------------------------- rendering */

/** One tile as a data URI, coloured and optionally turned on its side. */
export function tileUrl(id, color, rotate = 0) {
  const def = BORDER_PATTERNS[id];
  if (!def) return null;
  const body = def.body.replace(/\{c\}/g, color);
  const inner = rotate ? `<g transform="rotate(${rotate} ${S / 2} ${S / 2})">${body}</g>` : body;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" ` +
    `viewBox="0 0 ${S} ${S}">${inner}</svg>`;
  // encodeURIComponent rather than base64: smaller, and readable in devtools.
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Four tiled strips, one per edge. CSS background tiling handles the repeat,
 * which is both simpler and more reliable than trying to lay out an SVG
 * pattern across a page whose size is only known at print time.
 */
export function PatternBorder({ id, color = '#2b2b2b', band = 7 }) {
  const def = BORDER_PATTERNS[id];
  if (!def) return null;

  const h = tileUrl(id, color, 0);
  // Letters and directional motifs stay upright on the side edges; abstract
  // ones are turned so the pattern follows the edge.
  const v = tileUrl(id, color, def.upright ? 0 : 90);
  const mm = `${band}mm`;

  const edge = (extra) => ({
    position: 'absolute',
    backgroundSize: `${mm} ${mm}`,
    ...extra,
  });

  return (
    <div className="page-border" aria-hidden="true">
      <span style={edge({ top: 0, left: 0, right: 0, height: mm,
                          backgroundImage: h, backgroundRepeat: 'repeat-x' })} />
      <span style={edge({ bottom: 0, left: 0, right: 0, height: mm,
                          backgroundImage: h, backgroundRepeat: 'repeat-x' })} />
      {!def.horizontalOnly && (
        <>
          <span style={edge({ top: 0, bottom: 0, left: 0, width: mm,
                              backgroundImage: v, backgroundRepeat: 'repeat-y' })} />
          <span style={edge({ top: 0, bottom: 0, right: 0, width: mm,
                              backgroundImage: v, backgroundRepeat: 'repeat-y' })} />
        </>
      )}
    </div>
  );
}

/** The illustrated family: a repeating strip of themed emoji. */
export function IconBorder({ set = 'school', size = 7 }) {
  const icons = ICON_SETS[set] || ICON_SETS.school;
  const out = [];
  let n = 0;
  const pick = () => icons[n++ % icons.length];

  const across = 14;
  const down = 18;
  for (let i = 0; i < across; i++) {
    const x = 2 + (i * 95) / (across - 1);
    out.push(<span key={`t${i}`} style={{ top: '3mm', left: `${x}%` }}>{pick()}</span>);
    out.push(<span key={`b${i}`} style={{ bottom: '3mm', left: `${x}%` }}>{pick()}</span>);
  }
  for (let i = 1; i < down; i++) {
    const y = 2 + (i * 95) / down;
    out.push(<span key={`l${i}`} style={{ left: '3mm', top: `${y}%` }}>{pick()}</span>);
    out.push(<span key={`r${i}`} style={{ right: '3mm', top: `${y}%` }}>{pick()}</span>);
  }
  return (
    <div className="sheet-frame icons" style={{ fontSize: `${size}mm` }} aria-hidden="true">
      {out}
    </div>
  );
}
