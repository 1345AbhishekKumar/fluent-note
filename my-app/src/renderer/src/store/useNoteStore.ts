import { create } from 'zustand';
import type { Note, Folder, Notebook, TransientClip } from '../../../shared/schemas';

interface VaultState {
  notes: Note[];
  folders: Folder[];
  notebooks: Notebook[];
  tags: Array<{ id: string; name: string; color?: string }>;
  clips: TransientClip[];
  selectedNoteId: string | null;
  historyStack: string[];
  historyIndex: number;
  searchQuery: string;
  selectedNotebookId: string | null;
  selectedTagId: string | null;

  // Actions
  setVaultData: (data: { notes?: Note[]; folders?: Folder[]; notebooks?: Notebook[]; tags?: any[]; clips?: TransientClip[] }) => void;
  selectNote: (id: string | null, pushHistory?: boolean) => void;
  goBackHistory: () => void;
  goForwardHistory: () => void;
  addNote: (nbId?: string, parentId?: string | null) => Note;
  updateNote: (id: string, partial: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedNotebook: (nbId: string | null) => void;
  setSelectedTag: (tagId: string | null) => void;
  saveVault: () => void;
}

function syncToDisk(get: () => VaultState) {
  if (typeof window !== 'undefined' && window.electronAPI?.saveVault) {
    const state = get();
    window.electronAPI.saveVault({
      notes: state.notes,
      folders: state.folders,
      notebooks: state.notebooks,
      tags: state.tags,
      clips: state.clips
    }).catch(err => console.error('Failed to sync vault to disk:', err));
  }
}

export const useNoteStore = create<VaultState>((set, get) => ({
  notes: [],
  folders: [],
  notebooks: [],
  tags: [],
  clips: [],
  selectedNoteId: null,
  historyStack: [],
  historyIndex: -1,
  searchQuery: '',
  selectedNotebookId: null,
  selectedTagId: null,

  setVaultData: (data) => {
    set((state) => ({
      notes: data.notes ?? state.notes,
      folders: data.folders ?? state.folders,
      notebooks: data.notebooks ?? state.notebooks,
      tags: data.tags ?? state.tags,
      clips: data.clips ?? state.clips,
      selectedNoteId: state.selectedNoteId || (data.notes && data.notes.length > 0 ? data.notes[0].id : null)
    }));
  },

  selectNote: (id, pushHistory = true) => {
    if (!id) return;
    set((state) => {
      if (state.selectedNoteId === id) return state;
      let newStack = state.historyStack;
      let newIndex = state.historyIndex;
      if (pushHistory) {
        newStack = state.historyStack.slice(0, state.historyIndex + 1);
        newStack.push(id);
        newIndex = newStack.length - 1;
      }
      return { selectedNoteId: id, historyStack: newStack, historyIndex: newIndex };
    });
  },

  goBackHistory: () => {
    const { historyStack, historyIndex, selectNote } = get();
    if (historyIndex > 0) {
      const prevId = historyStack[historyIndex - 1];
      selectNote(prevId, false);
      set({ historyIndex: historyIndex - 1 });
    }
  },

  goForwardHistory: () => {
    const { historyStack, historyIndex, selectNote } = get();
    if (historyIndex < historyStack.length - 1) {
      const nextId = historyStack[historyIndex + 1];
      selectNote(nextId, false);
      set({ historyIndex: historyIndex + 1 });
    }
  },

  addNote: (nbId, parentId = null) => {
    const newNote: Note = {
      id: 'n-' + Math.random().toString(36).slice(2, 8),
      nb: nbId || get().selectedNotebookId || 'design',
      tags: [],
      pinned: false,
      date: 'Just now',
      title: 'Untitled Note',
      body: '<h2>Untitled Note</h2><p>Start typing...</p>',
      blocks: [
        { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'heading1', content: 'Untitled Note', children: [] },
        { id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: 'Start typing...', children: [] }
      ],
      ord: 0,
      archived: false,
      parentId: parentId || null
    };

    set((state) => ({
      notes: [newNote, ...state.notes],
      selectedNoteId: newNote.id
    }));
    syncToDisk(get);
    return newNote;
  },

  updateNote: (id, partial) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...partial } : n))
    }));
    syncToDisk(get);
  },

  deleteNote: (id) => {
    set((state) => {
      const filtered = state.notes.filter((n) => n.id !== id);
      const nextId = filtered.length > 0 ? filtered[0].id : null;
      return { notes: filtered, selectedNoteId: state.selectedNoteId === id ? nextId : state.selectedNoteId };
    });
    syncToDisk(get);
  },

  togglePinNote: (id) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    }));
    syncToDisk(get);
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedNotebook: (nbId) => set({ selectedNotebookId: nbId }),
  setSelectedTag: (tagId) => set({ selectedTagId: tagId }),

  saveVault: () => syncToDisk(get)
}));
