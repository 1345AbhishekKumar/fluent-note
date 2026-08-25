import type { Note, TransientClip, AppInstance, Folder } from '../types';
import { DEFAULT_NOTES, DEFAULT_CLIPS, LOCAL_STORAGE_KEY, CLIPS_KEY, DEFAULT_FOLDERS, FOLDERS_KEY } from '../constants';
import { htmlToBlocks, blocksToHtml } from '../utils';
import { sharedNotebooks, saveNotebooks } from './notebookStore';

let cachedVault: any = null;
export function getCachedVault() {
  if (cachedVault) return cachedVault;
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      if (window.electronAPI.loadVaultSync) {
        cachedVault = window.electronAPI.loadVaultSync();
        return cachedVault;
      }
    } catch (e) {
      console.error('Error loading vault synchronously:', e);
    }
  }
  return null;
}

export async function loadVaultAsync(): Promise<any> {
  if (cachedVault) return cachedVault;
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      if (window.electronAPI.loadVault) {
        cachedVault = await window.electronAPI.loadVault();
        return cachedVault;
      } else if (window.electronAPI.loadVaultSync) {
        cachedVault = window.electronAPI.loadVaultSync();
        return cachedVault;
      }
    } catch (e) {
      console.error('Error loading vault asynchronously:', e);
    }
  }
  return null;
}

export function clearVaultCache() {
  cachedVault = null;
}

export function loadNotes(): Note[] {
  try {
    const vault = getCachedVault();
    if (vault && vault.notes) {
      return vault.notes.map((n: any) => {
        if (!n.blocks || n.blocks.length === 0) {
          n.blocks = htmlToBlocks(n.body || '');
        }
        return n;
      });
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

export function saveNotes(_notes: Note[]) {
  // Disk vault files are the single source of truth; stale localStorage caching removed
}

export const sharedNotes: Note[] = loadNotes();

export function loadFolders(): Folder[] {
  try {
    const vault = getCachedVault();
    if (vault && vault.folders) return vault.folders;
  } catch (e) {
    console.error('Error loading folders:', e);
  }
  return DEFAULT_FOLDERS;
}

export function saveFolders(_folders: Folder[]) {
  // Disk vault files are single source of truth
}

export const sharedFolders: Folder[] = loadFolders();

export function loadClips(): TransientClip[] {
  try {
    const vault = getCachedVault();
    if (vault && vault.clips) return vault.clips;
  } catch (e) {
    console.error('Error loading clips:', e);
  }
  return DEFAULT_CLIPS;
}

export function saveClips(_clips: TransientClip[]) {
  saveVaultToDisk();
}

export const APPS: AppInstance[] = [];

export { sharedNotebooks, saveNotebooks } from './notebookStore';

let saveVaultTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveVaultToDisk() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    const data = {
      notes: sharedNotes,
      folders: sharedFolders,
      notebooks: sharedNotebooks,
      clips: loadClips()
    };
    window.electronAPI.saveVault(data).then(res => {
      if (res && !res.success) {
        console.error('Error saving vault:', res.error);
      }
    });
  }
}

export function saveVaultToDiskDebounced() {
  if (saveVaultTimeout) clearTimeout(saveVaultTimeout);
  saveVaultTimeout = setTimeout(() => {
    saveVaultToDisk();
    saveVaultTimeout = null;
  }, 1500);
}

export function flushSaveVault() {
  if (saveVaultTimeout) {
    clearTimeout(saveVaultTimeout);
    saveVaultTimeout = null;
    saveVaultToDisk();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushSaveVault);
}

export function saveAndSync() {
  saveNotes(sharedNotes);
  saveFolders(sharedFolders);
  saveNotebooks(sharedNotebooks);
  flushSaveVault();
  saveVaultToDisk();
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
  saveVaultToDiskDebounced();
  APPS.forEach(app => {
    app.syncNotes(sharedNotes);
    app.renderList();
  });
}
