import { describe, it, expect } from 'vitest';
import { findNotebookForParent } from '../renderer';
import type { Note, Folder } from '../renderer';

describe('Fluent Notes - Store & Parsers', () => {
  describe('Nested Folder Structure', () => {
    it('correctly associates child folders and notes with parent IDs', () => {
      const mockFolders: Folder[] = [
        { id: 'f1', name: 'Root Folder', parentId: null },
        { id: 'f2', name: 'Sub-folder 1', parentId: 'f1' },
        { id: 'f3', name: 'Sub-folder 2', parentId: 'n1' }
      ];

      const mockNotes: Note[] = [
        {
          id: 'n1',
          title: 'Root Note',
          body: '',
          blocks: [],
          nb: 'default',
          tags: [],
          pinned: false,
          date: '',
          ord: 0,
          parentId: null
        },
        {
          id: 'n2',
          title: 'Note in Sub-folder 1',
          body: '',
          blocks: [],
          nb: 'default',
          tags: [],
          pinned: false,
          date: '',
          ord: 0,
          parentId: 'f2'
        },
        {
          id: 'n3',
          title: 'Note in Sub-folder 2',
          body: '',
          blocks: [],
          nb: 'default',
          tags: [],
          pinned: false,
          date: '',
          ord: 0,
          parentId: 'f3'
        }
      ];

      const f1Children = mockFolders.filter(f => f.parentId === 'f1');
      expect(f1Children).toHaveLength(1);
      expect(f1Children[0].id).toBe('f2');

      const f2Notes = mockNotes.filter(n => n.parentId === 'f2');
      expect(f2Notes).toHaveLength(1);
      expect(f2Notes[0].id).toBe('n2');

      const n1Folders = mockFolders.filter(f => f.parentId === 'n1');
      expect(n1Folders).toHaveLength(1);
      expect(n1Folders[0].id).toBe('f3');

      const f3Notes = mockNotes.filter(n => n.parentId === 'f3');
      expect(f3Notes).toHaveLength(1);
      expect(f3Notes[0].id).toBe('n3');
    });
  });

  describe('findNotebookForParent', () => {
    it('correctly resolves notebook ID by traversing parents', () => {
      const folders: Folder[] = [
        { id: 'f1', name: 'Folder 1', parentId: 'design', color: '#000' },
        { id: 'f2', name: 'Folder 2', parentId: 'f1', color: '#000' }
      ];
      const notes: Note[] = [
        {
          id: 'n1',
          title: 'Note 1',
          body: '',
          blocks: [],
          nb: 'work',
          tags: [],
          pinned: false,
          date: '',
          ord: 0,
          parentId: 'f2'
        }
      ];

      expect(findNotebookForParent('f1', folders, notes)).toBe('design');
      expect(findNotebookForParent('f2', folders, notes)).toBe('design');
      expect(findNotebookForParent('n1', folders, notes)).toBe('work');
    });
  });
});
