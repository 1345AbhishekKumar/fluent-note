import type { AppContext } from '../context';
import type { Block } from '../../types';
import { findBlockById, renderBlockTree, genId, setEdBodyHtml, isParentEligibleBlock, isInsideToggleBlock } from '../../utils';
import { saveClips, saveAndSyncContent } from '../../store';
import { renderReviewInbox } from './review';
import { pushToUndo } from './editorEvents/editorHistory';
import { renderMermaidDiagramsInContainer } from '../../utils/mermaidRenderer';
import { duplicateBlockWithNewIds } from './editorEvents/editorHelpers';

function isDescendantBlock(block: Block, targetId: string): boolean {
  if (block.id === targetId) return true;
  if (block.children) {
    for (const child of block.children) {
      if (isDescendantBlock(child, targetId)) return true;
    }
  }
  return false;
}

function clearDragClasses(container: HTMLElement) {
  container.querySelectorAll('.block-wrapper').forEach(el => {
    el.classList.remove(
      'drag-over-top',
      'drag-over-bottom',
      'drag-over-indent-child',
      'drag-over-col-left',
      'drag-over-col-right',
      'dragging'
    );
  });
}

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

    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    
    const rect = blockEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const destMatch = findBlockById(n.blocks, blockEl.dataset.id!);
    const destType = destMatch ? destMatch.block.type : 'paragraph';
    const isColumnRestricted = isInsideToggleBlock(n.blocks, blockEl.dataset.id!);

    // Reset indicator classes on target
    blockEl.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-indent-child', 'drag-over-col-left', 'drag-over-col-right');

    // 1. Column creation (vertical lines at far left or far right edges)
    if (!isColumnRestricted && destType !== 'column' && destType !== 'column_list') {
      if (mouseX < 20) {
        blockEl.classList.add('drag-over-col-left');
        return;
      }
      if (mouseX > rect.width - 20) {
        blockEl.classList.add('drag-over-col-right');
        return;
      }
    }

    // 2. Child nesting vs Reordering
    const isTop = mouseY < rect.height * 0.3;
    const isBottom = mouseY > rect.height * 0.7;

    if (isTop) {
      blockEl.classList.add('drag-over-top');
    } else if (isBottom) {
      blockEl.classList.add('drag-over-bottom');
    } else {
      // Middle zone: check if mouse is indented and target can accept children
      const canHaveChildren = isParentEligibleBlock(destType);
      if (canHaveChildren && mouseX > 24) {
        blockEl.classList.add('drag-over-indent-child');
      } else if (mouseY < rect.height * 0.5) {
        blockEl.classList.add('drag-over-top');
      } else {
        blockEl.classList.add('drag-over-bottom');
      }
    }
  });

  ctx.elements.edBody.addEventListener('dragleave', e => {
    const target = e.target as HTMLElement;
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (blockEl) {
      blockEl.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-indent-child', 'drag-over-col-left', 'drag-over-col-right');
    }
  });

  ctx.elements.edBody.addEventListener('dragend', () => {
    clearDragClasses(ctx.elements.edBody);
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

        setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
        saveAndSyncContent();
        ctx.markSaving();
      }
      return;
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const destMatch = findBlockById(n.blocks, destBlockEl.dataset.id!);
      if (!destMatch) return;

      (async () => {
        let insertIndex = destMatch.parentList.indexOf(destMatch.block) + 1;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = (file as any).path;
          let fileUrl = '';
          if (filePath && typeof window !== 'undefined' && window.electronAPI?.copyAssetToVault) {
            try {
              const res = await window.electronAPI.copyAssetToVault(filePath);
              if (res?.url) fileUrl = res.url;
            } catch (err) {
              console.error('Error copying dropped asset:', err);
            }
          }

          let blockType: any = 'file';
          if (file.type.startsWith('image/')) blockType = 'image';
          else if (file.type.startsWith('video/')) blockType = 'video';
          else if (file.type.startsWith('audio/')) blockType = 'audio';
          else if (file.type === 'application/pdf') blockType = 'pdf';

          const newBlock: Block = {
            id: genId(),
            type: blockType,
            content: file.name,
            fileName: file.name,
            url: fileUrl,
            children: []
          };

          destMatch.parentList.splice(insertIndex++, 0, newBlock);
        }
        setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
        saveAndSyncContent();
        ctx.markSaving();
      })();
      return;
    }
    
    if (!draggedBlockId || destBlockEl.dataset.id === draggedBlockId) return;
    
    const isTop = destBlockEl.classList.contains('drag-over-top');
    const isChild = destBlockEl.classList.contains('drag-over-indent-child');
    const isColLeft = destBlockEl.classList.contains('drag-over-col-left');
    const isColRight = destBlockEl.classList.contains('drag-over-col-right');

    clearDragClasses(ctx.elements.edBody);
    
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    
    const dragMatch = findBlockById(n.blocks, draggedBlockId);
    const destMatch = findBlockById(n.blocks, destBlockEl.dataset.id!);
    
    if (dragMatch && destMatch) {
      // Prevent circular nesting (cannot drop a parent onto or relative to any of its own descendants)
      if (isDescendantBlock(dragMatch.block, destMatch.block.id)) {
        return;
      }

      pushToUndo(ctx, n);

      let blockToInsert = dragMatch.block;
      if (e.altKey) {
        blockToInsert = duplicateBlockWithNewIds(dragMatch.block);
      } else {
        // Remove dragged block from its original location
        const dragIndex = dragMatch.parentList.indexOf(dragMatch.block);
        if (dragIndex !== -1) {
          dragMatch.parentList.splice(dragIndex, 1);
        }
      }
      
      if (isColLeft || isColRight) {
        // Multi-column layout creation
        const destIndex = destMatch.parentList.indexOf(destMatch.block);
 
        if (destMatch.parentList !== n.blocks && destMatch.block.type === 'column') {
          // Add column to existing column list
          const newCol: Block = { id: genId(), type: 'column', content: '', children: [blockToInsert] };
          const colInsertIdx = isColLeft ? destIndex : destIndex + 1;
          destMatch.parentList.splice(colInsertIdx, 0, newCol);
        } else {
          // Wrap target block & dragged block in a new column_list
          const col1Children = isColLeft ? [blockToInsert] : [destMatch.block];
          const col2Children = isColLeft ? [destMatch.block] : [blockToInsert];
 
          const col1: Block = { id: genId(), type: 'column', content: '', children: col1Children };
          const col2: Block = { id: genId(), type: 'column', content: '', children: col2Children };
 
          const colList: Block = {
            id: genId(),
            type: 'column_list',
            content: '',
            children: [col1, col2]
          };
 
          if (destIndex !== -1) {
            destMatch.parentList.splice(destIndex, 1, colList);
          }
        }
      } else if (isChild && isParentEligibleBlock(destMatch.block.type)) {
        if (!destMatch.block.children) destMatch.block.children = [];
        destMatch.block.children.push(blockToInsert);
        if (destMatch.block.collapsed) {
          destMatch.block.collapsed = false;
        }
      } else {
        let destIndex = destMatch.parentList.indexOf(destMatch.block);
        const insertOffset = isTop ? 0 : 1;
        destMatch.parentList.splice(destIndex + insertOffset, 0, blockToInsert);
      }
      
      setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
      renderMermaidDiagramsInContainer(ctx.elements.edBody, ctx.api.theme);
      saveAndSyncContent();
      ctx.markSaving();
    }
  });
}

