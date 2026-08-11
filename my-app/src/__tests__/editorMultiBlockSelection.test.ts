// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMultiBlockTextDeletion } from '../app/views/editorEvents/editorMultiBlockSelection';
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
});
