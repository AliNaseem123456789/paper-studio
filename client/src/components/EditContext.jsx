import { createContext, useContext } from 'react';

/**
 * Editing state, shared with every renderer in the tree.
 *
 * Selection is addressed by (blockId, itemIndex). itemIndex is null when the
 * whole block is selected. That is what makes each picture inside a question
 * its own target instead of the question being one lump.
 *
 * Context rather than props because pictures live four levels deep -- inside a
 * question renderer, inside a block, inside a page.
 */
export const EditContext = createContext({
  editable: false,
  sel: { blockId: null, itemIndex: null },
  select: () => {},
  patchItem: () => {},
  moveItem: () => {},
  openPicker: () => {},
  moveBlock: () => {},
});

export const useEdit = () => useContext(EditContext);

export const isSel = (sel, blockId, itemIndex = null) =>
  sel?.blockId === blockId && sel?.itemIndex === itemIndex;
