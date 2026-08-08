import type { AppContext } from '../../context';
import type { Block, Note, FlyoutItem } from '../../../types';
import { findBlockById, flattenVisibleBlocks, resolveNoteId, genId } from '../../../utils';
import { saveAndSyncContent, saveAndSync } from '../../../store';
import { 
  rerenderNote, rerenderSelectionStyles, closeLanguagePicker, openCalendarPicker, 
  openMathPopupEditor, openCalloutEmojiPicker, openMediaFilePrompt, openUrlPopupEditor,
  openMentionPicker, openDatePicker, openTexPrompt, openEmojiPicker 
} from './pickers/editorPopups';
import { closeSlashMenu } from './pickers/editorSlashMenu';
import { handleDragHandleClick } from './editorDragFlyout';
import { duplicateBlocksWithNewIds } from './editorHelpers';

export function handleCheckboxChange(ctx: AppContext, e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.classList.contains('block-todo-checkbox')) return;
  
  const blockEl = target.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return;
  const blockId = blockEl.dataset.id!;
  
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;
  
  const match = findBlockById(n.blocks, blockId);
  if (match) {
    match.block.checked = target.checked;
    blockEl.classList.toggle('checked', target.checked);
    saveAndSyncContent();
    ctx.markSaving();
  }
}

export function handleDocumentMouseDown(ctx: AppContext, e: MouseEvent) {
  const target = e.target as HTMLElement;
  const menu = ctx.root.querySelector('.slash-menu');
  if (menu && !menu.contains(e.target as Node) && !target.classList.contains('block-text-field')) {
    closeSlashMenu(ctx);
  }
  const picker = ctx.root.querySelector('.language-picker-popup');
  if (picker && !picker.contains(e.target as Node) && !target.closest('.code-lang-container')) {
    closeLanguagePicker(ctx);
  }

  if (ctx.st.selectedBlockIds && ctx.st.selectedBlockIds.size > 0) {
    const isDragHandle = target.closest('.block-drag-handle');
    const isFlyout = target.closest('#flyout') || target.closest('.fly-item') || target.closest('.url-popup-editor') || target.closest('.math-popup-editor');
    const isSelectionModifier = e.shiftKey || e.altKey || e.metaKey;
    
    if (!isDragHandle && !isFlyout && !isSelectionModifier) {
      ctx.st.selectedBlockIds.clear();
      rerenderSelectionStyles(ctx);
    }
  }
}

