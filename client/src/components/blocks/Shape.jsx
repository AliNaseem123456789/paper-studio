import React from 'react';
import { SHAPES, resolveShape } from './shapes.js';

/**
 * Renders one shape to fill its block.
 *
 * preserveAspectRatio="none" is what makes a shape stretch with the box
 * instead of staying square, and vectorEffect keeps the outline the same
 * weight however far it is stretched.
 */
export default function ShapeSvg({
  kind, stroke, fill, width = 2, dashed = false, className = '',
  flipX = false, flipY = false,
}) {
  const id = resolveShape(kind);
  const def = SHAPES[id];
  const { tag, attrs } = def.el;
  const El = tag;

  /* Mirroring inside the viewBox rather than with a CSS transform keeps the
     stroke weight and the hit area correct. A line drawn down-right is the
     same shape as one drawn up-right, flipped. */
  const transform = [
    flipX ? 'translate(100,0) scale(-1,1)' : '',
    flipY ? 'translate(0,100) scale(1,-1)' : '',
  ].filter(Boolean).join(' ') || undefined;

  return (
    <svg
      className={`shape-svg ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={transform}>
        <El
          {...attrs}
          fill={def.open ? 'none' : (fill || 'none')}
          stroke={stroke || 'currentColor'}
          strokeWidth={width}
          strokeDasharray={dashed ? '6 4' : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}

/** The little preview used in the picker grid. */
export function ShapeIcon({ kind }) {
  const def = SHAPES[resolveShape(kind)];
  const { tag, attrs } = def.el;
  const El = tag;
  return (
    <svg viewBox="0 0 100 100" className="shape-icon" xmlns="http://www.w3.org/2000/svg">
      <El
        {...attrs}
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
