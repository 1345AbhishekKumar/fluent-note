import type { Note, TransientClip, AppInstance, Folder } from '../types';
import { DEFAULT_NOTES, DEFAULT_CLIPS, LOCAL_STORAGE_KEY, CLIPS_KEY, DEFAULT_FOLDERS, FOLDERS_KEY } from '../constants';
import { htmlToBlocks, blocksToHtml } from '../utils';
import { sharedNotebooks, saveNotebooks } from './notebookStore';

export function loadNotes(): Note[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Note[];
        return parsed.map(n => {
          if (!n.blocks || n.blocks.length === 0) {
            n.blocks = htmlToBlocks(n.body || '');
          }
          return n;
        });
      }
    }
  } catch (e) {
    console.error('Error loading notes:', e);
  }
  return DEFAULT_NOTES.map(n => {
    if (!n.blocks || n.blocks.length === 0) {
      n.blocks = htmlToBlocks(n.body || '');
    }
    return n;
  });
}

export function saveNotes(notes: Note[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      const notesToSave = notes.map(n => {
        if (n.blocks && n.blocks.length > 0) {
          n.body = blocksToHtml(n.blocks);
        }
        return n;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesToSave));
    }
  } catch (e) {
    console.error('Error saving notes:', e);
  }
}

export const sharedNotes: Note[] = loadNotes();

export function loadFolders(): Folder[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(FOLDERS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading folders:', e);
  }
  return DEFAULT_FOLDERS;
}

export function saveFolders(folders: Folder[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    }
  } catch (e) {
    console.error('Error saving folders:', e);
  }
}

export const sharedFolders: Folder[] = loadFolders();

export function loadClips(): TransientClip[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CLIPS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading clips:', e);
  }
  return DEFAULT_CLIPS;
}

export function saveClips(clips: TransientClip[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLIPS_KEY, JSON.stringify(clips));
    }
  } catch (e) {}
}

export const APPS: AppInstance[] = [];

export { sharedNotebooks, saveNotebooks } from './notebookStore';

export function saveAndSync() {
  saveNotes(sharedNotes);
  saveFolders(sharedFolders);
  saveNotebooks(sharedNotebooks);
  APPS.forEach(app => {
    app.syncNotes(sharedNotes);
    app.renderSidebar();
    app.renderList();
    app.renderMeta();
    app.renderEditor();
  });
}

export function saveAndSyncContent() {
  saveNotes(sharedNotes);
  saveFolders(sharedFolders);
  saveNotebooks(sharedNotebooks);
  APPS.forEach(app => {
    app.syncNotes(sharedNotes);
    app.renderList();
  });
}
