// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppContext } from '../app/context';
import type { Note, Block } from '../types';
import { executeSlashCommand, showSlashMenu, closeSlashMenu } from '../app/views/editorEvents/pickers/editorSlashMenu';
import { 
  showAutocompletePicker, closeAutocompletePicker, executePickerCommand, getActivePickerEl 
} from '../app/views/editorEvents/pickers/editorAutocompletePicker';
import { openEmojiPicker, openMentionPicker } from '../app/views/editorEvents/pickers/editorInlinePickers';

describe('Phase 2 - Slash Commands & Autocomplete Pickers', () => {
  let mockCtx: AppContext;
  let currentNote: Note;

  beforeEach(() => {
    document.body.innerHTML = '';
    currentNote = {
      id: 'n1',
      title: 'Current Note',
      body: '',
      blocks: [
        { id: 'b1', type: 'paragraph', content: '', children: [] }
      ],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 0
    };

    const edBody = document.createElement('div');
    edBody.className = 'editor-body';
    const edInner = document.createElement('div');
    edInner.className = 'editor-inner';
    const edTitle = document.createElement('div');
    document.body.appendChild(edInner);
    edInner.appendChild(edBody);

    mockCtx = {
      st: {
        notes: [currentNote],
        sel: 'n1',
        ordMin: 0,
        lastUsedColor: '',
        lastUsedBgColor: ''
      },
      elements: {
        edBody,
        edInner,
        edTitle
      },
      root: document.body,
      selectNote: vi.fn(),
      newSubFolder: vi.fn(),
      toast: vi.fn(),
      markSaving: vi.fn(),
      showPrompt: vi.fn()
    } as unknown as AppContext;
  });

  it('BUG-14 & BUG-26: preserves typed content before slash as subpage title and avoids URL truncation', () => {
    currentNote.blocks[0].content = 'Meeting Agenda /subpage';
    
    const blockEl = document.createElement('div');
    blockEl.className = 'block-wrapper';
    blockEl.dataset.id = 'b1';
    const textField = document.createElement('div');
    textField.className = 'block-text-field';
    textField.textContent = 'Meeting Agenda /subpage';
    blockEl.appendChild(textField);
    mockCtx.elements.edBody.appendChild(blockEl);

    showSlashMenu(mockCtx, blockEl, textField, 'subpage');
    executeSlashCommand(mockCtx, 0);

    expect(currentNote.blocks[0].type).toBe('subpage');
    expect(currentNote.blocks[0].content).toBe('Meeting Agenda');
    
    expect(mockCtx.st.notes.length).toBe(2);
    const newNote = mockCtx.st.notes[0];
    expect(newNote.title).toBe('Meeting Agenda');
    expect(newNote.parentId).toBe('n1');
    expect(mockCtx.selectNote).toHaveBeenCalledWith(newNote.id, true);
  });

  it('BUG-26: does not truncate URLs when executing a slash command', () => {
    currentNote.blocks[0].content = 'Check https://example.com/api/v1 /h1';
    
    const blockEl = document.createElement('div');
    blockEl.className = 'block-wrapper';
    blockEl.dataset.id = 'b1';
    const textField = document.createElement('div');
    textField.className = 'block-text-field';
    textField.textContent = 'Check https://example.com/api/v1 /h1';
    blockEl.appendChild(textField);
    mockCtx.elements.edBody.appendChild(blockEl);

    showSlashMenu(mockCtx, blockEl, textField, 'h1');
    executeSlashCommand(mockCtx, 0);

    expect(currentNote.blocks[0].type).toBe('heading1');
    expect(currentNote.blocks[0].content).toBe('Check https://example.com/api/v1');
  });

  it('BUG-27: removes trigger block from parentList upon subfolder creation', () => {
    currentNote.blocks = [
      { id: 'b1', type: 'paragraph', content: 'Intro', children: [] },
      { id: 'b2', type: 'paragraph', content: '/subfolder', children: [] }
    ];

    const blockEl = document.createElement('div');
    blockEl.className = 'block-wrapper';
    blockEl.dataset.id = 'b2';
    const textField = document.createElement('div');
    textField.className = 'block-text-field';
    textField.textContent = '/subfolder';
    blockEl.appendChild(textField);
    mockCtx.elements.edBody.appendChild(blockEl);

    showSlashMenu(mockCtx, blockEl, textField, 'subfolder');
    executeSlashCommand(mockCtx, 0);

    expect(currentNote.blocks.find(b => b.id === 'b2')).toBeUndefined();
    expect(mockCtx.newSubFolder).toHaveBeenCalledWith('n1');
  });

  it('BUG-28: supports keyboard navigation and saves target note in /moveto', () => {
    const targetNote: Note = {
      id: 'n2',
      title: 'Target Note',
      body: '',
      blocks: [],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 1
    };
    mockCtx.st.notes.push(targetNote);
    currentNote.blocks[0].content = 'Block to move /moveto';

    const blockEl = document.createElement('div');
    blockEl.className = 'block-wrapper';
    blockEl.dataset.id = 'b1';
    const textField = document.createElement('div');
    textField.className = 'block-text-field';
    blockEl.appendChild(textField);
    mockCtx.elements.edBody.appendChild(blockEl);

    showSlashMenu(mockCtx, blockEl, textField, 'moveto');
    executeSlashCommand(mockCtx, 0);

    const movetoPicker = mockCtx.elements.edInner.querySelector('.slash-menu.mention-picker');
    expect(movetoPicker).not.toBeNull();

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    document.dispatchEvent(enterEvent);

    expect(targetNote.blocks.length).toBe(1);
    expect(targetNote.blocks[0].content).toBe('Block to move');
    expect(mockCtx.toast).toHaveBeenCalledWith(expect.stringContaining('Block moved to "Target Note"'), '', expect.any(Function));
  });

  it('BUG-31: closes autocomplete picker when search yields 0 items', () => {
    const textField = document.createElement('div');
    textField.className = 'block-text-field';
    mockCtx.elements.edBody.appendChild(textField);

    showAutocompletePicker(mockCtx, currentNote.blocks[0], textField, '@', 'NonExistentPersonOrNoteXYZ');
    expect(getActivePickerEl()).toBeNull();
  });

  it('BUG-32 & BUG-30: autocomplete mousedown executes command and preserves caret position', () => {
    const otherNote: Note = {
      id: 'n2',
      title: 'Doc Note',
      body: '',
      blocks: [],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 1
    };
    mockCtx.st.notes.push(otherNote);

    const textField = document.createElement('div');
    textField.className = 'block-text-field';
    textField.contentEditable = 'true';
    const textNode = document.createTextNode('Hello @Doc');
    textField.appendChild(textNode);
    document.body.appendChild(textField);

    const range = document.createRange();
    const sel = window.getSelection()!;
    range.setStart(textNode, 10);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    showAutocompletePicker(mockCtx, currentNote.blocks[0], textField, '@', 'Doc');
    const picker = getActivePickerEl();
    expect(picker).not.toBeNull();

    const firstItem = picker!.querySelector('.slash-item') as HTMLElement;
    expect(firstItem).not.toBeNull();

    const mousedownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    firstItem.dispatchEvent(mousedownEvent);

    expect(textField.textContent).toContain('[[Doc Note]]');
    expect(getActivePickerEl()).toBeNull();
  });

  it('BUG-29: supports keyboard navigation in inline emoji & mention pickers', () => {
    const block = currentNote.blocks[0];
    const blockEl = document.createElement('div');
    blockEl.className = 'block-wrapper';
    blockEl.dataset.id = 'b1';
    const textField = document.createElement('div');
    textField.className = 'block-text-field';
    blockEl.appendChild(textField);
    mockCtx.elements.edBody.appendChild(blockEl);

    // Emoji picker
    openEmojiPicker(mockCtx, block, currentNote, 'b1');
    const emojiPicker = mockCtx.elements.edInner.querySelector('.emoji-picker');
    expect(emojiPicker).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    expect(block.content).toBeTruthy();
    expect(mockCtx.elements.edInner.querySelector('.emoji-picker')).toBeNull();

    // Mention picker
    const otherNote: Note = {
      id: 'n2',
      title: 'Target Doc',
      body: '',
      blocks: [],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 1
    };
    mockCtx.st.notes.push(otherNote);

    openMentionPicker(mockCtx, block, currentNote, 'b1');
    const mentionPicker = mockCtx.elements.edInner.querySelector('.mention-picker');
    expect(mentionPicker).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(block.content).toContain('[[Target Doc]]');
    expect(mockCtx.elements.edInner.querySelector('.mention-picker')).toBeNull();
  });
});
