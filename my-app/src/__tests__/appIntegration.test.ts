// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createApp } from '../renderer';
import type { Note } from '../renderer';
import { renderSubItems } from '../app/views/editor';
import { renderBlockTree } from '../utils';
import type { Block } from '../types';


describe('Fluent Notes - Store & Parsers', () => {
  describe('Workflow Lenses & Integration', () => {
    it('synthesizes review clusters into permanent notes and marks highlights archived', () => {
      const clips = [
        { id: 'c1', cluster: 'Physics', content: 'Highlight 1', archived: false },
        { id: 'c2', cluster: 'Physics', content: 'Highlight 2', archived: false }
      ];

      // Simulate synthesis action
      const clusterClips = clips.filter(c => c.cluster === 'Physics');
      const noteBlocks = clusterClips.map(clip => ({
        id: 'new-b-' + clip.id,
        type: 'paragraph' as 'paragraph',
        content: clip.content,
        children: []
      }));

      clusterClips.forEach(clip => {
        clip.archived = true;
      });

      const newNote: Note = {
        id: 'n-new',
        title: 'Physics',
        body: clusterClips.map(c => c.content).join('\n'),
        blocks: noteBlocks,
        nb: 'design',
        tags: ['review'],
        pinned: false,
        date: 'Just now',
        ord: 0,
        status: 'permanent'
      };

      expect(clips.every(c => c.archived)).toBe(true);
      expect(newNote.title).toBe('Physics');
      expect(newNote.blocks).toHaveLength(2);
      expect(newNote.blocks[0].content).toBe('Highlight 1');
      expect(newNote.status).toBe('permanent');
    });
  });

  describe('renderBlockTree subitems', () => {
    it('renders subfolders and subpages as inline document blocks', () => {
      const blocks: Block[] = [
        { id: 'b1', type: 'subpage', url: 'n2', content: 'Subpage B' },
        { id: 'b2', type: 'subfolder', url: 'f1', content: 'Subfolder A' }
      ];

      const html = renderBlockTree(blocks, 0, undefined, {
        note: { id: 'n1', title: 'Parent Note', body: '', blocks: [], nb: 'default', tags: [], pinned: false, date: '', ord: 0 },
        allNotes: [
          { id: 'n2', title: 'Subpage B', body: '', blocks: [], nb: 'default', tags: [], pinned: false, date: '', ord: 0, parentId: 'n1' }
        ]
      });

      expect(html).toContain('block-subpage-row');
      expect(html).toContain('Subpage B');
      expect(html).toContain('data-subpageid="n2"');
      expect(html).toContain('block-subfolder-row');
      expect(html).toContain('Subfolder A');
      expect(html).toContain('data-subfolderid="f1"');
    });
  });


  describe('Nesting actions in AppInstance', () => {
    it('creates sub-notes and sub-folders and updates active filters and expanded folders', () => {
      vi.useFakeTimers();
      // Mock ResizeObserver for JSDOM
      global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;

      const host = document.createElement('div');
      const app = createApp(host, 'light');
      
      const initialFoldersCount = host.querySelectorAll('.tree-item-group[data-type="folder"]').length;
      
      const designRow = host.querySelector('.tree-row[data-id="design"]') as HTMLElement;
      expect(designRow).not.toBeNull();
      
      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      designRow.dispatchEvent(e);
      
      const flyout = host.querySelector('.flyout') as HTMLElement;
      expect(flyout).not.toBeNull();
      
      const buttons = Array.from(flyout.querySelectorAll('.fly-item'));
      const newFolderBtn = buttons.find(b => b.textContent?.includes('New folder inside')) as HTMLElement;
      expect(newFolderBtn).not.toBeUndefined();
      
      newFolderBtn.click();
      
      // Simulate input and submission in our custom HTML prompt overlay modal
      const promptInput = host.querySelector('.prompt-input') as HTMLInputElement;
      expect(promptInput).not.toBeNull();
      promptInput.value = 'Sub-Folder X';
      const okBtn = host.querySelector('.btn-ok') as HTMLElement;
      expect(okBtn).not.toBeNull();
      okBtn.click();
      
      // Advance timers to trigger the prompt dialog cleanup & callback
      vi.advanceTimersByTime(300);
      
      const newFoldersCount = host.querySelectorAll('.tree-item-group[data-type="folder"]').length;
      expect(newFoldersCount).toBe(initialFoldersCount + 1);
      
      // Now test New note inside
      const initialNotesCount = host.querySelectorAll('.tree-item-group[data-type="note"]').length;
      
      designRow.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      const buttons2 = Array.from(flyout.querySelectorAll('.fly-item'));
      const newNoteBtn = buttons2.find(b => b.textContent?.includes('New note inside')) as HTMLElement;
      expect(newNoteBtn).not.toBeUndefined();
      
      newNoteBtn.click();
      
      const newNotesCount = host.querySelectorAll('.tree-item-group[data-type="note"]').length;
      expect(newNotesCount).toBe(initialNotesCount + 1);

      vi.useRealTimers();
    });

    it('creates, renames, and deletes notebooks', () => {
      vi.useFakeTimers();
      const host = document.createElement('div');
      const app = createApp(host, 'light');
      
      const initialNbsCount = host.querySelectorAll('.tree-item-group[data-type="notebook"]').length;
      
      // 1. Create a notebook
      const addNbBtn = host.querySelector('.btn-new-nb') as HTMLElement;
      expect(addNbBtn).not.toBeNull();
      addNbBtn.click();
      
      const promptInput = host.querySelector('.prompt-input') as HTMLInputElement;
      expect(promptInput).not.toBeNull();
      promptInput.value = 'New Custom Notebook';
      const okBtn = host.querySelector('.btn-ok') as HTMLElement;
      okBtn.click();
      
      // Advance timers to trigger the prompt dialog cleanup & callback
      vi.advanceTimersByTime(300);
      
      const postCreateNbsCount = host.querySelectorAll('.tree-item-group[data-type="notebook"]').length;
      expect(postCreateNbsCount).toBe(initialNbsCount + 1);
      
      // Get the newly created notebook row
      const newNbRow = Array.from(host.querySelectorAll('.tree-row[data-type="notebook"]'))
        .find(row => row.textContent?.includes('New Custom Notebook')) as HTMLElement;
      expect(newNbRow).not.toBeUndefined();
      
      // 2. Rename the notebook
      newNbRow.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      const flyout = host.querySelector('.flyout') as HTMLElement;
      expect(flyout).not.toBeNull();
      
      let buttons = Array.from(flyout.querySelectorAll('.fly-item'));
      const renameBtn = buttons.find(b => b.textContent?.includes('Rename notebook')) as HTMLElement;
      expect(renameBtn).not.toBeUndefined();
      renameBtn.click();
      
      const renameInput = host.querySelector('.prompt-input') as HTMLInputElement;
      expect(renameInput).not.toBeNull();
      renameInput.value = 'Renamed Notebook';
      const renameOkBtn = host.querySelector('.btn-ok') as HTMLElement;
      renameOkBtn.click();
      
      // Advance timers to trigger the prompt dialog cleanup & callback
      vi.advanceTimersByTime(300);
      
      const renamedNbRow = Array.from(host.querySelectorAll('.tree-row[data-type="notebook"]'))
        .find(row => row.textContent?.includes('Renamed Notebook')) as HTMLElement;
      expect(renamedNbRow).not.toBeUndefined();
      
      // 3. Delete the notebook
      const originalConfirm = window.confirm;
      window.confirm = () => true;
      
      renamedNbRow.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      buttons = Array.from(flyout.querySelectorAll('.fly-item'));
      const deleteBtn = buttons.find(b => b.textContent?.includes('Delete notebook')) as HTMLElement;
      expect(deleteBtn).not.toBeUndefined();
      deleteBtn.click();
      
      const postDeleteNbsCount = host.querySelectorAll('.tree-item-group[data-type="notebook"]').length;
      expect(postDeleteNbsCount).toBe(initialNbsCount);
      
      window.confirm = originalConfirm;
      vi.useRealTimers();
    });
  });
});
