/**
 * Shape library.
 *
 * Every shape is drawn in a 0 0 100 100 viewBox with
 * preserveAspectRatio="none", so it stretches to whatever box the block is
 * given — drag a corner and the shape follows, exactly like Paint.
 *
 * `el` is the SVG element; `open` marks shapes that are a stroke rather than
 * an enclosed area, so the fill control is hidden for them.
 */

const poly = (points) => ({ tag: 'polygon', attrs: { points } });
const path = (d) => ({ tag: 'path', attrs: { d } });

export const SHAPES = {
  // Drawn top-left to bottom-right, so a line dragged that way needs no
  // flip at all and the flip flags read the same as the drag direction.
  line:        { name: 'Line',  open: true,
                 el: { tag: 'line', attrs: { x1: 4, y1: 4, x2: 96, y2: 96 } } },
  curve:       { name: 'Curve', open: true,
                 el: path('M4,72 Q28,8 50,48 T96,24') },
  oval:        { name: 'Oval',
                 el: { tag: 'ellipse', attrs: { cx: 50, cy: 50, rx: 46, ry: 36 } } },
  rect:        { name: 'Rectangle',
                 el: { tag: 'rect', attrs: { x: 4, y: 14, width: 92, height: 72 } } },
  roundRect:   { name: 'Rounded rectangle',
                 el: { tag: 'rect', attrs: { x: 4, y: 14, width: 92, height: 72, rx: 14 } } },
  parallelogram: { name: 'Parallelogram',
                 el: poly('26,14 96,14 74,86 4,86') },
  triangle:    { name: 'Triangle',   el: poly('50,8 96,92 4,92') },
  rightTri:    { name: 'Right triangle', el: poly('6,8 6,92 94,92') },

  diamond:     { name: 'Diamond',  el: poly('50,6 94,50 50,94 6,50') },
  pentagon:    { name: 'Pentagon', el: poly('50,5 95,38 78,92 22,92 5,38') },
  hexagon:     { name: 'Hexagon',  el: poly('28,8 72,8 96,50 72,92 28,92 4,50') },

  arrowRight:  { name: 'Arrow right', el: poly('4,34 58,34 58,10 96,50 58,90 58,66 4,66') },
  arrowLeft:   { name: 'Arrow left',  el: poly('96,34 42,34 42,10 4,50 42,90 42,66 96,66') },
  arrowUp:     { name: 'Arrow up',    el: poly('34,96 34,42 10,42 50,4 90,42 66,42 66,96') },
  arrowDown:   { name: 'Arrow down',  el: poly('34,4 34,58 10,58 50,96 90,58 66,58 66,4') },

  star4:       { name: '4-point star',
                 el: poly('50,4 61,39 96,50 61,61 50,96 39,61 4,50 39,39') },
  star5:       { name: '5-point star',
                 el: poly('50,4 62,36 96,38 69,59 79,92 50,72 21,92 31,59 4,38 38,36') },
  star6:       { name: '6-point star',
                 el: poly('50,4 63,30 92,26 78,50 92,74 63,70 50,96 37,70 8,74 22,50 8,26 37,30') },

  speechRect:  { name: 'Speech box',
                 el: path('M8,10 H92 A8,8 0 0 1 100,18 V64 A8,8 0 0 1 92,72 H44 L24,94 L28,72 H8 A8,8 0 0 1 0,64 V18 A8,8 0 0 1 8,10 Z') },
  speechOval:  { name: 'Speech bubble',
                 el: path('M50,8 C78,8 96,24 96,42 C96,60 78,76 50,76 H42 L20,94 L26,74 C10,68 4,56 4,42 C4,24 22,8 50,8 Z') },
  thought:     { name: 'Thought bubble',
                 el: path('M28,26 A18,18 0 0 1 60,16 A16,16 0 0 1 86,30 A14,14 0 0 1 84,58 H30 A16,16 0 0 1 28,26 Z M24,68 A7,7 0 1 1 24,69 Z M14,86 A5,5 0 1 1 14,87 Z') },

  heart:       { name: 'Heart',
                 el: path('M50,92 C20,70 4,52 4,33 C4,18 16,8 29,8 C38,8 46,13 50,21 C54,13 62,8 71,8 C84,8 96,18 96,33 C96,52 80,70 50,92 Z') },
  lightning:   { name: 'Lightning',
                 el: poly('56,4 20,56 44,56 36,96 78,40 52,40 68,4') },
  cloud:       { name: 'Cloud',
                 el: path('M26,78 A22,22 0 0 1 28,34 A24,24 0 0 1 72,26 A20,20 0 0 1 80,78 Z') },
  cross:       { name: 'Cross',
                 el: poly('38,4 62,4 62,38 96,38 96,62 62,62 62,96 38,96 38,62 4,62 4,38 38,38') },
  tick:        { name: 'Tick', open: true,
                 el: path('M8,52 L36,82 L92,16') },
};

export const SHAPE_IDS = Object.keys(SHAPES);

/** Default when a document or the model asks for a shape without naming one. */
export const DEFAULT_SHAPE = 'rect';

/** v1 documents and loose model output used these names. */
export const SHAPE_ALIASES = {
  circle: 'oval',
  ellipse: 'oval',
  rectangle: 'rect',
  square: 'rect',
  arrow: 'arrowRight',
  star: 'star5',
  speech: 'speechOval',
  bubble: 'speechOval',
  check: 'tick',
  checkmark: 'tick',
  x: 'cross',
};

export const resolveShape = (kind) =>
  SHAPES[kind] ? kind
    : SHAPES[SHAPE_ALIASES[kind]] ? SHAPE_ALIASES[kind]
    : DEFAULT_SHAPE;