export function handleEditorBodyClick(ctx: AppContext, e: MouseEvent) {
  const target = e.target as HTMLElement;

  const addBtn = target.closest('.block-add-btn') as HTMLElement;
  if (addBtn) {
    e.preventDefault();
    e.stopPropagation();
    const blockEl = addBtn.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const bId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      const { parentList, index } = match;
      const newBlockId = genId();
      const newBlock: Block = { id: newBlockId, type: 'paragraph', content: '', children: [] };
      parentList.splice(index + 1, 0, newBlock);
      
      rerenderNote(ctx, n);
      const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
      if (newField) newField.focus();
      saveAndSyncContent();
      ctx.markSaving();
    }
    return;
  }

  const dragHandle = target.closest('.block-drag-handle') as HTMLElement;
  if (dragHandle) {
    handleDragHandleClick(ctx, e, dragHandle);
    return;
  }

  const dateBadge = target.closest('.date-badge') as HTMLElement;
  if (dateBadge) {
    e.preventDefault();
    const blockEl = dateBadge.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const bId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      const oldDate = dateBadge.dataset.date || '';
      openCalendarPicker(ctx, dateBadge, oldDate, (newDate) => {
        match.block.content = match.block.content.replace(oldDate, newDate.trim());
        rerenderNote(ctx, n);
      });
    }
    return;
  }

  const mathBadge = target.closest('.math-badge') as HTMLElement;
  if (mathBadge) {
    e.preventDefault();
    const blockEl = mathBadge.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const bId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      const oldTex = mathBadge.dataset.tex || '';
      const newTex = prompt('Edit TeX / LaTeX formula:', oldTex);
      if (newTex !== null) {
        const oldFull = `$$${oldTex}$$`;
        const newFull = `$$${newTex.trim()}$$`;
        match.block.content = match.block.content.replace(oldFull, newFull);
        rerenderNote(ctx, n);
      }
    }
    return;
  }

  const link = target.closest('.wiki-link') as HTMLElement;
  if (link) {
    const ref = link.dataset.ref!;
    const nId = resolveNoteId(ref, ctx.st.notes);
    if (nId) {
      ctx.selectNote(nId);
    } else {
      ctx.toast(`Note "${ref}" not found. Create it?`, 'Create', () => {
        const newN: Note = {
          id: 'n' + Math.random().toString(36).slice(2, 7),
          title: ref,
          body: '',
          blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
          nb: ctx.st.nb !== 'all' ? ctx.st.nb : 'design',
          tags: ctx.st.tag ? [ctx.st.tag] : [],
          pinned: false,
          date: 'Just now',
          ord: --ctx.st.ordMin
        };
        ctx.st.notes.unshift(newN);
        saveAndSync();
        ctx.selectNote(newN.id);
      });
    }
    return;
  }

  const toggleBtn = target.closest('.toggle-arrow-btn') as HTMLElement;
  if (toggleBtn) {
    const bId = toggleBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      match.block.collapsed = !match.block.collapsed;
      const blockEl = toggleBtn.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        blockEl.classList.toggle('collapsed', !!match.block.collapsed);
        const childrenContainer = blockEl.querySelector(':scope > .block-children-container') as HTMLElement;
        if (childrenContainer) {
          childrenContainer.style.display = match.block.collapsed ? 'none' : '';
        }
      }
      saveAndSyncContent();
      ctx.markSaving();
    }
    return;
  }

  const copyBtn = target.closest('.code-copy-btn, .code-copy-btn-premium') as HTMLElement;
  if (copyBtn) {
    const bId = copyBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      navigator.clipboard.writeText(match.block.content).then(() => {
        const originalText = copyBtn.textContent || '';
        if (copyBtn.classList.contains('code-copy-btn-premium')) {
          const oldSvg = copyBtn.innerHTML;
          copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success, #00a300)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => { copyBtn.innerHTML = oldSvg; }, 1500);
        } else {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
        }
      });
    }
    return;
  }

  const moreBtn = target.closest('.code-more-btn-premium') as HTMLElement;
  if (moreBtn) {
    e.preventDefault();
    const bId = moreBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      const menuItems: FlyoutItem[] = [
        { label: match.block.codeWrap ? 'Unwrap lines' : 'Wrap lines', icon: '↩', action: () => { match.block.codeWrap = !match.block.codeWrap; rerenderNote(ctx, n); } },
        { label: match.block.codeFullWidth ? 'Standard width' : 'Full width', icon: '↔', action: () => { match.block.codeFullWidth = !match.block.codeFullWidth; rerenderNote(ctx, n); } }
      ];
      ctx.openFly(moreBtn, menuItems);
    }
    return;
  }

  const calloutIconBtn = target.closest('.callout-icon-btn') as HTMLElement;
  if (calloutIconBtn) {
    e.preventDefault();
    const blockEl = calloutIconBtn.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const bId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      openCalloutEmojiPicker(ctx, match.block, n, calloutIconBtn);
    }
    return;
  }

  const templateBtn = target.closest('.template-trigger-btn') as HTMLElement;
  if (templateBtn) {
    const bId = templateBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match && match.block.children && match.block.children.length > 0) {
      const copies = duplicateBlocksWithNewIds(match.block.children);
      match.parentList.splice(match.index + 1, 0, ...copies);
      rerenderNote(ctx, n);
    } else {
      ctx.toast('Template is empty. Add blocks inside it first!', '', () => {});
    }
    return;
  }

  const langLabel = target.closest('.code-lang-label') as HTMLElement;
  if (langLabel) {
    const blockEl = langLabel.closest('.block-wrapper') as HTMLElement;
    const bId = blockEl?.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      const newLang = prompt('Enter code language:', match.block.language || 'plaintext');
      if (newLang !== null) {
        match.block.language = newLang.trim() || 'plaintext';
        rerenderNote(ctx, n);
      }
    }
    return;
  }

  const mathBlock = target.closest('.block-math') as HTMLElement;
  if (mathBlock && !target.closest('.block-media-placeholder')) {
    if (ctx.root.querySelector('.math-popup-editor')) return;
    const bId = mathBlock.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      openMathPopupEditor(ctx, match.block, n, mathBlock);
    }
    return;
  }

  const bookmarkLink = target.closest('.block-bookmark-link, .block-bookmark-link-premium, .bookmark-link') as HTMLAnchorElement;
  if (bookmarkLink) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      let url = bookmarkLink.getAttribute('href');
      if (url) {
        if (!/^(https?:\/\/|file:\/\/|mailto:|tel:)/i.test(url)) url = 'https://' + url;
        if (window.electronAPI && window.electronAPI.openExternalUrl) {
          window.electronAPI.openExternalUrl(url);
        }
      }
    }
    return;
  }

  const placeholder = target.closest('.block-media-placeholder') as HTMLElement;
  if (placeholder) {
    const prompt_type = placeholder.dataset.prompt!;
    const bId = placeholder.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (!match) return;
    if (['image','video','audio','file'].includes(prompt_type)) {
      openMediaFilePrompt(ctx, prompt_type, match.block, n);
    } else if (['pdf','bookmark'].includes(prompt_type)) {
      openUrlPopupEditor(ctx, prompt_type, match.block, n, placeholder);
    } else if (prompt_type === 'math') {
      openMathPopupEditor(ctx, match.block, n, placeholder);
    }
    return;
  }

  const tocLink = target.closest('.toc-link') as HTMLElement;
  if (tocLink) {
    e.preventDefault();
    const bId = tocLink.dataset.blockid!;
    const el = ctx.elements.edBody.querySelector(`[data-id="${bId}"] .block-text-field`) as HTMLElement;
    if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return;
  }

  const bcLink = target.closest('.bc-link') as HTMLElement;
  if (bcLink) {
    e.preventDefault();
    const noteId = bcLink.dataset.noteid!;
    if (noteId) ctx.selectNote(noteId);
    return;
  }
}

