// Note linking, graph traversal & hierarchy utilities extracted from utils/index.ts
import type { Note, Folder } from '../types';
import { sharedNotebooks as NBS } from '../store/notebookStore';
import { getBlocksText } from './blockTree';

export function extractLinks(text: string): { wiki: string[], at: string[] } {
  const wiki: string[] = [];
  const at: string[] = [];
  
  const wikiRegex = /\[\[(.*?)\]\]/g;
  let match;
  while ((match = wikiRegex.exec(text)) !== null) {
    if (match[1]) {
      wiki.push(match[1].trim());
    }
  }
  
  const atRegex = /@([a-zA-Z0-9\s-_]+?)(?=\s+(?:and|or|for|with|is|are|was|were|the|a|an|in|at|on|of|to|from|by|about|as)\s+|[\.,\?\!\;:()]|$)/gi;
  while ((match = atRegex.exec(text)) !== null) {
    if (match[1]) {
      at.push(match[1].trim());
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
  const { wiki, at } = extractLinks(text);
  
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
