// Barrel re-exports — all utils are now in focused domain modules
// This file preserves backward compatibility for existing imports from '../utils' or '../../utils'

export { genId, esc, strip } from './stringHelpers';
export { isCaretAtStart, isCaretAtEnd, moveCaret, setCaretAtOffset, setEdBodyHtml } from './domHelpers';
export { findBlockById, getBlockLevel, flattenBlocks, flattenVisibleBlocks, getBlocksText, isParentEligibleBlock, isInsideToggleBlock } from './blockTree';
export { htmlToBlocks, blocksToHtml, renderLinksInContent, renderBlockTree } from './blockRenderer';
export { extractLinks, resolveNoteId, getReferencedNoteIds, calculateSubGraphClosure, findNotebookForParent } from './noteGraph';
