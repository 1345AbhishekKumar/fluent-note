import type { AppContext } from '../../context';
import type { Block, Note, FlyoutItem } from '../../../types';
import { findBlockById, flattenVisibleBlocks, resolveNoteId, genId, moveCaret } from '../../../utils';
import { saveAndSyncContent, saveAndSync } from '../../../store';
import { 
  rerenderNote, rerenderSelectionStyles, closeLanguagePicker, openLanguagePicker, openCalendarPicker, 
  openMathPopupEditor, openCalloutEmojiPicker, openMediaFilePrompt, openUrlPopupEditor,
  openMentionPicker, openDatePicker, openTexPrompt, openEmojiPicker 
} from './pickers/editorPopups';
import { closeSlashMenu } from './pickers/editorSlashMenu';
import { handleDragHandleClick } from './editorDragFlyout';
import { duplicateBlocksWithNewIds } from './editorHelpers';
import { openMediaSidebar } from '../mediaSidebar';
import { renderMermaidDiagramsInContainer } from '../../../utils/mermaidRenderer';
import { renderHtmlPreviewsInContainer, updateHtmlPreviewIframe } from '../../../utils/htmlPreviewRenderer';
import { openHtmlFullscreenModal } from './htmlFullscreenModal';
import { pushToUndo } from './editorHistory';

export function focusOrCreateBottomBlock(ctx: AppContext) {
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;

  if (!n.blocks || n.blocks.length === 0) {
    const newBlockId = genId();
    n.blocks = [{ id: newBlockId, type: 'paragraph', content: '', children: [] }];
    rerenderNote(ctx, n);
    const field = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
    if (field) field.focus();
    saveAndSyncContent();
    ctx.markSaving();
    return;
  }

  const flat = flattenVisibleBlocks(n.blocks);
  const lastBlock = flat[flat.length - 1];

  if (lastBlock && lastBlock.type === 'paragraph' && lastBlock.content.trim() === '') {
    const field = ctx.elements.edBody.querySelector(`[data-id="${lastBlock.id}"] .block-text-field`) as HTMLElement;
    if (field) {
      field.focus();
      moveCaret(field, false);
      return;
    }
  }

  const newBlockId = genId();
  const newBlock: Block = { id: newBlockId, type: 'paragraph', content: '', children: [] };
  n.blocks.push(newBlock);
  rerenderNote(ctx, n);
  const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
  if (newField) {
    newField.focus();
  }
  saveAndSyncContent();
  ctx.markSaving();
}

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
    pushToUndo(ctx, n);
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
    const isDragHandle = target.closest('.block-drag-handle') || target.closest('.block-add-btn') || target.closest('.block-actions-container');
    const isFlyout = target.closest('#flyout') || target.closest('.flyout') || target.closest('.fly-item') || target.closest('.url-popup-editor') || target.closest('.math-popup-editor');
    const isSelectionModifier = e.shiftKey || e.altKey || e.metaKey;
    
    if (!isDragHandle && !isFlyout && !isSelectionModifier) {
      ctx.st.selectedBlockIds.clear();
      rerenderSelectionStyles(ctx);
    }
  }
}

