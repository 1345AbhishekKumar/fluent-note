// Note linking, graph traversal & hierarchy utilities extracted from utils/index.ts
import type { Note, Folder } from '../types';
import { sharedNotebooks as NBS } from '../store/notebookStore';
import { getBlocksText } from './blockTree';

export function extractLinks(text: string, allNotes?: Note[]): { wiki: string[], at: string[] } {
  const wiki: string[] = [];
  const at: string[] = [];
  
  const wikiRegex = /\[\[(.*?)\]\]/g;
  let match;
  while ((match = wikiRegex.exec(text)) !== null) {
    if (match[1]) {
      wiki.push(match[1].trim());
    }
  }

  if (allNotes && allNotes.length > 0) {
    const sorted = [...allNotes]
      .filter(n => n.title && n.title.trim().length > 0)
      .sort((a, b) => b.title.trim().length - a.title.trim().length);

    for (const note of sorted) {
      const title = note.title.trim();
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escaped}(?=[\\.,\\?!;:()[\\]\\n\\r"\\s]|$)`, 'gi');
      if (regex.test(text)) {
        if (!at.includes(title)) {
          at.push(title);
        }
      }
    }
  }
  
  // Generic @ mention with stopword boundary matching inlineParsers
  const genericAtRegex = /@([a-zA-Z0-9_\-]+(?:\s+(?!(?:and|or|for|with|is|are|was|were|the|a|an|in|at|on|of|to|from|by|about|as)\b)[a-zA-Z0-9_\-]+)*)/gi;
  while ((match = genericAtRegex.exec(text)) !== null) {
    if (match[1]) {
      const candidate = match[1].trim();
      if (candidate && !at.includes(candidate)) {
        at.push(candidate);
      }
    }
  }
  
  return { wiki, at };
}

export function resolveNoteId(ref: string, allNotes: Note[]): string | null {
  const lowerRef = ref.toLowerCase().trim();
  for (const note of allNotes) {
    if (note.title.toLowerCase().trim() === lowerRef) {
      return note.id;
    }
  }
  for (const note of allNotes) {
    const slugTitle = note.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const slugRef = lowerRef.replace(/[^a-z0-9]/g, '');
    if (slugTitle === slugRef && slugTitle.length > 0) {
      return note.id;
    }
  }
  return null;
}

export function getReferencedNoteIds(note: Note, allNotes: Note[]): Set<string> {
  const referencedIds = new Set<string>();
  const text = getBlocksText(note.blocks || []);
  const { wiki, at } = extractLinks(text, allNotes);
  
  for (const ref of [...wiki, ...at]) {
    const id = resolveNoteId(ref, allNotes);
    if (id) {
      referencedIds.add(id);
    } else {
      for (const n of allNotes) {
        if (n.title && ref.toLowerCase().startsWith(n.title.toLowerCase().trim())) {
          referencedIds.add(n.id);
        }
      }
    }
  }
  
  return referencedIds;
}

export function renameNoteWikilinks(notes: Note[], oldTitle: string, newTitle: string): number {
  if (!oldTitle || !newTitle || oldTitle.trim() === newTitle.trim()) return 0;
  const trimmedOld = oldTitle.trim();
  const trimmedNew = newTitle.trim();
  
  const escapedOld = trimmedOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wikiRegex = new RegExp(`\\[\\[${escapedOld}\\]\\]`, 'gi');
  
  let updateCount = 0;

  function updateBlocks(blocks: any[]): boolean {
    let modified = false;
    for (const b of blocks) {
      if (b.content && wikiRegex.test(b.content)) {
        b.content = b.content.replace(wikiRegex, `[[${trimmedNew}]]`);
        modified = true;
        updateCount++;
      }
      if (b.children && b.children.length > 0) {
        if (updateBlocks(b.children)) modified = true;
      }
    }
    return modified;
  }

  for (const n of notes) {
    if (n.body && wikiRegex.test(n.body)) {
      n.body = n.body.replace(wikiRegex, `[[${trimmedNew}]]`);
      updateCount++;
    }
    if (n.blocks && n.blocks.length > 0) {
      updateBlocks(n.blocks);
    }
  }

  return updateCount;
}

export function calculateSubGraphClosure(
  notes: Note[],
  startNotes: string | string[],
  boundary: { notebook?: string; tag?: string }
): { sharedIds: Set<string>; truncatedIds: Set<string> } {
  const sharedIds = new Set<string>();
  const truncatedIds = new Set<string>();
  
  const allowedNoteIds = new Set<string>();
  for (const n of notes) {
    if (boundary.notebook && n.nb === boundary.notebook) {
      allowedNoteIds.add(n.id);
    } else if (boundary.tag && n.tags.includes(boundary.tag)) {
      allowedNoteIds.add(n.id);
    }
  }
  
  const startIds = typeof startNotes === 'string' ? [startNotes] : startNotes;
  for (const sId of startIds) {
    allowedNoteIds.add(sId);
  }
  
  const visited = new Set<string>();
  const queue = [...startIds];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    sharedIds.add(currentId);
    
    const currentNote = notes.find(n => n.id === currentId);
    if (!currentNote) continue;
    
    const refIds = getReferencedNoteIds(currentNote, notes);
    for (const refId of refIds) {
      if (allowedNoteIds.has(refId)) {
        if (!visited.has(refId)) {
          queue.push(refId);
        }
      } else {
        truncatedIds.add(refId);
      }
    }
  }
  
  return { sharedIds, truncatedIds };
}

export function findNotebookForParent(parentId: string, folders: Folder[], notes: Note[]): string {
  let currentId: string | null = parentId;
  while (currentId) {
    const notebook = NBS.find(nb => nb.id === currentId);
    if (notebook) return notebook.id;
    const folder = folders.find(f => f.id === currentId);
    if (folder) {
      currentId = folder.parentId;
      continue;
    }
    const note = notes.find(n => n.id === currentId);
    if (note) {
      return note.nb;
    }
    break;
  }
  return 'design';
}
