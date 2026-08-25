// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMultiBlockTextDeletion } from '../app/views/editorEvents/editorMultiBlockSelection';
import { initEditorClickHandlers } from '../app/views/editorEvents/editorClickHandlers';
import { handleDocumentBlockSelectionKeydown } from '../app/views/editorEvents/editorSelectionHotkeys';
import type { AppContext } from '../app/context';
import type { Note } from '../types';

describe('handleMultiBlockTextDeletion', () => {
  let ctx: AppContext;
  let sampleNote: Note;

  beforeEach(() => {
    document.body.innerHTML = '';
    sampleNote = {
      id: 'note-1',
      nb: 'default',
      title: 'Test Note',
      body: '',
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'Hello World', children: [] },
        { id: 'b2', type: 'paragraph', content: 'Middle Block', children: [] },
        { id: 'b3', type: 'paragraph', content: 'Testing Notion Style', children: [] }
      ],
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 0
    };

    ctx = {
      st: {
        sel: 'note-1',
        notes: [sampleNote],
        undoStack: [],
        redoStack: [],
        selectedBlockIds: new Set()
      },
      elements: {
        edBody: document.createElement('div')
      },
      api: {
        theme: 'dark'
      },
      root: document,
      markSaving: vi.fn()
    } as unknown as AppContext;
  });

  it('returns false if there is no selection or selection is collapsed', () => {
    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    expect(handleMultiBlockTextDeletion(ctx, event, sampleNote)).toBe(false);
  });

  it('deletes intermediate blocks and merges text across multiple blocks', () => {
    const edBody = document.createElement('div');
    ctx.elements.edBody = edBody;
    document.body.appendChild(edBody);

    const wrapper1 = document.createElement('div');
    wrapper1.className = 'block-wrapper';
    wrapper1.dataset.id = 'b1';
    const field1 = document.createElement('div');
    field1.className = 'block-text-field';
    field1.textContent = 'Hello World';
    wrapper1.appendChild(field1);
    edBody.appendChild(wrapper1);

    const wrapper2 = document.createElement('div');
    wrapper2.className = 'block-wrapper';
    wrapper2.dataset.id = 'b2';
    const field2 = document.createElement('div');
    field2.className = 'block-text-field';
    field2.textContent = 'Middle Block';
    wrapper2.appendChild(field2);
    edBody.appendChild(wrapper2);

    const wrapper3 = document.createElement('div');
    wrapper3.className = 'block-wrapper';
    wrapper3.dataset.id = 'b3';
    const field3 = document.createElement('div');
    field3.className = 'block-text-field';
    field3.textContent = 'Testing Notion Style';
    wrapper3.appendChild(field3);
    edBody.appendChild(wrapper3);

    const textNode1 = field1.firstChild!;
    const textNode3 = field3.firstChild!;

    const range = document.createRange();
    range.setStart(textNode1, 5); // after "Hello"
    range.setEnd(textNode3, 7);   // after "Testing"

    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const handled = handleMultiBlockTextDeletion(ctx, event, sampleNote);

    expect(handled).toBe(true);
    expect(sampleNote.blocks).toHaveLength(1);
    expect(sampleNote.blocks[0].id).toBe('b1');
    expect(sampleNote.blocks[0].content).toBe('Hello Notion Style');
  });

  it('selects multiple blocks on mouse drag across block boundaries', () => {
    const edBody = document.createElement('div');
    edBody.className = 'ed-body';
    ctx.elements.edBody = edBody;
    document.body.appendChild(edBody);

    const wrapper1 = document.createElement('div');
    wrapper1.className = 'block-wrapper';
    wrapper1.dataset.id = 'b1';
    const field1 = document.createElement('div');
    field1.className = 'block-text-field';
    field1.textContent = 'Hello World';
    wrapper1.appendChild(field1);
    edBody.appendChild(wrapper1);

    const wrapper2 = document.createElement('div');
    wrapper2.className = 'block-wrapper';
    wrapper2.dataset.id = 'b2';
    const field2 = document.createElement('div');
    field2.className = 'block-text-field';
    field2.textContent = 'Middle Block';
    wrapper2.appendChild(field2);
    edBody.appendChild(wrapper2);

    const wrapper3 = document.createElement('div');
    wrapper3.className = 'block-wrapper';
    wrapper3.dataset.id = 'b3';
    const field3 = document.createElement('div');
    field3.className = 'block-text-field';
    field3.textContent = 'Testing Notion Style';
    wrapper3.appendChild(field3);
    edBody.appendChild(wrapper3);

    initEditorClickHandlers(ctx);

    // 1. Mouse down on block 1
    field1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));

    // 2. Mouse move to block 2 (buttons = 1)
    wrapper2.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1 }));

    // Expect blocks b1 and b2 to be selected
    expect(ctx.st.selectedBlockIds?.has('b1')).toBe(true);
    expect(ctx.st.selectedBlockIds?.has('b2')).toBe(true);
    expect(ctx.st.selectedBlockIds?.size).toBe(2);

    // 3. Mouse move further to block 3
    wrapper3.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1 }));
    expect(ctx.st.selectedBlockIds?.size).toBe(3);
    expect(ctx.st.selectedBlockIds?.has('b3')).toBe(true);

    // 4. Mouse up
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(ctx.st.selectedBlockIds?.size).toBe(3);
  });

  it('handles Ctrl+A and Ctrl+C for multi-block selection', () => {
    ctx.st.selectedBlockIds = new Set(['b1', 'b2']);

    // Mock clipboard API
    let copiedText = '';
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation((t: string) => {
          copiedText = t;
          return Promise.resolve();
        })
      }
    });

    // Test Ctrl+C
    const copyEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true });
    handleDocumentBlockSelectionKeydown(ctx, copyEvent);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(copiedText).toContain('Hello World');
    expect(copiedText).toContain('Middle Block');

    // Test Ctrl+A (select all blocks)
    const selectAllEvent = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
    handleDocumentBlockSelectionKeydown(ctx, selectAllEvent);

    expect(ctx.st.selectedBlockIds?.size).toBe(3);
  });
});