export function handleEditorBodyClick(ctx: AppContext, e: MouseEvent) {
  const target = e.target as HTMLElement;

  // Table Add Row
  const addRowBtn = target.closest('.add-row-btn') as HTMLElement;
  if (addRowBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = addRowBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) {
      const match = findBlockById(n.blocks, bId);
      if (match && match.block.type === 'table') {
        pushToUndo(ctx, n);
        let rows: string[][] = [];
        try { rows = JSON.parse(match.block.content); } catch (ex) { rows = [['', ''], ['', '']]; }
        const colCount = rows.length > 0 ? rows[0].length : 2;
        rows.push(Array(colCount).fill(''));
        match.block.content = JSON.stringify(rows);
        rerenderNote(ctx, n);
        saveAndSyncContent();
        ctx.markSaving();
      }
    }
    return;
  }

  // Table Add Column
  const addColBtn = target.closest('.add-col-btn') as HTMLElement;
  if (addColBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = addColBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) {
      const match = findBlockById(n.blocks, bId);
      if (match && match.block.type === 'table') {
        pushToUndo(ctx, n);
        let rows: string[][] = [];
        try { rows = JSON.parse(match.block.content); } catch (ex) { rows = [['', ''], ['', '']]; }
        rows.forEach(r => r.push(''));
        match.block.content = JSON.stringify(rows);
        rerenderNote(ctx, n);
        saveAndSyncContent();
        ctx.markSaving();
      }
    }
    return;
  }

  // Table Delete Row
  const delRowBtn = target.closest('.del-row-btn') as HTMLElement;
  if (delRowBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = delRowBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) {
      const match = findBlockById(n.blocks, bId);
      if (match && match.block.type === 'table') {
        pushToUndo(ctx, n);
        let rows: string[][] = [];
        try { rows = JSON.parse(match.block.content); } catch (ex) { rows = [['', ''], ['', '']]; }
        if (rows.length > 1) {
          const activeCell = document.activeElement as HTMLElement;
          let rowToDelete = rows.length - 1;
          if (activeCell && activeCell.classList.contains('table-cell-field')) {
            const td = activeCell.closest('td') as HTMLElement;
            if (td && td.dataset.row) {
              rowToDelete = parseInt(td.dataset.row);
            }
          }
          rows.splice(rowToDelete, 1);
          match.block.content = JSON.stringify(rows);
          rerenderNote(ctx, n);
          saveAndSyncContent();
          ctx.markSaving();
        } else {
          ctx.toast('Table must have at least 1 row');
        }
      }
    }
    return;
  }

  // Table Delete Column
  const delColBtn = target.closest('.del-col-btn') as HTMLElement;
  if (delColBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = delColBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) {
      const match = findBlockById(n.blocks, bId);
      if (match && match.block.type === 'table') {
        pushToUndo(ctx, n);
        let rows: string[][] = [];
        try { rows = JSON.parse(match.block.content); } catch (ex) { rows = [['', ''], ['', '']]; }
        if (rows.length > 0 && rows[0].length > 1) {
          const activeCell = document.activeElement as HTMLElement;
          let colToDelete = rows[0].length - 1;
          if (activeCell && activeCell.classList.contains('table-cell-field')) {
            const td = activeCell.closest('td') as HTMLElement;
            if (td && td.dataset.col) {
              colToDelete = parseInt(td.dataset.col);
            }
          }
          rows.forEach(r => r.splice(colToDelete, 1));
          match.block.content = JSON.stringify(rows);
          rerenderNote(ctx, n);
          saveAndSyncContent();
          ctx.markSaving();
        } else {
          ctx.toast('Table must have at least 1 column');
        }
      }
    }
    return;
  }

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

  const mermaidModeBtn = target.closest('.mermaid-mode-btn') as HTMLElement;
  if (mermaidModeBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = mermaidModeBtn.dataset.id!;
    const mode = mermaidModeBtn.dataset.mode as 'diagram' | 'code' | 'split';
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      match.block.mermaidMode = mode;
      rerenderNote(ctx, n);
      renderMermaidDiagramsInContainer(ctx.elements.edBody, ctx.api.theme);
      saveAndSyncContent();
      ctx.markSaving();
    }
    return;
  }

  const mermaidCopyBtn = target.closest('.mermaid-copy-btn') as HTMLElement;
  if (mermaidCopyBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = mermaidCopyBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      const flyoutItems: FlyoutItem[] = [
        {
          label: 'Copy Mermaid Code',
          icon: '</>',
          action: () => {
            navigator.clipboard.writeText(match.block.content);
            ctx.toast('Mermaid code copied to clipboard!', '', () => {});
          }
        },
        {
          label: 'Copy SVG Diagram',
          icon: '🖼',
          action: () => {
            const wrapper = ctx.elements.edBody.querySelector(`[data-id="${bId}"]`);
            const svgEl = wrapper?.querySelector('.mermaid-render-output svg');
            if (svgEl) {
              const svgData = new XMLSerializer().serializeToString(svgEl);
              navigator.clipboard.writeText(svgData);
              ctx.toast('Diagram SVG copied to clipboard!', '', () => {});
            } else {
              ctx.toast('No rendered SVG diagram found to copy', '', () => {});
            }
          }
        }
      ];
      ctx.openFly(mermaidCopyBtn, flyoutItems);
    }
    return;
  }

  const htmlModeBtn = target.closest('.html-mode-btn') as HTMLElement;
  if (htmlModeBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = htmlModeBtn.dataset.id!;
    const mode = htmlModeBtn.dataset.mode as 'code' | 'preview' | 'split';
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      match.block.htmlMode = mode;
      rerenderNote(ctx, n);
      renderHtmlPreviewsInContainer(ctx.elements.edBody, ctx.api.theme);
      saveAndSyncContent();
      ctx.markSaving();
    }
    return;
  }

  const htmlRefreshBtn = target.closest('.html-refresh-btn') as HTMLElement;
  if (htmlRefreshBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = htmlRefreshBtn.dataset.id!;
    const wrapper = ctx.elements.edBody.querySelector(`.block-html-wrapper[data-id="${bId}"]`);
    if (wrapper) {
      const codeField = wrapper.querySelector('.html-code-field') as HTMLElement;
      const iframe = wrapper.querySelector('.html-preview-iframe') as HTMLIFrameElement;
      if (iframe) {
        let rawText = '';
        if (codeField) {
          const html = codeField.innerHTML || '';
          if (html.includes('<br>') || html.includes('<div>')) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<div>/gi, '');
            rawText = tmp.textContent || '';
          } else {
            rawText = codeField.innerText || codeField.textContent || '';
          }
        }
        updateHtmlPreviewIframe(iframe, rawText, ctx.api.theme);
        ctx.toast('Preview refreshed', '', () => {});
      }
    }
    return;
  }

  const htmlCopyBtn = target.closest('.html-copy-btn') as HTMLElement;
  if (htmlCopyBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = htmlCopyBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      navigator.clipboard.writeText(match.block.content || '');
      ctx.toast('HTML code copied to clipboard!', '', () => {});
    }
    return;
  }

  const htmlExpandBtn = target.closest('.html-expand-btn') as HTMLElement;
  if (htmlExpandBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = htmlExpandBtn.dataset.id!;
    openHtmlFullscreenModal(ctx, bId);
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

  const subpageEl = target.closest('.block-subpage-row, .block-subpage-card') as HTMLElement;
  if (subpageEl) {
    const subpageId = subpageEl.dataset.subpageid;
    if (subpageId) {
      ctx.selectNote(subpageId);
    }
    return;
  }

  const subfolderEl = target.closest('.block-subfolder-row') as HTMLElement;
  if (subfolderEl) {
    const folderId = subfolderEl.dataset.subfolderid;
    if (folderId) {
      ctx.st.folder = folderId;
      ctx.st.nb = 'all';
      ctx.st.quick = 'all';
      ctx.st.tag = null;
      ctx.st.expandedFolders.add(folderId);
      ctx.renderSidebar();
      ctx.renderList();
    }
    return;
  }


  const imgTbBtn = target.closest('.image-tb-btn') as HTMLElement;
  if (imgTbBtn) {
    e.preventDefault();
    e.stopPropagation();
    const bId = imgTbBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (!match) return;

    if (imgTbBtn.classList.contains('img-align-left')) {
      match.block.columnWidth = 50;
      rerenderNote(ctx, n);
      saveAndSyncContent();
    } else if (imgTbBtn.classList.contains('img-align-center')) {
      match.block.columnWidth = 75;
      rerenderNote(ctx, n);
      saveAndSyncContent();
    } else if (imgTbBtn.classList.contains('img-align-right')) {
      match.block.columnWidth = 100;
      rerenderNote(ctx, n);
      saveAndSyncContent();
    } else if (imgTbBtn.classList.contains('img-replace')) {
      openMediaFilePrompt(ctx, 'image', match.block, n);
    } else if (imgTbBtn.classList.contains('img-delete')) {
      pushToUndo(ctx, n);
      const idx = match.parentList.indexOf(match.block);
      if (idx !== -1) match.parentList.splice(idx, 1);
      rerenderNote(ctx, n);
      saveAndSyncContent();
    }
    return;
  }

  const langContainer = target.closest('.code-lang-container') as HTMLElement;
  if (langContainer) {
    const blockEl = langContainer.closest('.block-wrapper') as HTMLElement;
    const bId = blockEl?.dataset.id!;
    if (bId) {
      openLanguagePicker(ctx, langContainer, bId);
    }
    return;
  }

  const mediaPdf = target.closest('.block-media-pdf, .block-media-img, .block-media-video, .block-media-audio, .block-file-link') as HTMLElement;
  if (mediaPdf) {
    const blockEl = mediaPdf.closest('.block-wrapper') as HTMLElement;
    const bId = blockEl?.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) {
      const match = findBlockById(n.blocks, bId);
      if (match && match.block.url) {
        e.preventDefault();
        e.stopPropagation();
        openMediaSidebar(ctx, match.block.content || match.block.fileName || 'Media Viewer', match.block.url, match.block.type as any);
        return;
      }
    }
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
