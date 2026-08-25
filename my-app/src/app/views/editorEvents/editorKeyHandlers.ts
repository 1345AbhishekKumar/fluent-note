import type { AppContext } from '../../context';
import { findBlockById, cleanBadgeHtml, moveCaret } from '../../../utils';
import { saveAndSyncContent } from '../../../store';
import { 
  showAutocompletePicker, closeAutocompletePicker, updatePickerSelection, executePickerCommand,
  getActivePickerEl, getSelectedPickerIndex, setSelectedPickerIndex, getVisiblePickerItems
} from './pickers/editorAutocompletePicker';
import { 
  showSlashMenu, closeSlashMenu, updateSlashMenuSelection, executeSlashCommand,
  getActiveSlashBlockId, getSelectedSlashItemIndex, setSelectedSlashItemIndex, getVisibleSlashItems
} from './pickers/editorSlashMenu';
import { tryMarkdownShortcut, tryInlineMarkdown } from './editorMarkdownShortcuts';
import { 
  handleBlockEnterKey, handleBlockBackspaceKey, handleBlockDeleteKey, handleBlockArrowUp, handleBlockArrowDown, handleBlockTabKey 
} from './editorBlockKeyActions';
import { handleFieldShortcuts, handleDocumentBlockSelectionKeydown } from './editorSelectionHotkeys';
import { handleMultiBlockTextDeletion } from './editorMultiBlockSelection';

import { pushToUndo, pushToUndoDebounced, triggerUndo, triggerRedo } from './editorHistory';
import { renderMermaidDiagramsInContainer } from '../../../utils/mermaidRenderer';
import { updateHtmlPreviewIframe } from '../../../utils/htmlPreviewRenderer';

let mermaidDebounceTimeout: any = null;
let htmlDebounceTimeout: any = null;

function getTextBeforeCaret(el: HTMLElement): string {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (el.contains(range.startContainer)) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(el);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      return preCaretRange.toString();
    }
  }
  return el.textContent || '';
}

