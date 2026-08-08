import type { AppContext } from '../../context';
import { findBlockById } from '../../../utils';
import { saveAndSyncContent } from '../../../store';
import { 
  showAutocompletePicker, closeAutocompletePicker, updatePickerSelection, executePickerCommand,
  getActivePickerEl, getSelectedPickerIndex, setSelectedPickerIndex, getVisiblePickerItems
} from './pickers/editorAutocompletePicker';
import { 
  showSlashMenu, closeSlashMenu, updateSlashMenuSelection, executeSlashCommand,
  getActiveSlashBlockId, getSelectedSlashItemIndex, setSelectedSlashItemIndex, getVisibleSlashItems
} from './pickers/editorSlashMenu';
import { tryMarkdownShortcut } from './editorMarkdownShortcuts';
import { 
  handleBlockEnterKey, handleBlockBackspaceKey, handleBlockArrowUp, handleBlockArrowDown, handleBlockTabKey 
} from './editorBlockKeyActions';
import { handleFieldShortcuts, handleDocumentBlockSelectionKeydown } from './editorSelectionHotkeys';

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
    if (!target.classList.contains('block-text-field')) return;

    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;

    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;

    const match = findBlockById(n.blocks, blockId);
    if (match) {
      const text = target.textContent || '';
      match.block.content = text;

      if (tryMarkdownShortcut(ctx, n, match.block, match.index, match.parentList, text)) {
        return;
      }

      const activeSlashBlockId = getActiveSlashBlockId();
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx !== -1) {
        const charBefore = slashIdx > 0 ? text[slashIdx - 1] : '';
        const isValidTrigger = slashIdx === 0 || /\s/.test(charBefore);

        if (isValidTrigger) {
          const query = text.slice(slashIdx + 1);
          if (activeSlashBlockId === blockId) {
            showSlashMenu(ctx, blockEl, target, query);
          } else if (query === '' || slashIdx === text.length - 1) {
            showSlashMenu(ctx, blockEl, target, query);
          }
        } else if (activeSlashBlockId === blockId) {
          closeSlashMenu(ctx);
        }
      } else if (activeSlashBlockId === blockId) {
        closeSlashMenu(ctx);
      }

      const activePickerEl = getActivePickerEl();
      const checkAutocompleteTrigger = (symbol: string) => {
        const symbolIdx = text.lastIndexOf(symbol);
        if (symbolIdx !== -1) {
          const charBefore = symbolIdx > 0 ? text[symbolIdx - 1] : '';
          const isValidTrigger = symbolIdx === 0 || /\s/.test(charBefore);
          if (isValidTrigger) {
            const query = text.slice(symbolIdx + symbol.length);
            showAutocompletePicker(ctx, match.block, target, symbol, query);
            return true;
          }
        }
        return false;
      };

      let triggered = false;
      for (const sym of ['@', '[[', '+']) {
        if (checkAutocompleteTrigger(sym)) {
          triggered = true;
          break;
        }
      }
      if (!triggered && activePickerEl) {
        closeAutocompletePicker();
      }

      saveAndSyncContent();
      ctx.markSaving();
    }
  });

  ctx.elements.edBody.addEventListener('keydown', e => {
    const target = e.target as HTMLElement;
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
      handleBlockEnterKey(ctx, e, target, n, match);
      return;
    }
    
    if (e.key === 'Backspace') {
      handleBlockBackspaceKey(ctx, e, target, n, match, blockId);
      return;
    }
    
    if (e.key === 'ArrowUp') {
      handleBlockArrowUp(ctx, e, n, blockId);
      return;
    }
    
    if (e.key === 'ArrowDown') {
      handleBlockArrowDown(ctx, e, n, blockId);
      return;
    }
    
    if (e.key === 'Tab') {
      handleBlockTabKey(ctx, e, n, match, blockId);
      return;
    }
  });

  document.addEventListener('keydown', e => {
    handleDocumentBlockSelectionKeydown(ctx, e);
  });
}
