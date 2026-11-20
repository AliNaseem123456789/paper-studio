/**
 * Finding and filling the pictures a document is still missing.
 *
 * When the model cannot find a library slug that fits, it writes
 * `generate: "a cartoon brain"` instead. Those render as a placeholder until
 * something draws them. These helpers walk the document for such slots and
 * patch the results back in.
 */

/** Every slot with a generate prompt and no picture yet. */
export function pendingPictures(doc) {
  const out = [];
  if (!doc?.pages) return out;

  const check = (owner, obj, key) => {
    if (obj && obj.generate && !obj.assetId) {
      out.push({ prompt: String(obj.generate).trim(), ...owner, key });
    }
  };

  for (const [pi, page] of (doc.pages || []).entries()) {
    for (const [bi, b] of (page.blocks || []).entries()) {
      const c = b.content || {};

      // image block
      check({ pi, bi, kind: 'block' }, c);

      // question items, match pairs, list items, nested section blocks
      for (const field of ['items', 'left']) {
        for (const [ii, it] of (c[field] || []).entries()) {
          check({ pi, bi, ii, field, kind: 'item' }, it);
        }
      }
      for (const [ii, it] of (c.items || []).entries()) {
        if (it && typeof it === 'object') check({ pi, bi, ii, field: 'items', kind: 'item' }, it);
      }
      for (const [ci, child] of (c.blocks || []).entries()) {
        const cc = child?.content || {};
        check({ pi, bi, ci, kind: 'child' }, cc);
        for (const [ii, it] of (cc.items || []).entries()) {
          check({ pi, bi, ci, ii, field: 'items', kind: 'childItem' }, it);
        }
      }
    }
  }

  // Dedupe the same slot found twice by the overlapping walks above.
  const seen = new Set();
  return out.filter((s) => {
    const k = [s.pi, s.bi, s.ci, s.ii, s.field].join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** How many distinct pictures actually need drawing. */
export function distinctPrompts(slots) {
  return [...new Set(slots.map((s) => s.prompt))];
}

/** Write the generated assetIds back into the document. */
export function applyFill(doc, slots, map) {
  const next = structuredClone(doc);

  for (const s of slots) {
    const assetId = map[s.prompt];
    if (!assetId) continue;
    const block = next.pages[s.pi]?.blocks[s.bi];
    if (!block) continue;

    const target =
      s.kind === 'block' ? block.content
      : s.kind === 'item' ? block.content?.[s.field]?.[s.ii]
      : s.kind === 'child' ? block.content?.blocks?.[s.ci]?.content
      : block.content?.blocks?.[s.ci]?.content?.[s.field]?.[s.ii];

    if (target) {
      target.assetId = assetId;
      target.generate = '';
    }
  }
  return next;
}

/** Rough price per picture, for warning before spending. */
export const USD_PER_PICTURE = 0.05;
