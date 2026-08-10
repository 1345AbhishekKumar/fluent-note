import { describe, it, expect } from 'vitest';
import { isParentEligibleBlock, isInsideToggleBlock, findBlockById } from '../utils/blockTree';
import type { Block } from '../types';

describe('Block Nesting & Parent Eligibility', () => {
  it('correctly identifies eligible parent blocks', () => {
    expect(isParentEligibleBlock('paragraph')).toBe(true);
    expect(isParentEligibleBlock('bullet')).toBe(true);
    expect(isParentEligibleBlock('todo')).toBe(true);
    expect(isParentEligibleBlock('toggle')).toBe(true);
    expect(isParentEligibleBlock('toggle_h1')).toBe(true);
    expect(isParentEligibleBlock('quote')).toBe(true);
    expect(isParentEligibleBlock('callout')).toBe(true);

    // Ineligible block types
    expect(isParentEligibleBlock('heading1')).toBe(false);
    expect(isParentEligibleBlock('heading2')).toBe(false);
    expect(isParentEligibleBlock('heading3')).toBe(false);
    expect(isParentEligibleBlock('divider')).toBe(false);
  });

  it('correctly detects blocks inside toggle containers', () => {
    const blocks: Block[] = [
      {
        id: 'p1',
        type: 'paragraph',
        content: 'Root paragraph',
        children: []
      },
      {
        id: 't1',
        type: 'toggle',
        content: 'Toggle parent',
        children: [
          {
            id: 'child1',
            type: 'paragraph',
            content: 'Inside toggle',
            children: []
          }
        ]
      }
    ];

    expect(isInsideToggleBlock(blocks, 'p1')).toBe(false);
    expect(isInsideToggleBlock(blocks, 'child1')).toBe(true);
  });

  it('finds nested block by ID correctly', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Parent',
        children: [
          {
            id: 'b2',
            type: 'bullet',
            content: 'Child',
            children: []
          }
        ]
      }
    ];

    const match = findBlockById(blocks, 'b2');
    expect(match).not.toBeNull();
    expect(match?.block.id).toBe('b2');
    expect(match?.parentList).toBe(blocks[0].children);
  });
});
