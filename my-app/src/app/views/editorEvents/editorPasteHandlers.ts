import type { AppContext } from '../../context';
import type { Block, BlockType } from '../../../types';
import { findBlockById, genId, esc } from '../../../utils';
import { saveAndSyncContent } from '../../../store';
import { rerenderNote } from './pickers/editorPopups';
import { pushToUndo } from './editorHistory';

export function isNonTextFieldBlock(t: string) {
  return ['divider', 'image', 'video', 'audio', 'pdf', 'bookmark', 'file', 'toc', 'breadcrumb', 'math', 'equation'].includes(t);
}

export function handleEditorPaste(ctx: AppContext, e: ClipboardEvent) {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  const files = clipboardData.files;
  if (files && files.length > 0) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, blockId);
    if (!match) return;

    pushToUndo(ctx, n);

    const { parentList, index, block: currentBlock } = match;

    let insertIndex = index;
    let isFirst = true;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let blockType: BlockType = 'file';
      if (file.type.startsWith('image/')) blockType = 'image';
      else if (file.type.startsWith('video/')) blockType = 'video';
      else if (file.type.startsWith('audio/')) blockType = 'audio';
      else if (file.type === 'application/pdf') blockType = 'pdf';

      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const newBlock: Block = {
          id: genId(),
          type: blockType,
          url,
          content: file.name,
          fileName: file.name,
          children: []
        };

        let blockToTrack = newBlock;
        if (isFirst && (currentBlock.type === 'paragraph' || currentBlock.type === 'bullet') && !currentBlock.content.trim()) {
          currentBlock.type = blockType;
          currentBlock.url = url;
          currentBlock.content = file.name;
          currentBlock.fileName = file.name;
          blockToTrack = currentBlock;
          isFirst = false;
        } else {
          parentList.splice(insertIndex + 1, 0, newBlock);
          insertIndex++;
        }

        const targetIndex = parentList.indexOf(blockToTrack);
        if (targetIndex !== -1) {
          const nextBlock = parentList[targetIndex + 1];
          if (!nextBlock || isNonTextFieldBlock(nextBlock.type)) {
            parentList.splice(targetIndex + 1, 0, {
              id: genId(),
              type: 'paragraph',
              content: '',
              children: []
            });
          }
        }

        rerenderNote(ctx, n);
      };
      reader.readAsDataURL(file);
    }
    return;
  }

  const pastedText = clipboardData.getData('text');
  const isUrl = /^(https?:\/\/[^\s]+)$/i.test(pastedText.trim());
  if (isUrl) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      e.preventDefault();
      const range = selection.getRangeAt(0);
      const selectedHtml = range.toString();
      const linkHtml = `<a href="${pastedText.trim()}" target="_blank" style="color: var(--accent); text-decoration: underline;">${esc(selectedHtml)}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
      
      const target = e.target as HTMLElement;
      const blockEl = target.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        const blockId = blockEl.dataset.id!;
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, blockId);
          if (match) {
            const textEl = blockEl.querySelector('.block-text-field') as HTMLElement;
            match.block.content = textEl.innerHTML;
            saveAndSyncContent();
            ctx.markSaving();
          }
        }
      }
    }
  }
}
