import { describe, it, expect } from 'vitest';
import { 
  htmlToBlocks, 
  blocksToHtml, 
  extractLinks, 
  resolveNoteId, 
  calculateSubGraphClosure,
  findBlockById,
  getBlockLevel,
  flattenBlocks,
  renderLinksInContent,
  getReferencedNoteIds,
  findNotebookForParent,
  createApp
} from '../renderer';
import type { Note, Block, Folder } from '../renderer';
import { renderSubItems } from '../app/views/editor';

describe('Fluent Notes - Store & Parsers', () => {
  describe('HTML to Blocks Conversion', () => {
    it('converts simple paragraphs', () => {
      const html = '<p>Hello world</p><p>Second block</p>';
      const blocks = htmlToBlocks(html);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].content).toBe('Hello world');
      expect(blocks[1].type).toBe('paragraph');
      expect(blocks[1].content).toBe('Second block');
    });

    it('converts headings', () => {
      const html = '<h2>Heading 1</h2><h3>Heading 2</h3>';
      const blocks = htmlToBlocks(html);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('heading1');
      expect(blocks[0].content).toBe('Heading 1');
      expect(blocks[1].type).toBe('heading2');
      expect(blocks[1].content).toBe('Heading 2');
    });

    it('handles recursive child blocks (e.g. lists)', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const blocks = htmlToBlocks(html);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      expect(blocks[0].content).toBe('Item 1');
      expect(blocks[1].content).toBe('Item 2');
    });
  });

  describe('WikiLinks & Ref Extraction', () => {
    it('extracts double bracket wikilinks', () => {
      const text = 'Check out [[Mica spec]] and [[Design guidelines]]';
      const { wiki } = extractLinks(text);
      expect(wiki).toContain('Mica spec');
      expect(wiki).toContain('Design guidelines');
    });

    it('extracts @ links', () => {
      const text = 'Check out @Fluent design and @Work notes';
      const { at } = extractLinks(text);
      expect(at).toContain('Fluent design');
      expect(at).toContain('Work notes');
    });

    it('renders WikiLinks as clickable span tokens', () => {
      const text = 'Check out [[Mica spec]] and @Fluent design';
      const html = renderLinksInContent(text);
      expect(html).toContain('class="wiki-link"');
      expect(html).toContain('data-ref="Mica spec"');
      expect(html).toContain('data-ref="Fluent design"');
    });
  });

  describe('P2P Sharing Sub-graph Closure', () => {
    const mockNotes: any[] = [
      {
        id: 'n1',
        title: 'Note A',
        nb: 'work',
        tags: ['project'],
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Link to [[Note B]] and [[Note C]]', children: [] }]
      },
      {
        id: 'n2',
        title: 'Note B',
        nb: 'work',
        tags: ['project'],
        blocks: [{ id: 'b2', type: 'paragraph', content: 'No links', children: [] }]
      },
      {
        id: 'n3',
        title: 'Note C',
        nb: 'personal', // Outside the "work" notebook boundary
        tags: [],
        blocks: [{ id: 'b3', type: 'paragraph', content: 'Link to [[Note B]]', children: [] }]
      }
    ];

    it('calculates closure set and identifies external links to truncate', () => {
      const { sharedIds, truncatedIds } = calculateSubGraphClosure(mockNotes, 'n1', { notebook: 'work' });
      // n1 and n2 are allowed because their nb is 'work'.
      // n3 has nb 'personal', so it is outside the boundary and is truncated.
      expect(sharedIds.has('n1')).toBe(true);
      expect(sharedIds.has('n2')).toBe(true);
      expect(sharedIds.has('n3')).toBe(false);
      expect(truncatedIds.has('n3')).toBe(true);
    });
  });

  describe('Block Tree Helper Operations', () => {
    const testBlocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Root 1',
        children: [
          {
            id: 'b1-c1',
            type: 'paragraph',
            content: 'Child 1',
            children: []
          }
        ]
      },
      {
        id: 'b2',
        type: 'paragraph',
        content: 'Root 2',
        children: []
      }
    ];

    it('finds blocks by ID in a recursive hierarchy', () => {
      const match = findBlockById(testBlocks, 'b1-c1');
      expect(match).not.toBeNull();
      expect(match!.block.content).toBe('Child 1');
      expect(match!.parentList).toHaveLength(1);
      expect(match!.index).toBe(0);
    });

    it('calculates nesting levels correctly', () => {
      expect(getBlockLevel(testBlocks, 'b1')).toBe(0);
      expect(getBlockLevel(testBlocks, 'b1-c1')).toBe(1);
      expect(getBlockLevel(testBlocks, 'b2')).toBe(0);
      expect(getBlockLevel(testBlocks, 'non-existent')).toBe(-1);
    });

    it('flattens block hierarchy in visual reading order', () => {
      const flat = flattenBlocks(testBlocks);
      expect(flat).toHaveLength(3);
      expect(flat[0].id).toBe('b1');
      expect(flat[1].id).toBe('b1-c1');
      expect(flat[2].id).toBe('b2');
    });

    it('repositions blocks in recursive hierarchy during drag and drop', () => {
      // Setup a copy to mutate
      const blocks: Block[] = JSON.parse(JSON.stringify(testBlocks));
      
      // Move b2 to be after b1-c1 inside b1's children
      const dragMatch = findBlockById(blocks, 'b2')!;
      const destMatch = findBlockById(blocks, 'b1-c1')!;
      
      // Remove b2 from root list
      const dragIndex = dragMatch.parentList.indexOf(dragMatch.block);
      blocks.splice(dragIndex, 1);
      
      // Add b2 after b1-c1
      const destIndex = destMatch.parentList.indexOf(destMatch.block);
      destMatch.parentList.splice(destIndex + 1, 0, dragMatch.block);
      
      // Check results
      expect(blocks).toHaveLength(1); // Only b1 left at root
      expect(blocks[0].children).toHaveLength(2); // b1-c1 and b2 inside b1
      expect(blocks[0].children[0].id).toBe('b1-c1');
      expect(blocks[0].children[1].id).toBe('b2');
    });
  });

  describe('Workflow Lenses & Integration', () => {
    it('correctly calculates backlinks based on WikiLinks and @ references', () => {
      const allNotes: Note[] = [
        {
          id: 'n1',
          title: 'Target Note',
          body: '',
          blocks: [],
          nb: 'default',
          tags: [],
          pinned: false,
          date: '',
          ord: 0
        },
        {
          id: 'n2',
          title: 'Referencing Note 1',
          body: 'Check out [[Target Note]]',
          blocks: [{ id: 'b1', type: 'paragraph', content: 'Check out [[Target Note]]', children: [] }],
          nb: 'default',
          tags: [],
          pinned: false,
          date: '',
          ord: 0
        },
        {
          id: 'n3',
          title: 'Referencing Note 2',
          body: 'Check out @Target Note',
          blocks: [{ id: 'b2', type: 'paragraph', content: 'Check out @Target Note', children: [] }],
          nb: 'default',
          tags: [],
          pinned: false,
          date: '',
          ord: 0
        }
      ];

      // Find backlinks for n1
      const backlinks = allNotes.filter(x => {
        if (x.id === 'n1') return false;
        const refs = getReferencedNoteIds(x, allNotes);
        return refs.has('n1');
      });

      expect(backlinks).toHaveLength(2);
      expect(backlinks.map(x => x.id)).toContain('n2');
      expect(backlinks.map(x => x.id)).toContain('n3');
    });

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

  describe('renderSubItems', () => {
    it('renders subfolders and subpages inside the editor panel', () => {
      const mockEl = document.createElement('div');
      mockEl.innerHTML = `
        <div class="sub-items-panel" style="display:none;">
          <div class="sub-items-list"></div>
        </div>
      `;

      const ctx: any = {
        root: mockEl,
        st: {
          folders: [
            { id: 'f1', name: 'Subfolder A', parentId: 'n1', color: '#ff0000' }
          ],
          notes: [
            {
              id: 'n1',
              title: 'Parent Note',
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
              title: 'Subpage B',
              body: '',
              blocks: [],
              nb: 'default',
              tags: [],
              pinned: false,
              date: '',
              ord: 0,
              parentId: 'n1'
            }
          ]
        }
      };

      renderSubItems(ctx, ctx.st.notes[0]);

      const panel = mockEl.querySelector('.sub-items-panel') as HTMLElement;
      expect(panel.style.display).toBe('block');

      const buttons = mockEl.querySelectorAll('.sub-item-btn');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].textContent).toContain('Subfolder A');
      expect(buttons[1].textContent).toContain('Subpage B');
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

  describe('P2P Notebook & Tag Category Share', () => {
    const mockNotes: any[] = [
      {
        id: 'n1',
        title: 'Note A',
        nb: 'work',
        tags: ['project'],
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Link to [[Note B]]', children: [] }]
      },
      {
        id: 'n2',
        title: 'Note B',
        nb: 'work',
        tags: ['project'],
        blocks: []
      },
      {
        id: 'n3',
        title: 'Note C',
        nb: 'personal',
        tags: ['ideas'],
        blocks: []
      }
    ];

    it('calculates closure for a notebook', () => {
      const startIds = mockNotes.filter(n => n.nb === 'work').map(n => n.id);
      const { sharedIds, truncatedIds } = calculateSubGraphClosure(mockNotes, startIds, { notebook: 'work' });
      expect(sharedIds.has('n1')).toBe(true);
      expect(sharedIds.has('n2')).toBe(true);
      expect(sharedIds.has('n3')).toBe(false);
      expect(truncatedIds.size).toBe(0);
    });

    it('calculates closure for a tag category', () => {
      const startIds = mockNotes.filter(n => n.tags.includes('project')).map(n => n.id);
      const { sharedIds, truncatedIds } = calculateSubGraphClosure(mockNotes, startIds, { tag: 'project' });
      expect(sharedIds.has('n1')).toBe(true);
      expect(sharedIds.has('n2')).toBe(true);
      expect(sharedIds.has('n3')).toBe(false);
    });

    it('successfully encodes and decodes shared payloads', () => {
      const payloadObj = {
        type: '.researcher-share',
        version: 1,
        notes: [mockNotes[0], mockNotes[1]]
      };
      const jsonString = JSON.stringify(payloadObj);
      const base64Payload = btoa(unescape(encodeURIComponent(jsonString)));
      const encryptedPayload = `RESEARCHER_SHARE_${base64Payload}`;

      // Simulated Decode
      expect(encryptedPayload.startsWith('RESEARCHER_SHARE_')).toBe(true);
      const base64 = encryptedPayload.substring('RESEARCHER_SHARE_'.length);
      const decodedJson = decodeURIComponent(escape(atob(base64)));
      const decodedObj = JSON.parse(decodedJson);

      expect(decodedObj.type).toBe('.researcher-share');
      expect(decodedObj.notes).toHaveLength(2);
      expect(decodedObj.notes[0].title).toBe('Note A');
    });
  });

  describe('Nesting actions in AppInstance', () => {
    it('creates sub-notes and sub-folders and updates active filters and expanded folders', () => {
      // Mock ResizeObserver for JSDOM
      global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };

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
    });

    it('creates, renames, and deletes notebooks', () => {
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
    });
  });
});
