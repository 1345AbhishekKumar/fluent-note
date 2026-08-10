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

export function isParentEligibleBlock(type: Block['type']): boolean {
  // Standard headings and dividers cannot natively hold children
  const ineligibleTypes: Block['type'][] = ['heading1', 'heading2', 'heading3', 'divider'];
  return !ineligibleTypes.includes(type);
}

export function isInsideToggleBlock(rootBlocks: Block[], targetId: string): boolean {
  function findAncestors(blocks: Block[], id: string, path: Block[]): Block[] | null {
    for (const b of blocks) {
      if (b.id === id) return path;
      if (b.children && b.children.length > 0) {
        const found = findAncestors(b.children, id, [...path, b]);
        if (found) return found;
      }
    }
    return null;
  }
  const ancestors = findAncestors(rootBlocks, targetId, []);
  if (!ancestors) return false;
  const toggleTypes: Block['type'][] = ['toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3'];
  return ancestors.some(b => toggleTypes.includes(b.type));
}

