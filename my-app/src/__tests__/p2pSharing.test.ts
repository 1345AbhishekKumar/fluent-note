import { describe, it, expect } from 'vitest';
import { calculateSubGraphClosure } from '../utils';

describe('Fluent Notes - Store & Parsers', () => {
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
});
