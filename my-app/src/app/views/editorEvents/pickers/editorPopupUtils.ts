import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { moveCaret, renderBlockTree, setEdBodyHtml } from '../../../../utils';
import { saveAndSyncContent } from '../../../../store';

import { renderMermaidDiagramsInContainer } from '../../../../utils/mermaidRenderer';
import { renderHtmlPreviewsInContainer } from '../../../../utils/htmlPreviewRenderer';

export function rerenderNote(ctx: AppContext, n: Note) {
  setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
  renderMermaidDiagramsInContainer(ctx.elements.edBody, ctx.api?.theme);
  renderHtmlPreviewsInContainer(ctx.elements.edBody, ctx.api?.theme);
  saveAndSyncContent();
  ctx.markSaving();
}

export function rerenderSelectionStyles(ctx: AppContext) {
  const selectedIds = ctx.st.selectedBlockIds || new Set<string>();
  ctx.elements.edBody.querySelectorAll('.block-wrapper').forEach(el => {
    const bId = (el as HTMLElement).dataset.id;
    if (bId) {
      el.classList.toggle('selected', selectedIds.has(bId));
    }
  });
}

export function focusNextBlockOrNew(ctx: AppContext, n: Note, index: number, parentList: Block[]) {
  if (index + 1 < parentList.length) {
    const nextBlock = parentList[index + 1];
    setTimeout(() => {
      const field = ctx.elements.edBody.querySelector(`[data-id="${nextBlock.id}"] .block-text-field`) as HTMLElement;
      if (field) moveCaret(field, true);
    }, 50);
  } else {
    const newBlockId = 'b' + Math.random().toString(36).slice(2, 7);
    const newBlock: Block = { id: newBlockId, type: 'paragraph', content: '', children: [] };
    parentList.push(newBlock);
    rerenderNote(ctx, n);
    setTimeout(() => {
      const field = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
      if (field) moveCaret(field, true);
    }, 50);
  }
}
