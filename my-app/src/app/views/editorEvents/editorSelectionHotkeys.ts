import type { AppContext } from '../../context';
import type { Block, BlockType, Note } from '../../../types';
import { findBlockById, flattenVisibleBlocks, moveCaret, resolveNoteId, genId, esc } from '../../../utils';
import { saveAndSyncContent, saveAndSync } from '../../../store';
import { rerenderNote, rerenderSelectionStyles } from './pickers/editorPopups';
import { isToggleType } from './editorBlockKeyActions';
import { showSlashMenu } from './pickers/editorSlashMenu';
import { duplicateBlockWithNewIds } from './editorHelpers';
import { pushToUndo } from './editorHistory';

export function handleFieldShortcuts(
  ctx: AppContext,
  e: KeyboardEvent,
  target: HTMLElement,
  n: Note,
  blockId: string
): boolean {
  if (e.key === 'Escape') {
    e.preventDefault();
    ctx.st.selectedBlockIds = new Set([blockId]);
    target.blur();
    rerenderSelectionStyles(ctx);
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    ctx.st.selectedBlockIds = new Set([blockId]);
    target.blur();
    rerenderSelectionStyles(ctx);
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      e.preventDefault();
      const url = prompt('Enter link URL:', 'https://');
      if (url) {
        const range = selection.getRangeAt(0);
        const selectedHtml = range.toString();
        const linkHtml = `<a href="${url.trim()}" target="_blank" style="color: var(--accent); text-decoration: underline;">${esc(selectedHtml)}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
        saveAndSyncContent();
        ctx.markSaving();
      }
      return true;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
    e.preventDefault();
    const match = findBlockById(n.blocks, blockId);
    if (match) {
      if (ctx.st.lastUsedColor !== undefined) match.block.textColor = ctx.st.lastUsedColor;
      if (ctx.st.lastUsedBgColor !== undefined) match.block.bgColor = ctx.st.lastUsedBgColor;
      rerenderNote(ctx, n);
      const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
      if (newField) moveCaret(newField);
    }
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    const match = findBlockById(n.blocks, blockId);
    if (match) {
      const commentVal = prompt('Enter comment for this block:', match.block.comment || '');
      if (commentVal !== null) {
        match.block.comment = commentVal.trim() || undefined;
        rerenderNote(ctx, n);
        const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (newField) moveCaret(newField);
      }
    }
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    document.execCommand('strikeThrough', false, undefined);
    saveAndSyncContent();
    ctx.markSaving();
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    const selection = window.getSelection()?.toString() || '';
    const val = prompt('Enter TeX / LaTeX formula:', selection);
    if (val !== null) {
      document.execCommand('insertHTML', false, `$$${val.trim()}$$`);
      saveAndSyncContent();
      ctx.markSaving();
      
      const match = findBlockById(n.blocks, blockId);
      if (match) {
        match.block.content = target.textContent || '';
        rerenderNote(ctx, n);
        const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (newField) moveCaret(newField);
      }
    }
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    const selection = window.getSelection()?.toString();
    if (selection) {
      document.execCommand('insertHTML', false, `<code style="background:var(--bg3); padding: 2px 4px; border-radius: 4px; font-family: monospace;">${esc(selection)}</code>`);
      saveAndSyncContent();
      ctx.markSaving();
    }
    return true;
  }

  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    document.execCommand('insertLineBreak', false, undefined);
    return true;
  }

  const numKey = parseInt(e.key);
  const isStyleShortcut = (e.ctrlKey || e.metaKey) && (e.altKey || e.shiftKey) && !isNaN(numKey);
  if (isStyleShortcut) {
    e.preventDefault();
    const match = findBlockById(n.blocks, blockId);
    if (match) {
      const typeMap: Record<number, BlockType> = {
        0: 'paragraph', 1: 'heading1', 2: 'heading2', 3: 'heading3',
        4: 'todo', 5: 'bullet', 6: 'numbered', 7: 'toggle', 8: 'code',
      };
      const targetType = typeMap[numKey];
      if (targetType) {
        match.block.type = targetType;
        if (targetType === 'todo') match.block.checked = false;
        if (targetType === 'code') match.block.language = 'plaintext';
        rerenderNote(ctx, n);
        const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (newField) moveCaret(newField);
      } else if (numKey === 9) {
        const parentN = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (parentN) {
          const title = match.block.content.trim() || 'Untitled Page';
          const newN: Note = {
            id: 'n' + Math.random().toString(36).slice(2, 7),
            title: title,
            body: '',
            blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
            nb: parentN.nb,
            tags: [],
            pinned: false,
            date: 'Just now',
            ord: --ctx.st.ordMin,
            parentId: parentN.id
          };
          ctx.st.notes.unshift(newN);
          match.block.type = 'paragraph';
          match.block.content = `[[${title}]]`;
          rerenderNote(ctx, n);
          saveAndSync();
        }
      }
    }
    return true;
  }

  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    const match = findBlockById(n.blocks, blockId);
    if (match && isToggleType(match.block.type)) {
      e.preventDefault();
      match.block.collapsed = !match.block.collapsed;
      rerenderNote(ctx, n);
      const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
      if (field) moveCaret(field);
      return true;
    }
  }

  return false;
}

export function handleDocumentBlockSelectionKeydown(ctx: AppContext, e: KeyboardEvent) {
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;

  const selectedIds = ctx.st.selectedBlockIds;
  if (selectedIds && selectedIds.size > 0) {
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl && (activeEl.classList.contains('block-text-field') || activeEl.tagName === 'INPUT')) {
      return;
    }

    const selected = Array.from(selectedIds);
    const firstId = selected[0];

    if (e.key === 'Escape') {
      e.preventDefault();
      selectedIds.clear();
      rerenderSelectionStyles(ctx);
      const field = ctx.elements.edBody.querySelector(`[data-id="${firstId}"] .block-text-field`) as HTMLElement;
      if (field) moveCaret(field);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      selectedIds.clear();
      rerenderSelectionStyles(ctx);
      const field = ctx.elements.edBody.querySelector(`[data-id="${firstId}"] .block-text-field`) as HTMLElement;
      if (field) moveCaret(field);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const flat = flattenVisibleBlocks(n.blocks);
      const lastId = selected[selected.length - 1];
      const idx = flat.findIndex(b => b.id === lastId);
      let nextIdx = idx;
      if (e.key === 'ArrowUp') {
        if (idx > 0) nextIdx = idx - 1;
      } else {
        if (idx < flat.length - 1) nextIdx = idx + 1;
      }

      const targetId = flat[nextIdx].id;
      if (e.shiftKey) {
        if (selectedIds.has(targetId)) {
          selectedIds.delete(lastId);
        } else {
          selectedIds.add(targetId);
        }
      } else {
        selectedIds.clear();
        selectedIds.add(targetId);
      }
      rerenderSelectionStyles(ctx);
      const blockEl = ctx.elements.edBody.querySelector(`[data-id="${targetId}"]`) as HTMLElement;
      if (blockEl) blockEl.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      pushToUndo(ctx, n);
      for (const bId of selected) {
        const match = findBlockById(n.blocks, bId);
        if (match) {
          const idx = match.parentList.indexOf(match.block);
          if (idx !== -1) match.parentList.splice(idx, 1);
        }
      }
      selectedIds.clear();
      rerenderNote(ctx, n);
      rerenderSelectionStyles(ctx);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      pushToUndo(ctx, n);
      const copies: string[] = [];
      const flat = flattenVisibleBlocks(n.blocks);
      selected.sort((a, b) => flat.findIndex(x => x.id === a) - flat.findIndex(x => x.id === b));

      for (const bId of selected) {
        const match = findBlockById(n.blocks, bId);
        if (match) {
          const copy = duplicateBlockWithNewIds(match.block);
          match.parentList.splice(match.index + 1, 0, copy);
          copies.push(copy.id);
        }
      }
      ctx.st.selectedBlockIds = new Set(copies);
      rerenderNote(ctx, n);
      rerenderSelectionStyles(ctx);
      return;
    }

    const isMoveUp = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowUp';
    const isMoveDown = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowDown';
    if (isMoveUp || isMoveDown) {
      e.preventDefault();
      const flat = flattenVisibleBlocks(n.blocks);
      selected.sort((a, b) => flat.findIndex(x => x.id === a) - flat.findIndex(x => x.id === b));

      if (isMoveUp) {
        for (const bId of selected) {
          const match = findBlockById(n.blocks, bId);
          if (match && match.index > 0) {
            match.parentList.splice(match.index, 1);
            match.parentList.splice(match.index - 1, 0, match.block);
          }
        }
      } else {
        for (let i = selected.length - 1; i >= 0; i--) {
          const bId = selected[i];
          const match = findBlockById(n.blocks, bId);
          if (match && match.index < match.parentList.length - 1) {
            match.parentList.splice(match.index, 1);
            match.parentList.splice(match.index + 1, 0, match.block);
          }
        }
      }
      rerenderNote(ctx, n);
      rerenderSelectionStyles(ctx);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      for (const bId of selected) {
        const match = findBlockById(n.blocks, bId);
        if (match) {
          if (ctx.st.lastUsedColor !== undefined) match.block.textColor = ctx.st.lastUsedColor;
          if (ctx.st.lastUsedBgColor !== undefined) match.block.bgColor = ctx.st.lastUsedBgColor;
        }
      }
      rerenderNote(ctx, n);
      rerenderSelectionStyles(ctx);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      const firstMatch = findBlockById(n.blocks, firstId);
      const commentVal = prompt('Enter comment for selected block(s):', firstMatch?.block.comment || '');
      if (commentVal !== null) {
        const val = commentVal.trim() || undefined;
        for (const bId of selected) {
          const match = findBlockById(n.blocks, bId);
          if (match) match.block.comment = val;
        }
        rerenderNote(ctx, n);
        rerenderSelectionStyles(ctx);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      
      let hasAnyExpanded = false;
      const findExpanded = (list: Block[]) => {
        for (const b of list) {
          if (isToggleType(b.type) && !b.collapsed) {
            hasAnyExpanded = true;
            return;
          }
          if (b.children) findExpanded(b.children);
        }
      };
      findExpanded(n.blocks);

      const targetCollapse = hasAnyExpanded;
      const setCollapse = (list: Block[]) => {
        for (const b of list) {
          if (isToggleType(b.type)) {
            b.collapsed = targetCollapse;
          }
          if (b.children) setCollapse(b.children);
        }
      };
      setCollapse(n.blocks);

      rerenderNote(ctx, n);
      rerenderSelectionStyles(ctx);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const blockEl = ctx.elements.edBody.querySelector(`[data-id="${firstId}"]`) as HTMLElement;
      const textField = blockEl?.querySelector('.block-text-field') as HTMLElement;
      if (blockEl && textField) {
        showSlashMenu(ctx, blockEl, textField);
      }
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      if (selected.length === 1) {
        const match = findBlockById(n.blocks, firstId);
        if (match && (match.block.type === 'image' || match.block.type === 'video')) {
          let lightbox = ctx.root.querySelector('.fullscreen-media-lightbox') as HTMLElement;
          if (lightbox) {
            lightbox.remove();
          } else {
            lightbox = document.createElement('div');
            lightbox.className = 'fullscreen-media-lightbox';
            lightbox.innerHTML = match.block.type === 'image'
              ? `<img src="${match.block.url}" />`
              : `<video src="${match.block.url}" controls autoplay></video>`;
            lightbox.addEventListener('click', () => lightbox.remove());
            ctx.root.appendChild(lightbox);
          }
        }
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const match = findBlockById(n.blocks, firstId);
      if (match) {
        const matchWiki = match.block.content.match(/\[\[(.*?)\]\]/);
        if (matchWiki) {
          const ref = matchWiki[1].trim();
          const noteId = resolveNoteId(ref, ctx.st.notes);
          if (noteId) {
            ctx.selectNote(noteId);
            return;
          }
        } else if (match.block.type === 'todo') {
          match.block.checked = !match.block.checked;
          rerenderNote(ctx, n);
          rerenderSelectionStyles(ctx);
        } else if (isToggleType(match.block.type)) {
          match.block.collapsed = !match.block.collapsed;
          rerenderNote(ctx, n);
          rerenderSelectionStyles(ctx);
        } else if (match.block.type === 'image' || match.block.type === 'video') {
          let lightbox = ctx.root.querySelector('.fullscreen-media-lightbox') as HTMLElement;
          if (lightbox) {
            lightbox.remove();
          } else {
            lightbox = document.createElement('div');
            lightbox.className = 'fullscreen-media-lightbox';
            lightbox.innerHTML = match.block.type === 'image'
              ? `<img src="${match.block.url}" />`
              : `<video src="${match.block.url}" controls autoplay></video>`;
            lightbox.addEventListener('click', () => lightbox.remove());
            ctx.root.appendChild(lightbox);
          }
        }
      }
      return;
    }
  }
}
