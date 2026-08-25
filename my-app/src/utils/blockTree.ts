// Block tree traversal & search utilities extracted from utils/index.ts
import type { Block } from '../types';

const MAX_BLOCK_DEPTH = 50;

export function findBlockById(
  blocks: Block[] = [],
  id: string,
  parentList: Block[] = [],
  depth: number = 0
): { block: Block; parentList: Block[]; index: number } | null {
  if (!blocks || depth > MAX_BLOCK_DEPTH) return null;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === id) {
      return { block: blocks[i], parentList: blocks, index: i };
    }
    if (blocks[i].children && blocks[i].children.length > 0) {
      const childMatch = findBlockById(blocks[i].children, id, blocks[i].children, depth + 1);
      if (childMatch) return childMatch;
    }
  }
  return null;
}

export function getBlockLevel(rootBlocks: Block[], id: string, currentLevel: number = 0): number {
  if (!rootBlocks || currentLevel > MAX_BLOCK_DEPTH) return -1;
  for (const block of rootBlocks) {
    if (block.id === id) return currentLevel;
    if (block.children && block.children.length > 0) {
      const childLevel = getBlockLevel(block.children, id, currentLevel + 1);
      if (childLevel !== -1) return childLevel;
    }
  }
  return -1;
}

export function flattenBlocks(blocks: Block[], maxDepth: number = MAX_BLOCK_DEPTH): Block[] {
  const result: Block[] = [];
  if (!blocks || blocks.length === 0) return result;
  const stack: { list: Block[]; index: number; depth: number }[] = [{ list: blocks, index: 0, depth: 0 }];

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top.index >= top.list.length) {
      stack.pop();
      continue;
    }
    const current = top.list[top.index++];
    result.push(current);
    if (current.children && current.children.length > 0 && top.depth < maxDepth) {
      stack.push({ list: current.children, index: 0, depth: top.depth + 1 });
    }
  }
  return result;
}

export function flattenVisibleBlocks(blocks: Block[], maxDepth: number = MAX_BLOCK_DEPTH): Block[] {
  const result: Block[] = [];
  if (!blocks || blocks.length === 0) return result;
  const stack: { list: Block[]; index: number; depth: number }[] = [{ list: blocks, index: 0, depth: 0 }];

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top.index >= top.list.length) {
      stack.pop();
      continue;
    }
    const current = top.list[top.index++];
    result.push(current);
    if (current.children && current.children.length > 0 && !current.collapsed && top.depth < maxDepth) {
      stack.push({ list: current.children, index: 0, depth: top.depth + 1 });
    }
  }
  return result;
}

export function getBlocksText(blocks: Block[], maxDepth: number = MAX_BLOCK_DEPTH): string {
  const flat = flattenBlocks(blocks, maxDepth);
  return flat.map(b => b.content || '').join(' ').trim();
}

export function isParentEligibleBlock(type: Block['type']): boolean {
  // Standard headings and dividers cannot natively hold children
  const ineligibleTypes: Block['type'][] = ['heading1', 'heading2', 'heading3', 'divider'];
  return !ineligibleTypes.includes(type);
}

export function isInsideToggleBlock(rootBlocks: Block[], targetId: string): boolean {
  function findAncestors(blocks: Block[], id: string, path: Block[], depth: number): Block[] | null {
    if (depth > MAX_BLOCK_DEPTH) return null;
    for (const b of blocks) {
      if (b.id === id) return path;
      if (b.children && b.children.length > 0) {
        const found = findAncestors(b.children, id, [...path, b], depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  const ancestors = findAncestors(rootBlocks, targetId, [], 0);
  if (!ancestors) return false;
  const toggleTypes: Block['type'][] = ['toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3'];
  return ancestors.some(b => toggleTypes.includes(b.type));
}

