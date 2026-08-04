import type { AppContext } from '../context';
import type { Block } from '../../types';
import { findBlockById, renderBlockTree, genId } from '../../utils';
import { saveClips, saveAndSyncContent } from '../../store';
import { renderReviewInbox } from './review';

export function initEditorDragDrop(ctx: AppContext) {
  let draggedBlockId: string | null = null;
  
  ctx.elements.edBody.addEventListener('dragstart', e => {
    const target = e.target as HTMLElement;
    const handle = target.closest('.block-drag-handle');
    if (!handle) {
      e.preventDefault();
      return;
    }
    
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (blockEl) {
      draggedBlockId = blockEl.dataset.id!;
      blockEl.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', draggedBlockId);
        e.dataTransfer.effectAllowed = 'move';
      }
    }
  });

  ctx.elements.edBody.addEventListener('dragover', e => {
    const target = e.target as HTMLElement;
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl || blockEl.dataset.id === draggedBlockId) return;
    
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    
    const rect = blockEl.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const isTop = mouseY < rect.height / 2;
    
    blockEl.classList.toggle('drag-over-top', isTop);
    blockEl.classList.toggle('drag-over-bottom', !isTop);
  });

  ctx.elements.edBody.addEventListener('dragleave', e => {
    const target = e.target as HTMLElement;
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (blockEl) {
      blockEl.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  });

  ctx.elements.edBody.addEventListener('dragend', () => {
    ctx.elements.edBody.querySelectorAll('.block-wrapper').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging');
    });
    draggedBlockId = null;
  });

  ctx.elements.edBody.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const destBlockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!destBlockEl) return;
    
    const dragData = e.dataTransfer?.getData('text/plain') || '';
    if (dragData.startsWith('CLIP:')) {
      const parts = dragData.split(':');
      const clipContent = parts.slice(1, -1).join(':');
      const clipId = parts[parts.length - 1];

      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      
      const destMatch = findBlockById(n.blocks, destBlockEl.dataset.id!);
      if (destMatch) {
        const newBlock: Block = {
          id: genId(),
          type: 'paragraph',
          content: clipContent,
          children: []
        };
        const destIndex = destMatch.parentList.indexOf(destMatch.block);
        destMatch.parentList.splice(destIndex + 1, 0, newBlock);

        const clip = ctx.st.clips.find(c => c.id === clipId);
        if (clip) {
          clip.archived = true;
          saveClips(ctx.st.clips);
          renderReviewInbox(ctx);
        }

        ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
        saveAndSyncContent();
        ctx.markSaving();
      }
      return;
    }
    
    if (!draggedBlockId || destBlockEl.dataset.id === draggedBlockId) return;
    
    const isTop = destBlockEl.classList.contains('drag-over-top');
    destBlockEl.classList.remove('drag-over-top', 'drag-over-bottom');
    
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    
    const dragMatch = findBlockById(n.blocks, draggedBlockId);
    const destMatch = findBlockById(n.blocks, destBlockEl.dataset.id!);
    
    if (dragMatch && destMatch) {
      const dragIndex = dragMatch.parentList.indexOf(dragMatch.block);
      if (dragIndex !== -1) {
        dragMatch.parentList.splice(dragIndex, 1);
      }
      
      let destIndex = destMatch.parentList.indexOf(destMatch.block);
      const insertOffset = isTop ? 0 : 1;
      destMatch.parentList.splice(destIndex + insertOffset, 0, dragMatch.block);
      
      ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
      saveAndSyncContent();
      ctx.markSaving();
    }
  });
}
