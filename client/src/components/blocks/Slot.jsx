import React, { useState } from 'react';
import { Asset } from './Blocks.jsx';
import { useEdit, isSel } from '../EditContext.jsx';

/**
 * One picture inside a question — its own click target.
 *
 * Click selects it and opens the library. Drag it onto another slot in the
 * same question to swap their order. When not editing it is plain markup, so
 * printing is unaffected.
 */
export default function Slot({ blockId, index, item, size = '12mm', className = '' }) {
  const { editable, sel, select, openPicker, moveItem } = useEdit();
  const [over, setOver] = useState(false);

  const picture = (
    <Asset
      id={item.assetId}
      generate={item.generate}
      assets={undefined}
      size={size}
      fallbackGlyph={item.icon}
    />
  );

  if (!editable) {
    return <span className={`slot ${className}`}>{picture}</span>;
  }

  const selected = isSel(sel, blockId, index);

  return (
    <span
      className={`slot editable ${className}` +
                 `${selected ? ' selected' : ''}${over ? ' dropping' : ''}`}
      role="button"
      tabIndex={0}
      title="Click to change this picture · drag to reorder"
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', JSON.stringify({ blockId, index }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        try {
          const from = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (from.blockId === blockId && from.index !== index) {
            moveItem(blockId, from.index, index);
          }
        } catch { /* not one of ours */ }
      }}
      onClick={(e) => {
        e.stopPropagation();
        select(blockId, index);
        openPicker({ blockId, index });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(blockId, index);
          openPicker({ blockId, index });
        }
      }}
    >
      {picture}
      <span className="slot-badge">⇆</span>
    </span>
  );
}
