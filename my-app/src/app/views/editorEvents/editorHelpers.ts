import type { Block } from '../../../types';
import { genId } from '../../../utils';

export function duplicateBlockWithNewIds(block: Block): Block {
  return {
    ...block,
    id: genId(),
    children: (block.children || []).map(child => duplicateBlockWithNewIds(child))
  };
}

export function duplicateBlocksWithNewIds(blocks: Block[]): Block[] {
  return blocks.map(b => duplicateBlockWithNewIds(b));
}
