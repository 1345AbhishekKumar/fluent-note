import type { AppContext } from '../../context';
import type { Block, Note, FlyoutItem } from '../../../types';
import { findBlockById, genId } from '../../../utils';
import { duplicateBlockWithNewIds } from './editorHelpers';
import { 
  rerenderNote, rerenderSelectionStyles, openMediaFilePrompt, openUrlPopupEditor,
  openMentionPicker, openDatePicker, openTexPrompt, openEmojiPicker 
} from './pickers/editorPopups';
import { pushToUndo } from './editorHistory';

export function handleDragHandleClick(ctx: AppContext, e: MouseEvent, dragHandle: HTMLElement) {
  e.preventDefault();
  e.stopPropagation();
  const blockEl = dragHandle.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return;
  const bId = blockEl.dataset.id!;
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;
  const match = findBlockById(n.blocks, bId);
  if (match) {
    ctx.st.selectedBlockIds = new Set([bId]);
    rerenderSelectionStyles(ctx);
    
    const menuItems: FlyoutItem[] = [
      { label: 'Duplicate', icon: '⧉', action: () => {
        pushToUndo(ctx, n);
        const clone = duplicateBlockWithNewIds(match.block);
        match.parentList.splice(match.index + 1, 0, clone);
        rerenderNote(ctx, n);
      }},
      { label: 'Move to', icon: '↗', action: () => {
        const targets = ctx.st.notes.filter(x => x.id !== n.id);
        if (targets.length === 0) { ctx.toast('No other notes to move to', '', () => {}); return; }
        const picker = document.createElement('div');
        picker.className = 'slash-menu mention-picker';
        picker.innerHTML = targets.slice(0, 12).map((t, i) =>
          `<button class="slash-item" data-index="${i}"><span class="slash-item-icon">📄</span><span class="slash-item-label">${t.title || 'Untitled'}</span></button>`
        ).join('');
        const bEl = ctx.elements.edBody.querySelector(`[data-id="${bId}"]`) as HTMLElement;
        const rect = bEl?.getBoundingClientRect();
        const innerRect = ctx.elements.edInner.getBoundingClientRect();
        if (rect) {
          picker.style.left = (rect.left - innerRect.left) + 'px';
          picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
        }
        ctx.elements.edInner.appendChild(picker);
        picker.querySelectorAll('.slash-item').forEach((btn, i) => {
          btn.addEventListener('click', () => {
            pushToUndo(ctx, n);
            const target = targets[i];
            const blockCopy = duplicateBlockWithNewIds(match.block);
            target.blocks.push(blockCopy);
            match.parentList.splice(match.index, 1);
            if (n.blocks.length === 0) n.blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
            rerenderNote(ctx, n);
            picker.remove();
            ctx.toast(`Block moved to "${target.title || 'Untitled'}"`, '', () => {});
          });
        });
        setTimeout(() => {
          const close = (evt: MouseEvent) => {
            if (!picker.contains(evt.target as Node)) { picker.remove(); document.removeEventListener('click', close); }
          };
          document.addEventListener('click', close);
        }, 0);
      }},
      { label: 'Delete', icon: '🗑', danger: true, action: () => {
        pushToUndo(ctx, n);
        match.parentList.splice(match.index, 1);
        if (n.blocks.length === 0) n.blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
        rerenderNote(ctx, n);
      }},
      { sep: true },
      { head: 'Turn into' },
      { label: 'Text', icon: '¶', action: () => { pushToUndo(ctx, n); match.block.type = 'paragraph'; rerenderNote(ctx, n); } },
      { label: 'Heading 1', icon: 'H1', action: () => { pushToUndo(ctx, n); match.block.type = 'heading1'; rerenderNote(ctx, n); } },
      { label: 'Heading 2', icon: 'H2', action: () => { pushToUndo(ctx, n); match.block.type = 'heading2'; rerenderNote(ctx, n); } },
      { label: 'Heading 3', icon: 'H3', action: () => { pushToUndo(ctx, n); match.block.type = 'heading3'; rerenderNote(ctx, n); } },
      { label: 'Bullet list', icon: '•', action: () => { pushToUndo(ctx, n); match.block.type = 'bullet'; rerenderNote(ctx, n); } },
      { label: 'Numbered list', icon: '1.', action: () => { pushToUndo(ctx, n); match.block.type = 'numbered'; rerenderNote(ctx, n); } },
      { label: 'To-do list', icon: '☑', action: () => { pushToUndo(ctx, n); match.block.type = 'todo'; match.block.checked = false; rerenderNote(ctx, n); } },
      { label: 'Toggle list', icon: '▶', action: () => { pushToUndo(ctx, n); match.block.type = 'toggle'; rerenderNote(ctx, n); } },
      { label: 'Toggle heading 1', icon: '▶1', action: () => { pushToUndo(ctx, n); match.block.type = 'toggle_h1'; rerenderNote(ctx, n); } },
      { label: 'Toggle heading 2', icon: '▶2', action: () => { pushToUndo(ctx, n); match.block.type = 'toggle_h2'; rerenderNote(ctx, n); } },
      { label: 'Toggle heading 3', icon: '▶3', action: () => { pushToUndo(ctx, n); match.block.type = 'toggle_h3'; rerenderNote(ctx, n); } },
      { label: 'Quote', icon: '❝', action: () => { pushToUndo(ctx, n); match.block.type = 'quote'; rerenderNote(ctx, n); } },
      { label: 'Divider', icon: '—', action: () => { pushToUndo(ctx, n); match.block.type = 'divider'; match.block.content = ''; rerenderNote(ctx, n); } },
      { label: 'Table', icon: '田', action: () => { pushToUndo(ctx, n); match.block.type = 'table'; match.block.content = JSON.stringify([['Header 1', 'Header 2'], ['', ''], ['', '']]); rerenderNote(ctx, n); } },
      { label: 'Callout', icon: '💡', action: () => { pushToUndo(ctx, n); match.block.type = 'callout'; match.block.icon = '💡'; rerenderNote(ctx, n); } },
      { label: 'Page', icon: '📄', action: () => { rerenderNote(ctx, n); ctx.newSubNote(n.id); } },
      { label: 'Subfolder', icon: '📁', action: () => { rerenderNote(ctx, n); ctx.newSubFolder(n.id); } },
      { label: 'Image', icon: '🖼', action: () => { rerenderNote(ctx, n); openMediaFilePrompt(ctx, 'image', match.block, n); } },
      { label: 'Video', icon: '🎬', action: () => { rerenderNote(ctx, n); openMediaFilePrompt(ctx, 'video', match.block, n); } },
      { label: 'Audio', icon: '🎵', action: () => { rerenderNote(ctx, n); openMediaFilePrompt(ctx, 'audio', match.block, n); } },
      { label: 'PDF', icon: '📄', action: () => {
        const originalState: Partial<Block> = {
          type: match.block.type,
          content: match.block.content,
          url: match.block.url
        };
        match.block.type = 'pdf';
        rerenderNote(ctx, n);
        const bEl = ctx.elements.edBody.querySelector(`[data-id="${bId}"]`) as HTMLElement;
        if (bEl) openUrlPopupEditor(ctx, 'pdf', match.block, n, bEl, originalState);
      } },
      { label: 'Bookmark', icon: '🔖', action: () => {
        const originalState: Partial<Block> = {
          type: match.block.type,
          content: match.block.content,
          url: match.block.url,
          bookmarkTitle: match.block.bookmarkTitle,
          bookmarkDesc: match.block.bookmarkDesc,
          bookmarkImage: match.block.bookmarkImage,
          bookmarkIcon: match.block.bookmarkIcon
        };
        match.block.type = 'bookmark';
        rerenderNote(ctx, n);
        const bEl = ctx.elements.edBody.querySelector(`[data-id="${bId}"]`) as HTMLElement;
        if (bEl) openUrlPopupEditor(ctx, 'bookmark', match.block, n, bEl, originalState);
      } },
      { label: 'Code', icon: '</>', action: () => { match.block.type = 'code'; match.block.language = 'plaintext'; rerenderNote(ctx, n); } },
      { label: 'File', icon: '📎', action: () => { rerenderNote(ctx, n); openMediaFilePrompt(ctx, 'file', match.block, n); } },
      { label: 'Mention', icon: '@', action: () => { openMentionPicker(ctx, match.block, n, bId); } },
      { label: 'Date', icon: '📅', action: () => { openDatePicker(ctx, match.block, n); } },
      { label: 'Equation', icon: '∑', action: () => { openTexPrompt(ctx, 'equation', match.block, n); } },
      { label: 'Emoji', icon: '😊', action: () => { openEmojiPicker(ctx, match.block, n, bId); } },
      { label: 'Contents', icon: '≡', action: () => { match.block.type = 'toc'; match.block.content = ''; rerenderNote(ctx, n); } },
      { label: 'Template', icon: '🔁', action: () => { match.block.type = 'template'; match.block.content = 'Template button'; rerenderNote(ctx, n); } },
      { label: 'Breadcrumb', icon: '›', action: () => { match.block.type = 'breadcrumb'; match.block.content = ''; rerenderNote(ctx, n); } },
      { label: 'Math Equation', icon: '∫', action: () => { match.block.type = 'math'; rerenderNote(ctx, n); } }
    ];
    
    ctx.openFly(dragHandle, menuItems);
  }
}
