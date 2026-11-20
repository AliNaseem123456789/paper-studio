// Themes are pure token sets. They become CSS custom properties on the sheet
// root, so switching a theme is instant and never touches content.
//
// Borders are a token too: 'none' | 'hairline' | 'double' | 'corners' |
// 'icons' | 'frame'. Only 'icons' and 'frame' draw anything decorative.

// Plain rules, then the drawn patterns, then the illustrated icon strips.
// The client owns the pattern artwork; the server only needs the names.
export const BORDER_STYLES = {
  none:     'Plain — no border',
  hairline: 'Thin rule',
  double:   'Double rule',
  corners:  'Corner ornaments',
  frame:    'Coloured frame',

  dotted:   'Dotted',
  stars:    'Stars',
  scroll:   'Vine scroll',
  lattice:  'Geometric',
  islamic:  'Islamic lattice',
  greek:    'Greek key',
  wave:     'Wave',
  zigzag:   'Zigzag',
  rope:     'Rope',
  maths:    'Maths symbols',
  numbers:  'Numbers',
  music:    'Musical staff',
  hearts:   'Hearts and pearls',
  petals:   'Flowers',
  pencils:  'Pencils',
  bunting:  'Bunting',

  icons:    'Icons — school',
  'icons:jungle':     'Icons — jungle animals',
  'icons:sea':        'Icons — sea life',
  'icons:candy':      'Icons — sweets',
  'icons:stationery': 'Icons — stationery',
  'icons:dino':       'Icons — dinosaurs',
  'icons:space':      'Icons — space',
  'icons:flowers':    'Icons — flowers',
  'icons:farm':       'Icons — farm',
  'icons:transport':  'Icons — transport',
};

export const THEMES = {
  classic: {
    name: 'Classic',
    swatch: ['#16181d', '#1a5fb4'],
    tokens: {
      ink: '#16181d', accent: '#1a5fb4', accent2: '#0b5fa5',
      paper: '#ffffff', rule: '#2b2b2b', muted: '#5a5f66',
      headFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radius: '2mm', pad: '14mm',
      border: 'hairline', borderColor: '#2b2b2b',
      badge: 'circle', sectionStyle: 'outlined',
      headAlign: 'center',
    },
  },

  sunny: {
    name: 'Sunny',
    swatch: ['#b8560f', '#f5a524'],
    tokens: {
      ink: '#2b1c08', accent: '#b8560f', accent2: '#f5a524',
      paper: '#fffdf7', rule: '#8a6632', muted: '#7a6440',
      headFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radius: '3mm', pad: '16mm',
      border: 'icons', borderColor: '#f5a524',
      badge: 'circle', sectionStyle: 'pill-header',
      headAlign: 'center',
    },
  },

  poster: {
    name: 'Poster',
    swatch: ['#1f7a3d', '#2563c9'],
    tokens: {
      ink: '#14202b', accent: '#1f7a3d', accent2: '#2563c9',
      paper: '#ffffff', rule: '#4a5560', muted: '#5a6570',
      headFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radius: '4mm', pad: '10mm',
      border: 'frame', borderColor: '#2563c9',
      badge: 'pill', sectionStyle: 'pill-header',
      headAlign: 'center',
    },
  },

  slate: {
    name: 'Slate',
    swatch: ['#2f3640', '#55606e'],
    tokens: {
      ink: '#1b1f25', accent: '#2f3640', accent2: '#55606e',
      paper: '#ffffff', rule: '#2f3640', muted: '#69727d',
      headFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radius: '0', pad: '15mm',
      border: 'double', borderColor: '#2f3640',
      badge: 'square', sectionStyle: 'flat',
      headAlign: 'center',
    },
  },

  rose: {
    name: 'Rose',
    swatch: ['#a4307a', '#e06bb0'],
    tokens: {
      ink: '#2a1020', accent: '#a4307a', accent2: '#e06bb0',
      paper: '#fffafd', rule: '#89486f', muted: '#7c5a6e',
      headFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radius: '4mm', pad: '15mm',
      border: 'corners', borderColor: '#e06bb0',
      badge: 'pill', sectionStyle: 'shadow',
      headAlign: 'center',
    },
  },

  plain: {
    name: 'Plain',
    swatch: ['#000000', '#555555'],
    tokens: {
      ink: '#000000', accent: '#000000', accent2: '#333333',
      paper: '#ffffff', rule: '#000000', muted: '#555555',
      headFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      radius: '0', pad: '18mm',
      border: 'none', borderColor: '#000000',
      badge: 'none', sectionStyle: 'flat',
      headAlign: 'start',
    },
  },
};

/** Palette used by the coloured section panels, cycled by index. */
export const SECTION_PALETTE = [
  '#1f7a3d', '#2563c9', '#b8560f', '#8e3bb0',
  '#c0392b', '#0f8f98', '#5a7a1f', '#a4307a',
];

export function themeTokens(id, overrides = {}) {
  const t = THEMES[id] || THEMES.classic;
  return { ...t.tokens, ...overrides };
}

export function themeList() {
  return Object.entries(THEMES).map(([id, t]) => ({
    id, name: t.name, swatch: t.swatch, border: t.tokens.border,
  }));
}
