// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { isCaretAtStart, isCaretAtEnd, isCaretOnFirstLine, isCaretOnLastLine } from '../utils/domHelpers';
import { handleBlockBackspaceKey, handleBlockDeleteKey } from '../app/views/editorEvents/editorBlockKeyActions';
import type { AppContext } from '../app/context';
import type { Note } from '../types';

describe('Editor Key Actions', () => {
  it('correctly detects caret at start and end', () => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.textContent = 'hello';
    document.body.appendChild(el);

    // Mock window.getSelection
    const range = document.createRange();
    const sel = window.getSelection();
    
    // Set selection at start (offset 0)
    range.setStart(el.firstChild!, 0);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    expect(isCaretAtStart(el)).toBe(true);
    expect(isCaretAtEnd(el)).toBe(false);

    // Set selection at end (offset 5)
    range.setStart(el.firstChild!, 5);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    expect(isCaretAtStart(el)).toBe(false);
    expect(isCaretAtEnd(el)).toBe(true);

    document.body.removeChild(el);
  });

  it('handleBlockBackspaceKey merges with previous block when caret is at start', () => {
    const note: Note = {
      id: 'n1',
      title: 'Note 1',
      body: '',
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'First block', children: [] },
        { id: 'b2', type: 'paragraph', content: 'Second block', children: [] }
      ],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 0
    };

    const edBody = document.createElement('div');
    edBody.innerHTML = `
      <div class="block-wrapper" data-id="b1">
        <div class="block-text-field" contenteditable="true">First block</div>
      </div>
      <div class="block-wrapper" data-id="b2">
        <div class="block-text-field" contenteditable="true">Second block</div>
      </div>
    `;
    document.body.appendChild(edBody);

    const mockCtx = {
      elements: {
        edBody: edBody
      },
      st: {
        notes: [note]
      },
      api: {
        theme: 'light'
      },
      markSaving: vi.fn()
    } as unknown as AppContext;

    const b2Field = edBody.querySelectorAll('.block-text-field')[1] as HTMLElement;
    
    // Set caret at start of b2Field
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(b2Field.firstChild!, 0);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    const mockEvent = {
      preventDefault: vi.fn()
    } as unknown as KeyboardEvent;

    const match = {
      parentList: note.blocks,
      index: 1,
      block: note.blocks[1]
    };

    handleBlockBackspaceKey(mockCtx, mockEvent, b2Field, note, match, 'b2');

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    // After merge, first block should contain concatenated content
    expect(note.blocks).toHaveLength(1);
    expect(note.blocks[0].content).toBe('First blockSecond block');

    document.body.removeChild(edBody);
  });

  it('handleBlockDeleteKey merges with next block when caret is at end', () => {
    const note: Note = {
      id: 'n1',
      title: 'Note 1',
      body: '',
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'First block', children: [] },
        { id: 'b2', type: 'paragraph', content: 'Second block', children: [] }
      ],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 0
    };

    const edBody = document.createElement('div');
    edBody.innerHTML = `
      <div class="block-wrapper" data-id="b1">
        <div class="block-text-field" contenteditable="true">First block</div>
      </div>
      <div class="block-wrapper" data-id="b2">
        <div class="block-text-field" contenteditable="true">Second block</div>
      </div>
    `;
    document.body.appendChild(edBody);

    const mockCtx = {
      elements: {
        edBody: edBody
      },
      st: {
        notes: [note]
      },
      api: {
        theme: 'light'
      },
      markSaving: vi.fn()
    } as unknown as AppContext;

    const b1Field = edBody.querySelectorAll('.block-text-field')[0] as HTMLElement;
    
    // Set caret at end of b1Field (length 11)
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(b1Field.firstChild!, 11);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    const mockEvent = {
      preventDefault: vi.fn()
    } as unknown as KeyboardEvent;

    const match = {
      parentList: note.blocks,
      index: 0,
      block: note.blocks[0]
    };

    handleBlockDeleteKey(mockCtx, mockEvent, b1Field, note, match, 'b1');

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    // After delete merge, the second block should be merged into the first, and note.blocks length should be 1
    expect(note.blocks).toHaveLength(1);
    expect(note.blocks[0].content).toBe('First blockSecond block');

    document.body.removeChild(edBody);
  });

  it('correctly detects caret on first line and last line in multiline elements', () => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.innerHTML = 'First line\nSecond line';
    document.body.appendChild(el);

    const textNode = el.firstChild!; // "First line\nSecond line"
    const sel = window.getSelection();
    const range = document.createRange();

    // Caret on line 1 (offset 3)
    range.setStart(textNode, 3);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    expect(isCaretOnFirstLine(el)).toBe(true);
    expect(isCaretOnLastLine(el)).toBe(false);

    // Caret on line 2 (offset 15)
    range.setStart(textNode, 15);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    expect(isCaretOnFirstLine(el)).toBe(false);
    expect(isCaretOnLastLine(el)).toBe(true);

    document.body.removeChild(el);
  });

  it('prevents multiple app instances from double-triggering undo on single Ctrl+Z', () => {
    const note: Note = {
      id: 'n_undo_test',
      title: 'Undo Test',
      body: '',
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'Block 1', children: [] }
      ],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 0
    };

    const rootA = document.createElement('div');
    const edBodyA = document.createElement('div');
    edBodyA.className = 'ed-body';
    edBodyA.innerHTML = `
      <div class="block-wrapper" data-id="b1">
        <div class="block-text-field" contenteditable="true">Block 1</div>
      </div>
    `;
    rootA.appendChild(edBodyA);
    document.body.appendChild(rootA);

    const rootB = document.createElement('div');
    const edBodyB = document.createElement('div');
    edBodyB.className = 'ed-body';
    rootB.appendChild(edBodyB);
    document.body.appendChild(rootB);

    const fieldA = edBodyA.querySelector('.block-text-field') as HTMLElement;
    fieldA.focus();

    // Verify activeElement is in rootA
    expect(rootA.contains(document.activeElement)).toBe(true);
    expect(rootB.contains(document.activeElement)).toBe(false);

    document.body.removeChild(rootA);
    document.body.removeChild(rootB);
  });
});

