import type { AppContext } from '../../context';
import type { Note, Block } from '../../../types';
import { rerenderNote } from './pickers/editorPopupUtils';
import { saveAndSyncContent } from '../../../store';
import { moveCaret } from '../../../utils';

interface HistoryState {
  blocks: Block[];
  focusedBlockId?: string;
  caretOffset?: number;
}

const MAX_HISTORY = 100;
const noteUndoStacks = new Map<string, HistoryState[]>();
const noteRedoStacks = new Map<string, HistoryState[]>();

let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isTypingSessionActive = false;
let activeNoteIdForTyping: string | null = null;

export function commitTypingSession() {
  if (typingDebounceTimer) {
    clearTimeout(typingDebounceTimer);
    typingDebounceTimer = null;
  }
  isTypingSessionActive = false;
  activeNoteIdForTyping = null;
}

function getActiveCaretInfo(ctx: AppContext): { focusedBlockId?: string; caretOffset?: number } {
  const activeEl = document.activeElement as HTMLElement;
  if (!activeEl || !activeEl.classList.contains('block-text-field')) return {};
  const blockEl = activeEl.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return {};

  const focusedBlockId = blockEl.dataset.id;
  let caretOffset = 0;
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (activeEl.contains(range.startContainer)) {
        const preRange = document.createRange();
        preRange.selectNodeContents(activeEl);
        preRange.setEnd(range.startContainer, range.startOffset);
        caretOffset = preRange.toString().length;
      }
    }
  } catch (e) {
    // Ignore caret offset calculation failures
  }
  return { focusedBlockId, caretOffset };
}

export function pushToUndo(ctx: AppContext, n: Note) {
  commitTypingSession();

  if (!noteUndoStacks.has(n.id)) {
    noteUndoStacks.set(n.id, []);
  }
  if (!noteRedoStacks.has(n.id)) {
    noteRedoStacks.set(n.id, []);
  }

  const stack = noteUndoStacks.get(n.id)!;
  const { focusedBlockId, caretOffset } = getActiveCaretInfo(ctx);
  const state: HistoryState = {
    blocks: JSON.parse(JSON.stringify(n.blocks)),
    focusedBlockId,
    caretOffset
  };

  stack.push(state);
  if (stack.length > MAX_HISTORY) {
    stack.shift();
  }
  noteRedoStacks.set(n.id, []);
}

export function pushToUndoDebounced(ctx: AppContext, n: Note) {
  if (!isTypingSessionActive || activeNoteIdForTyping !== n.id) {
    pushToUndo(ctx, n);
    isTypingSessionActive = true;
    activeNoteIdForTyping = n.id;
  }

  if (typingDebounceTimer) {
    clearTimeout(typingDebounceTimer);
  }
  typingDebounceTimer = setTimeout(() => {
    commitTypingSession();
  }, 1000);
}

function restoreFocusAndCaret(ctx: AppContext, state: HistoryState) {
  if (!state.focusedBlockId) return;
  const field = ctx.elements.edBody.querySelector(
    `[data-id="${state.focusedBlockId}"] .block-text-field`
  ) as HTMLElement;
  if (!field) return;

  field.focus();
  const targetOffset = state.caretOffset ?? 0;
  try {
    const sel = window.getSelection();
    if (!sel) return;

    const range = document.createRange();
    let accumulated = 0;
    let set = false;

    const nodeWalker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
    let currentNode = nodeWalker.nextNode();

    while (currentNode) {
      const len = currentNode.textContent?.length || 0;
      if (accumulated + len >= targetOffset) {
        range.setStart(currentNode, Math.max(0, targetOffset - accumulated));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        set = true;
        break;
      }
      accumulated += len;
      currentNode = nodeWalker.nextNode();
    }

    if (!set) {
      moveCaret(field, false);
    }
  } catch (e) {
    moveCaret(field, false);
  }
}

export function triggerUndo(ctx: AppContext, n: Note) {
  commitTypingSession();

  const stack = noteUndoStacks.get(n.id);
  if (!stack || stack.length === 0) return;

  const { focusedBlockId, caretOffset } = getActiveCaretInfo(ctx);
  const currentState: HistoryState = {
    blocks: JSON.parse(JSON.stringify(n.blocks)),
    focusedBlockId,
    caretOffset
  };

  if (!noteRedoStacks.has(n.id)) noteRedoStacks.set(n.id, []);
  noteRedoStacks.get(n.id)!.push(currentState);

  const prev = stack.pop()!;
  n.blocks = prev.blocks;
  rerenderNote(ctx, n);
  saveAndSyncContent();
  restoreFocusAndCaret(ctx, prev);
}

export function triggerRedo(ctx: AppContext, n: Note) {
  commitTypingSession();

  const stack = noteRedoStacks.get(n.id);
  if (!stack || stack.length === 0) return;

  const { focusedBlockId, caretOffset } = getActiveCaretInfo(ctx);
  const currentState: HistoryState = {
    blocks: JSON.parse(JSON.stringify(n.blocks)),
    focusedBlockId,
    caretOffset
  };

  if (!noteUndoStacks.has(n.id)) noteUndoStacks.set(n.id, []);
  noteUndoStacks.get(n.id)!.push(currentState);

  const next = stack.pop()!;
  n.blocks = next.blocks;
  rerenderNote(ctx, n);
  saveAndSyncContent();
  restoreFocusAndCaret(ctx, next);
}

