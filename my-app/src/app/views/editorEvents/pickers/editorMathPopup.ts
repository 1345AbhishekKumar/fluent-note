import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { findBlockById } from '../../../../utils';
import { rerenderNote, focusNextBlockOrNew } from './editorPopupUtils';

export function openMathPopupEditor(ctx: AppContext, block: Block, n: Note, anchorEl: HTMLElement, originalState?: Partial<Block>) {
  ctx.root.querySelector('.math-popup-editor')?.remove();

  const popup = document.createElement('div');
  popup.className = 'math-popup-editor';
  popup.style.cssText = `
    position: absolute;
    display: flex;
    align-items: center;
    background: #252526;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    gap: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  `;

  const textarea = document.createElement('textarea');
  textarea.className = 'math-popup-textarea';
  textarea.value = block.content || '';
  textarea.style.cssText = `
    background: transparent;
    border: none;
    color: #ffffff;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 13px;
    outline: none;
    resize: none;
    width: 280px;
    height: 38px;
    line-height: 1.4;
  `;
  textarea.placeholder = "Enter TeX / LaTeX formula...";

  const doneBtn = document.createElement('button');
  doneBtn.className = 'math-popup-done-btn';
  doneBtn.innerHTML = `Done <span style="font-size: 10px; margin-left: 2px;">↵</span>`;
  doneBtn.style.cssText = `
    background: #0078d4;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    white-space: nowrap;
    transition: background 0.15s;
  `;
  doneBtn.addEventListener('mouseenter', () => doneBtn.style.background = '#106ebe');
  doneBtn.addEventListener('mouseleave', () => doneBtn.style.background = '#0078d4');

  popup.appendChild(textarea);
  popup.appendChild(doneBtn);

  const rect = anchorEl.getBoundingClientRect();
  const parentRect = ctx.elements.edInner.getBoundingClientRect();
  popup.style.left = `${rect.left - parentRect.left}px`;
  popup.style.top = `${rect.bottom - parentRect.top + 6}px`;

  ctx.elements.edInner.appendChild(popup);
  textarea.focus();
  textarea.select();

  let finished = false;
  const saveAndClose = () => {
    if (finished) return;
    finished = true;
    block.content = textarea.value.trim();
    rerenderNote(ctx, n);
    popup.remove();
    
    const match = findBlockById(n.blocks, block.id);
    if (match) {
      focusNextBlockOrNew(ctx, n, match.index, match.parentList);
    }
  };

  const cancelAndClose = () => {
    if (finished) return;
    finished = true;
    if (originalState) {
      Object.assign(block, originalState);
    }
    rerenderNote(ctx, n);
    popup.remove();
  };

  doneBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    saveAndClose();
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelAndClose();
    }
  });

  setTimeout(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        saveAndClose();
        document.removeEventListener('mousedown', handleOutsideClick);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
  }, 0);
}
