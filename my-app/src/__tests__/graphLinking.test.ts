import { describe, it, expect } from 'vitest';
import { 
  extractLinks, 
  renderLinksInContent,
  getReferencedNoteIds,
  calculateSubGraphClosure
} from '../renderer';
import type { Note } from '../renderer';

describe('Fluent Notes - Store & Parsers', () => {
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
  });
});
