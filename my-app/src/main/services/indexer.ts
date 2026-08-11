import type { Note, Block } from '../../shared/schemas';

export interface NoteSummary {
  id: string;
  title: string;
  nb: string;
  date: string;
  body: string;
}

export interface BacklinkResult {
  noteId: string;
  noteTitle: string;
}

class InMemoryVaultIndex {
  private notesIndex = new Map<string, Note>();
  private wikilinksIndex = new Map<string, Set<string>>(); // targetTitleLower -> Set of sourceNoteIds
  private tagsIndex = new Map<string, Set<string>>(); // tagNameLower -> Set of noteIds

  private extractWikilinks(blocks: Block[], targetSet: Set<string>) {
    if (!blocks || !Array.isArray(blocks)) return;
    for (const block of blocks) {
      if (block.content) {
        const matches = block.content.matchAll(/\[\[(.*?)\]\]/g);
        for (const match of matches) {
          if (match[1] && match[1].trim()) {
            targetSet.add(match[1].trim().toLowerCase());
          }
        }
      }
      if (block.children && Array.isArray(block.children)) {
        this.extractWikilinks(block.children, targetSet);
      }
    }
  }

  public indexVaultNotes(notes: Note[]) {
    this.notesIndex.clear();
    this.wikilinksIndex.clear();
    this.tagsIndex.clear();

    for (const note of notes) {
      this.notesIndex.set(note.id, note);

      // Extract wikilinks from blocks, fallback to body if empty
      const links = new Set<string>();
      if (note.blocks && Array.isArray(note.blocks) && note.blocks.length > 0) {
        this.extractWikilinks(note.blocks, links);
      } else {
        const bodyText = note.body || '';
        const matches = bodyText.matchAll(/\[\[(.*?)\]\]/g);
        for (const match of matches) {
          if (match[1] && match[1].trim()) {
            links.add(match[1].trim().toLowerCase());
          }
        }
      }

      for (const targetLower of links) {
        if (!this.wikilinksIndex.has(targetLower)) {
          this.wikilinksIndex.set(targetLower, new Set());
        }
        this.wikilinksIndex.get(targetLower)!.add(note.id);
      }

      // Index tags
      if (note.tags && Array.isArray(note.tags)) {
        for (const tag of note.tags) {
          const tagLower = tag.trim().toLowerCase();
          if (!this.tagsIndex.has(tagLower)) {
            this.tagsIndex.set(tagLower, new Set());
          }
          this.tagsIndex.get(tagLower)!.add(note.id);
        }
      }
    }
  }

  public searchVaultNotes(query: string): NoteSummary[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: NoteSummary[] = [];
    for (const note of this.notesIndex.values()) {
      const titleMatch = (note.title || '').toLowerCase().includes(q);
      const bodyMatch = (note.body || '').toLowerCase().includes(q);
      if (titleMatch || bodyMatch) {
        results.push({
          id: note.id,
          title: note.title,
          nb: note.nb,
          date: note.date,
          body: note.body || ''
        });
        if (results.length >= 50) break;
      }
    }
    return results;
  }

  public getBacklinksForNote(title: string): BacklinkResult[] {
    const tLower = title.trim().toLowerCase();
    const sourceIds = this.wikilinksIndex.get(tLower);
    if (!sourceIds) return [];

    const results: BacklinkResult[] = [];
    for (const sourceId of sourceIds) {
      const note = this.notesIndex.get(sourceId);
      if (note) {
        results.push({
          noteId: note.id,
          noteTitle: note.title
        });
      }
    }
    return results;
  }
}

const vaultIndex = new InMemoryVaultIndex();

export function indexVaultNotes(notes: Note[]) {
  vaultIndex.indexVaultNotes(notes);
}

export function searchVaultNotes(query: string): NoteSummary[] {
  return vaultIndex.searchVaultNotes(query);
}

export function getBacklinksForNote(title: string): BacklinkResult[] {
  return vaultIndex.getBacklinksForNote(title);
}
