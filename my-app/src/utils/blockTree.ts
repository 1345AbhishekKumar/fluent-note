// Block tree traversal & search utilities extracted from utils/index.ts
import type { Block } from '../types';

export function findBlockById(blocks: Block[], id: string, parentList: Block[] = []): { block: Block, parentList: Block[], index: number } | null {
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === id) {
      return { block: blocks[i], parentList: blocks, index: i };
    }
    const childMatch = findBlockById(blocks[i].children, id, blocks[i].children);
    if (childMatch) return childMatch;
  }
  return null;
}

export function getBlockLevel(rootBlocks: Block[], id: string, currentLevel: number = 0): number {
  for (const block of rootBlocks) {
    if (block.id === id) return currentLevel;
    const childLevel = getBlockLevel(block.children, id, currentLevel + 1);
    if (childLevel !== -1) return childLevel;
  }
  return -1;
}

export function flattenBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];
  function traverse(list: Block[]) {
    for (const b of list) {
      result.push(b);
      if (b.children && b.children.length > 0) {
        traverse(b.children);
      }
    }
  }
  traverse(blocks);
  return result;
}

export function flattenVisibleBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];
  function traverse(list: Block[]) {
    for (const b of list) {
      result.push(b);
      if (b.children && b.children.length > 0 && !b.collapsed) {
        traverse(b.children);
      }
    }
  }
  traverse(blocks);
  return result;
}

export function getBlocksText(blocks: Block[]): string {
  let text = '';
  for (const block of blocks) {
    text += ' ' + block.content;
    if (block.children && block.children.length > 0) {
      text += ' ' + getBlocksText(block.children);
    }
  }
  return text;
}