export function handleBlockSelectionClick(ctx: AppContext, e: MouseEvent) {
  const target = e.target as HTMLElement;
  const blockEl = target.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return;
  const blockId = blockEl.dataset.id!;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isToggleSelect = e.shiftKey && (isMac ? e.metaKey : e.altKey);

  if (isToggleSelect) {
    e.preventDefault();
    e.stopPropagation();
    if (!ctx.st.selectedBlockIds) ctx.st.selectedBlockIds = new Set<string>();
    if (ctx.st.selectedBlockIds.has(blockId)) {
      ctx.st.selectedBlockIds.delete(blockId);
    } else {
      ctx.st.selectedBlockIds.add(blockId);
    }
    rerenderSelectionStyles(ctx);
    return;
  }

  if (e.shiftKey && !isToggleSelect) {
    const selected = Array.from(ctx.st.selectedBlockIds || []);
    if (selected.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (n) {
        const flat = flattenVisibleBlocks(n.blocks);
        const firstIdx = flat.findIndex(b => b.id === selected[0]);
        const thisIdx = flat.findIndex(b => b.id === blockId);
        if (firstIdx !== -1 && thisIdx !== -1) {
          const start = Math.min(firstIdx, thisIdx);
          const end = Math.max(firstIdx, thisIdx);
          ctx.st.selectedBlockIds = new Set(flat.slice(start, end + 1).map(b => b.id));
          rerenderSelectionStyles(ctx);
        }
      }
    }
  }
}
