import { describe, it, expect } from 'vitest';
import {
  deriveDeterministicId,
  deserializeMarkdownToNote,
  extractLinks,
  getReferencedNoteIds,
  renameNoteWikilinks
} from '../utils';
import {
  goBack,
  goForward,
  sanitizeHistory,
  collectDescendantNoteAndFolderIds
} from '../app/appActions';
import { saveNotes } from '../store';
import { saveNotebooks } from '../store/notebookStore';
import type { Note, Folder } from '../types';

describe('Phase 3 - Vault, Navigation & State Fixes', () => {
  describe('BUG-38: Deterministic Fallback IDs', () => {
    it('generates consistent deterministic IDs from relative path or title', () => {
      const id1 = deriveDeterministicId('work/Design Spec.md');
      const id2 = deriveDeterministicId('work/Design Spec.md');
      const id3 = deriveDeterministicId('personal/Journal.md');

      expect(id1).toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id1.startsWith('n-')).toBe(true);
    });

    it('uses deterministic fallback ID when deserializing markdown with missing id', () => {
      const rawMarkdown = `---
title: "Architecture Guide"
nb: "design"
---
# Architecture Guide
Details here.
`;
      const note1 = deserializeMarkdownToNote(rawMarkdown);
      const note2 = deserializeMarkdownToNote(rawMarkdown);

      expect(note1.id).toBe(note2.id);
      expect(note1.id.startsWith('n-')).toBe(true);
      expect(note1.title).toBe('Architecture Guide');
    });
  });

  describe('BUG-40: Stale localStorage Note Caching Removal', () => {
    it('does not cache notes or notebooks into localStorage', () => {
      saveNotes([{ id: 'test', title: 'Test Note', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0 }]);
      saveNotebooks([{ id: 'nb1', name: 'Notebook 1', color: '#ff0000' }]);

      // Verify that localStorage does not have stored keys
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('fluent_notes_data')).toBeNull();
        expect(localStorage.getItem('fluent_notebooks')).toBeNull();
      }
    });
  });

  describe('BUG-41: History Traversal Actions (goBack / goForward)', () => {
    it('navigates history back and forward correctly', () => {
      const dummyCtx: any = {
        st: {
          sel: 'note-3',
          historyStack: ['note-1', 'note-2', 'note-3'],
          historyIndex: 2,
          folders: [],
          notes: [],
          expandedFolders: new Set()
        },
        elements: {
          edTitle: { focus: () => {} },
          edInner: { classList: { add: () => {}, remove: () => {} } }
        },
        root: { classList: { contains: () => false, add: () => {} } },
        renderList: () => {},
        renderSidebar: () => {},
        renderEditor: () => {}
      };

      // Go back to note-2
      goBack(dummyCtx);
      expect(dummyCtx.st.historyIndex).toBe(1);
      expect(dummyCtx.st.sel).toBe('note-2');

      // Go back to note-1
      goBack(dummyCtx);
      expect(dummyCtx.st.historyIndex).toBe(0);
      expect(dummyCtx.st.sel).toBe('note-1');

      // Attempting to go back beyond 0 does nothing
      goBack(dummyCtx);
      expect(dummyCtx.st.historyIndex).toBe(0);

      // Go forward to note-2
      goForward(dummyCtx);
      expect(dummyCtx.st.historyIndex).toBe(1);
      expect(dummyCtx.st.sel).toBe('note-2');

      // Go forward to note-3
      goForward(dummyCtx);
      expect(dummyCtx.st.historyIndex).toBe(2);
      expect(dummyCtx.st.sel).toBe('note-3');

      // Attempting to go forward beyond end does nothing
      goForward(dummyCtx);
      expect(dummyCtx.st.historyIndex).toBe(2);
    });
  });

  describe('BUG-42: Stale Note History on Delete', () => {
    it('sanitizes history stack when a note is deleted', () => {
      const dummyCtx: any = {
        st: {
          historyStack: ['n1', 'n2', 'n3', 'n4'],
          historyIndex: 2 // currently at 'n3'
        }
      };

      // Delete 'n3'
      sanitizeHistory(dummyCtx, ['n3']);
      expect(dummyCtx.st.historyStack).toEqual(['n1', 'n2', 'n4']);
      expect(dummyCtx.st.historyIndex).toBe(2); // now points to 'n4' or clamped

      // Delete 'n4' (the last item)
      sanitizeHistory(dummyCtx, ['n4']);
      expect(dummyCtx.st.historyStack).toEqual(['n1', 'n2']);
      expect(dummyCtx.st.historyIndex).toBe(1); // clamped to 'n2'

      // Delete all remaining
      sanitizeHistory(dummyCtx, ['n1', 'n2']);
      expect(dummyCtx.st.historyStack).toEqual([]);
      expect(dummyCtx.st.historyIndex).toBe(-1);
    });
  });

  describe('BUG-43: Orphaned Folder Children & Cascading Deletion', () => {
    it('collects all descendant notes and subfolders recursively', () => {
      const notes: Note[] = [
        { id: 'n-root', title: 'Root', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0, parentId: null },
        { id: 'n-child1', title: 'Child 1', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0, parentId: 'f-parent' },
        { id: 'n-grandchild', title: 'Grandchild', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0, parentId: 'f-sub' },
        { id: 'n-subnote', title: 'Subnote of note', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0, parentId: 'n-child1' }
      ];

      const folders: Folder[] = [
        { id: 'f-parent', name: 'Parent Folder', parentId: null },
        { id: 'f-sub', name: 'Sub Folder', parentId: 'f-parent' }
      ];

      const { noteIds, folderIds } = collectDescendantNoteAndFolderIds(notes, folders, 'f-parent');
      expect(folderIds.has('f-sub')).toBe(true);
      expect(noteIds.has('n-child1')).toBe(true);
      expect(noteIds.has('n-grandchild')).toBe(true);
      expect(noteIds.has('n-subnote')).toBe(true);
      expect(noteIds.has('n-root')).toBe(false);
    });
  });

  describe('BUG-45: Stopword Link Truncation Fix', () => {
    it('extracts mentions without stopword lookahead truncation', () => {
      const allNotes: Note[] = [
        { id: 'n1', title: 'Design with Team', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0 },
        { id: 'n2', title: 'Task for Abhishek', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0 },
        { id: 'n3', title: 'Note on Architecture', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0 }
      ];

      const text = 'Please check @Design with Team and @Task for Abhishek as well as @Note on Architecture.';
      const { at } = extractLinks(text, allNotes);

      expect(at).toContain('Design with Team');
      expect(at).toContain('Task for Abhishek');
      expect(at).toContain('Note on Architecture');
    });

    it('resolves referenced note IDs with stopword titles', () => {
      const allNotes: Note[] = [
        { id: 'n1', title: 'Plan and Execution', body: '', blocks: [], nb: 'work', tags: [], pinned: false, date: '', ord: 0 },
        { id: 'n2', title: 'Note referencing plan', body: '', blocks: [{ id: 'b1', type: 'paragraph', content: 'Follow @Plan and Execution closely.', children: [] }], nb: 'work', tags: [], pinned: false, date: '', ord: 0 }
      ];

      const refIds = getReferencedNoteIds(allNotes[1], allNotes);
      expect(refIds.has('n1')).toBe(true);
    });
  });

  describe('BUG-46: Wikilink Rename Refactoring', () => {
    it('updates [[Old Title]] references to [[New Title]] across notes and blocks', () => {
      const notes: Note[] = [
        {
          id: 'n1',
          title: 'New Feature Specs',
          body: '',
          blocks: [{ id: 'b1', type: 'paragraph', content: 'See [[Old Feature Specs]] for details.', children: [] }],
          nb: 'work',
          tags: [],
          pinned: false,
          date: '',
          ord: 0
        },
        {
          id: 'n2',
          title: 'Roadmap',
          body: 'Check out [[Old Feature Specs]] and [[Other Note]]',
          blocks: [
            {
              id: 'b2',
              type: 'todo',
              content: 'Read [[Old Feature Specs]]',
              children: [
                { id: 'b3', type: 'paragraph', content: 'Nested link: [[Old Feature Specs]]', children: [] }
              ]
            }
          ],
          nb: 'work',
          tags: [],
          pinned: false,
          date: '',
          ord: 0
        }
      ];

      const updateCount = renameNoteWikilinks(notes, 'Old Feature Specs', 'New Feature Specs');
      expect(updateCount).toBe(4);

      expect(notes[0].blocks[0].content).toBe('See [[New Feature Specs]] for details.');
      expect(notes[1].body).toContain('[[New Feature Specs]]');
      expect(notes[1].body).not.toContain('[[Old Feature Specs]]');
      expect(notes[1].blocks[0].content).toBe('Read [[New Feature Specs]]');
      expect(notes[1].blocks[0].children[0].content).toBe('Nested link: [[New Feature Specs]]');
    });
  });
});
