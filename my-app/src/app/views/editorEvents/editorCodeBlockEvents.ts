import type { AppContext } from '../../context';
import { findBlockById, esc } from '../../../utils';
import { saveAndSyncContent } from '../../../store';
import { rerenderNote, openLanguagePicker, rerenderSelectionStyles } from './pickers/editorPopups';

export function handleCodeBlockControlsClick(ctx: AppContext, e: MouseEvent, target: HTMLElement): boolean {
  const langTrigger = target.closest('.code-lang-container') as HTMLElement;
  if (langTrigger) {
    e.preventDefault();
    e.stopPropagation();
    const bId = langTrigger.dataset.id!;
    openLanguagePicker(ctx, langTrigger, bId);
    return true;
  }
  
  const wrapBtn = target.closest('.code-wrap-btn') as HTMLElement;
  if (wrapBtn) {
    e.preventDefault();
    const bId = wrapBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return true;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      match.block.codeWrap = !match.block.codeWrap;
      rerenderNote(ctx, n);
    }
    return true;
  }

  const fullWidthBtn = target.closest('.code-fullwidth-btn') as HTMLElement;
  if (fullWidthBtn) {
    e.preventDefault();
    const bId = fullWidthBtn.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return true;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      match.block.codeFullWidth = !match.block.codeFullWidth;
      rerenderNote(ctx, n);
    }
    return true;
  }

  return false;
}

export function handleCodeFieldFocusIn(ctx: AppContext, e: FocusEvent) {
  const target = e.target as HTMLElement;
  
  if (target.classList.contains('block-text-field') || target.classList.contains('block-code-field')) {
    if (ctx.st.selectedBlockIds && ctx.st.selectedBlockIds.size > 0) {
      ctx.st.selectedBlockIds.clear();
      rerenderSelectionStyles(ctx);
    }
  }

  if (!target.classList.contains('block-code-field')) return;
  
  const blockEl = target.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return;
  const bId = blockEl.dataset.id!;
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;
  const match = findBlockById(n.blocks, bId);
  if (match) {
    target.textContent = match.block.content || '';
  }
}

export function handleCodeFieldFocusOut(ctx: AppContext, e: FocusEvent) {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('block-code-field')) return;
  
  const blockEl = target.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return;
  const bId = blockEl.dataset.id!;
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;
  const match = findBlockById(n.blocks, bId);
  if (match) {
    const rawText = target.textContent || '';
    match.block.content = rawText;
    
    const lang = match.block.language || 'plaintext';
    const hasPrism = (window as any).Prism;
    if (hasPrism && lang !== 'plaintext') {
      try {
        const grammar = (window as any).Prism.languages[lang];
        if (grammar) {
          target.innerHTML = (window as any).Prism.highlight(rawText, grammar, lang);
        } else {
          target.innerHTML = esc(rawText);
        }
      } catch (err) {
        target.innerHTML = esc(rawText);
      }
    } else {
      target.innerHTML = esc(rawText);
    }
    
    saveAndSyncContent();
    ctx.markSaving();
  }
}
