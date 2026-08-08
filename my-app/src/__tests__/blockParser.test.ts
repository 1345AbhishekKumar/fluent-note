import { describe, it, expect } from 'vitest';
import { 
  htmlToBlocks, 
  findBlockById,
  getBlockLevel,
  flattenBlocks
} from '../renderer';
import type { Block } from '../renderer';

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
});