export function initEditorKeyHandlers(ctx: AppContext) {
  ctx.elements.edTitle.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstField = ctx.elements.edBody.querySelector('.block-text-field') as HTMLElement;
      if (firstField) {
        firstField.focus();
      }
    }
  });

  ctx.elements.edBody.addEventListener('input', e => {
    const target = e.target as HTMLElement;

    if (target.classList.contains('mermaid-code-field')) {
      const blockEl = target.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        const blockId = blockEl.dataset.id!;
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, blockId);
          if (match) {
            match.block.content = target.textContent || '';
            if (mermaidDebounceTimeout) {
              clearTimeout(mermaidDebounceTimeout);
            }
            mermaidDebounceTimeout = setTimeout(() => {
              renderMermaidDiagramsInContainer(ctx.elements.edBody, ctx.api.theme);
            }, 400);
            saveAndSyncContent();
            ctx.markSaving();
          }
        }
      }
      return;
    }

    if (target.classList.contains('html-code-field')) {
      const blockEl = target.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        const blockId = blockEl.dataset.id!;
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, blockId);
          if (match) {
            let rawText = '';
            const html = target.innerHTML || '';
            if (html.includes('<br>') || html.includes('<div>')) {
              const tmp = document.createElement('div');
              tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<div>/gi, '');
              rawText = tmp.textContent || '';
            } else {
              rawText = target.innerText || target.textContent || '';
            }
            match.block.content = rawText;

            if (htmlDebounceTimeout) {
              clearTimeout(htmlDebounceTimeout);
            }
            htmlDebounceTimeout = setTimeout(() => {
              const iframe = blockEl.querySelector('.html-preview-iframe') as HTMLIFrameElement;
              if (iframe) {
                updateHtmlPreviewIframe(iframe, rawText, ctx.api.theme);
              }
            }, 350);

            saveAndSyncContent();
            ctx.markSaving();
          }
        }
      }
      return;
    }

    if (target.classList.contains('table-cell-field')) {
      const blockEl = target.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        const blockId = blockEl.dataset.id!;
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, blockId);
          if (match && match.block.type === 'table') {
            pushToUndoDebounced(ctx, n);
            const trs = blockEl.querySelectorAll('tbody tr');
            const grid: string[][] = [];
            trs.forEach(tr => {
              const row: string[] = [];
              tr.querySelectorAll('.table-cell-field').forEach(td => {
                row.push(td.innerHTML);
              });
              grid.push(row);
            });
            match.block.content = JSON.stringify(grid);
            saveAndSyncContent();
            ctx.markSaving();
          }
        }
      }
      return;
    }

    if (!target.classList.contains('block-text-field')) return;

    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;

    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;

    const match = findBlockById(n.blocks, blockId);
    if (match) {
      pushToUndoDebounced(ctx, n);

      const text = target.textContent || '';
      if (tryInlineMarkdown(ctx, target)) {
        match.block.content = cleanBadgeHtml(target);
        saveAndSyncContent();
        ctx.markSaving();
        return;
      }
      match.block.content = cleanBadgeHtml(target);

      if (tryMarkdownShortcut(ctx, n, match.block, match.index, match.parentList, text)) {
        return;
      }

      const textBeforeCaret = getTextBeforeCaret(target);

      const activeSlashBlockId = getActiveSlashBlockId();
      const slashMatch = textBeforeCaret.match(/(?:^|\s)\/([^\s\/]*)$/);
      if (slashMatch) {
        const query = slashMatch[1];
        showSlashMenu(ctx, blockEl, target, query);
      } else if (activeSlashBlockId === blockId) {
        closeSlashMenu(ctx);
      }

      const activePickerEl = getActivePickerEl();
      let bestTrigger: { symbol: string; query: string; index: number } | null = null;

      const triggerPatterns: { symbol: string; regex: RegExp }[] = [
        { symbol: '[[', regex: /(?:^|\s)(\[\[)([^\]]*)$/ },
        { symbol: '@', regex: /(?:^|\s)(@)([^\s@]*)$/ },
        { symbol: '+', regex: /(?:^|\s)(\+)([^\s+]*)$/ }
      ];

      for (const { symbol, regex } of triggerPatterns) {
        const matchToken = textBeforeCaret.match(regex);
        if (matchToken && matchToken.index !== undefined) {
          const symIndex = matchToken.index + (matchToken[0].startsWith(symbol) ? 0 : matchToken[0].indexOf(symbol));
          if (!bestTrigger || symIndex > bestTrigger.index) {
            bestTrigger = {
              symbol,
              query: matchToken[2],
              index: symIndex
            };
          }
        }
      }

      if (bestTrigger) {
        showAutocompletePicker(ctx, match.block, target, bestTrigger.symbol, bestTrigger.query);
      } else if (activePickerEl) {
        closeAutocompletePicker();
      }

      saveAndSyncContent();
      ctx.markSaving();
    }
  });

  ctx.elements.edBody.addEventListener('keydown', e => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('table-cell-field')) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const td = target.closest('td') as HTMLTableCellElement;
        if (td) {
          let nextTd = (e.shiftKey ? td.previousElementSibling : td.nextElementSibling) as HTMLTableCellElement;
          if (!nextTd) {
            const tr = td.closest('tr') as HTMLTableRowElement;
            const nextTr = (e.shiftKey ? tr.previousElementSibling : tr.nextElementSibling) as HTMLTableRowElement;
            if (nextTr) {
              const cells = nextTr.querySelectorAll('td');
              nextTd = (e.shiftKey ? cells[cells.length - 1] : cells[0]) as HTMLTableCellElement;
            }
          }
          if (nextTd) {
            const field = nextTd.querySelector('.table-cell-field') as HTMLElement;
            if (field) {
              field.focus();
              moveCaret(field);
            }
          }
        }
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const td = target.closest('td') as HTMLTableCellElement;
        if (td && td.dataset.col) {
          const colIdx = parseInt(td.dataset.col);
          const tr = td.closest('tr') as HTMLTableRowElement;
          const nextTr = tr.nextElementSibling as HTMLTableRowElement;
          if (nextTr) {
            const nextTd = nextTr.querySelector(`td[data-col="${colIdx}"]`) as HTMLTableCellElement;
            const field = nextTd?.querySelector('.table-cell-field') as HTMLElement;
            if (field) {
              field.focus();
              moveCaret(field);
            }
          }
        }
        return;
      }
      return;
    }

    if (!target.classList.contains('block-text-field')) return;
    
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;
    
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    
    const activePickerEl = getActivePickerEl();
    if (activePickerEl) {
      const items = getVisiblePickerItems();
      const curIdx = getSelectedPickerIndex();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedPickerIndex((curIdx + 1) % items.length);
        updatePickerSelection(activePickerEl);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedPickerIndex((curIdx - 1 + items.length) % items.length);
        updatePickerSelection(activePickerEl);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        pushToUndo(ctx, n);
        executePickerCommand(ctx, curIdx);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocompletePicker();
        return;
      }
    }

    const activeSlashBlockId = getActiveSlashBlockId();
    if (activeSlashBlockId) {
      const menu = ctx.root.querySelector('.slash-menu') as HTMLElement;
      if (menu) {
        const actionItems = getVisibleSlashItems().filter(i => !i.group);
        const curIdx = getSelectedSlashItemIndex();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSlashItemIndex((curIdx + 1) % actionItems.length);
          updateSlashMenuSelection(menu);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSlashItemIndex((curIdx - 1 + actionItems.length) % actionItems.length);
          updateSlashMenuSelection(menu);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          pushToUndo(ctx, n);
          executeSlashCommand(ctx, curIdx);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSlashMenu(ctx);
          return;
        }
      }
    }

    if (handleFieldShortcuts(ctx, e, target, n, blockId)) {
      return;
    }

    const match = findBlockById(n.blocks, blockId);
    if (!match) return;

    if (e.key === 'Enter') {
      pushToUndo(ctx, n);
      handleBlockEnterKey(ctx, e, target, n, match);
      return;
    }
    
    if (e.key === 'Backspace') {
      if (handleMultiBlockTextDeletion(ctx, e, n)) {
        return;
      }
      pushToUndo(ctx, n);
      handleBlockBackspaceKey(ctx, e, target, n, match, blockId);
      return;
    }
    
    if (e.key === 'Delete') {
      if (handleMultiBlockTextDeletion(ctx, e, n)) {
        return;
      }
      pushToUndo(ctx, n);
      handleBlockDeleteKey(ctx, e, target, n, match, blockId);
      return;
    }
    
    if (e.key === 'ArrowUp') {
      handleBlockArrowUp(ctx, e, n, blockId, target);
      return;
    }
    
    if (e.key === 'ArrowDown') {
      handleBlockArrowDown(ctx, e, n, blockId, target);
      return;
    }
    
    if (e.key === 'Tab') {
      pushToUndo(ctx, n);
      handleBlockTabKey(ctx, e, n, match, blockId);
      return;
    }
  });

  document.addEventListener('keydown', e => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    const isUndo = ctrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey;
    const isRedo = (ctrlOrCmd && e.key.toLowerCase() === 'y') || (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z');

    if (isUndo || isRedo) {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.classList?.contains('table-cell-field') ||
          Boolean(activeEl.closest?.('.table-cell-field, input, textarea'))
        )
      ) {
        return;
      }

      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (n) {
        e.preventDefault();
        if (isRedo) {
          triggerRedo(ctx, n);
        } else {
          triggerUndo(ctx, n);
        }
        return;
      }
    }

    handleDocumentBlockSelectionKeydown(ctx, e);
  });
}
