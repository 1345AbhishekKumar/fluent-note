import { describe, it, expect } from 'vitest';
import { renderTreeItem } from '../app/views/sidebar/sidebarTree';
import type { AppContext } from '../app/context';

describe('Sidebar Tree Rendering', () => {
  const mockCtx = {
    st: {
      notes: [
        {
          id: 'n1',
          title: 'Design deep-dive with "quoted" subtitle',
          body: '',
          blocks: [],
          nb: 'design',
          tags: [],
          pinned: false,
          date: '',
          ord: 0,
          parentId: 'f1'
        },
        {
          id: 'n2',
          title: 'Nested subpage',
          body: '',
          blocks: [],
          nb: 'design',
          tags: [],
          pinned: false,
          date: '',
          ord: 1,
          parentId: 'n1'
        }
      ],
      folders: [
        {
          id: 'f1',
          name: 'Assets & Spec Docs',
          parentId: 'design',
          color: '#8470ff'
        }
      ],
      expandedFolders: new Set<string>(['design', 'f1', 'n1']),
      quick: 'all',
      nb: 'design',
      folder: null,
      tag: null,
      sel: 'n1'
    }
  } as unknown as AppContext;

  it('renders notebook and child items with proper hierarchy, titles, and classes', () => {
    const html = renderTreeItem(mockCtx, 'design', 'notebook', 0);

    expect(html).toContain('data-id="design"');
    expect(html).toContain('data-type="notebook"');
    expect(html).toContain('title="Design Team"');
    expect(html).toContain('class="sb-txt"');
    expect(html).toContain('tree-children');
    expect(html).toContain('data-id="f1"');
    expect(html).toContain('title="Assets & Spec Docs"');
    expect(html).toContain('data-id="n1"');
    expect(html).toContain('title="Design deep-dive with &quot;quoted&quot; subtitle"');
    expect(html).toContain('data-id="n2"');
    expect(html).toContain('title="Nested subpage"');
  });

  it('correctly sets level-based indentation styles', () => {
    const rootHtml = renderTreeItem(mockCtx, 'design', 'notebook', 0);
    expect(rootHtml).toContain('style="padding-left: 10px;"');

    const folderHtml = renderTreeItem(mockCtx, 'f1', 'folder', 1);
    expect(folderHtml).toContain('style="padding-left: 22px;"');

    const noteHtml = renderTreeItem(mockCtx, 'n1', 'note', 2);
    expect(noteHtml).toContain('style="padding-left: 34px;"');
  });

  it('marks selected note with .sel class', () => {
    const selectedNoteHtml = renderTreeItem(mockCtx, 'n1', 'note', 2);
    expect(selectedNoteHtml).toContain('sel');
  });
});
