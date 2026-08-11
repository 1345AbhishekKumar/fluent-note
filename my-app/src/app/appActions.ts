import type { AppContext } from './context';
import type { Note, Folder } from '../types';
import { sharedNotes, APPS, saveAndSync, flushSaveVault } from '../store';
import { genId, findNotebookForParent } from '../utils';
import { showPrompt } from './components/prompt';
import { filtered } from './views/list';

const REDUCED = (typeof matchMedia !== 'undefined') ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;

export function expandAncestors(ctx: AppContext, id: string | null) {
  const { st } = ctx;
  let currentId: string | null = id;
  while (currentId) {
    const folder = st.folders.find(f => f.id === currentId);
    if (folder) {
      if (folder.parentId) {
        st.expandedFolders.add(folder.parentId);
      }
      currentId = folder.parentId;
      continue;
    }
    const note = st.notes.find(n => n.id === currentId);
    if (note) {
      if (note.parentId) {
        st.expandedFolders.add(note.parentId);
      }
      currentId = note.parentId || null;
      continue;
    }
    break;
  }
}

export function selectNote(ctx: AppContext, id: string | null, focusTitle: boolean = false, skipHistory: boolean = false) {
  flushSaveVault();
  const { st, elements, root, renderList, renderSidebar, renderEditor } = ctx;
  st.sel = id;
  if (st.selectedBlockIds) {
    st.selectedBlockIds.clear();
  }
  if ((st as any)._swapTimer) {
    clearTimeout((st as any)._swapTimer);
    (st as any)._swapTimer = null;
  }

  if (id) {
    expandAncestors(ctx, id);
    if (!skipHistory) {
      if (!st.historyStack) st.historyStack = [];
      if (st.historyIndex !== undefined && st.historyIndex >= 0 && st.historyIndex < st.historyStack.length - 1) {
        st.historyStack = st.historyStack.slice(0, st.historyIndex + 1);
      }
      if (st.historyStack.length === 0 || st.historyStack[st.historyStack.length - 1] !== id) {
        st.historyStack.push(id);
        st.historyIndex = st.historyStack.length - 1;
      }
    }
  }
  renderList();
  renderSidebar();

  if (REDUCED) {
    renderEditor();
    if (focusTitle) elements.edTitle.focus();
  } else {
    elements.edInner.classList.add('swap');
    (st as any)._swapTimer = setTimeout(() => {
      (st as any)._swapTimer = null;
      renderEditor();
      elements.edInner.classList.remove('swap');
      if (focusTitle) elements.edTitle.focus();
    }, 80);
  }

  if (root.classList.contains('s') && id) {
    root.classList.add('show-editor');
  }
}

export function navigateNote(ctx: AppContext, direction: 'prev' | 'next') {
  const { st } = ctx;
  const arr = filtered(ctx);
  if (!arr.length) return;
  const currentId = st.sel;
  if (!currentId) {
    selectNote(ctx, arr[0].id);
    return;
  }
  const idx = arr.findIndex(n => n.id === currentId);
  if (direction === 'prev') {
    if (idx > 0) selectNote(ctx, arr[idx - 1].id);
  } else {
    if (idx !== -1 && idx < arr.length - 1) selectNote(ctx, arr[idx + 1].id);
  }
}

export function deleteNote(ctx: AppContext, n: Note) {
  const { toast } = ctx;
  const idx = sharedNotes.indexOf(n);
  if (idx !== -1) {
    sharedNotes.splice(idx, 1);
    APPS.forEach(app => {
      if (app.getSelectedNoteId() === n.id) app.selectFirstNote();
    });
    saveAndSync();
    toast('Note deleted', 'Undo', () => {
      sharedNotes.splice(idx, 0, n);
      APPS.forEach(app => {
        if (app.getSelectedNoteId() === null) app.selectNote(n.id);
      });
      saveAndSync();
    });
  }
}

export function newNote(ctx: AppContext) {
  const { st } = ctx;
  let parentNb = 'design';
  if (st.folder) {
    parentNb = findNotebookForParent(st.folder, st.folders, st.notes);
  } else if (st.nb !== 'all') {
    parentNb = st.nb;
  }
  const n: Note = {
    id: 'n' + Math.random().toString(36).slice(2, 7),
    title: '',
    body: '',
    blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
    nb: parentNb,
    tags: st.tag ? [st.tag] : [],
    pinned: false,
    date: 'Just now',
    ord: --st.ordMin,
    parentId: st.folder || null
  };
  sharedNotes.unshift(n);
  st.quick = 'all';
  saveAndSync();
  selectNote(ctx, n.id, true);
}

export function newSubNote(ctx: AppContext, parentId: string) {
  const { st } = ctx;
  const parentNb = findNotebookForParent(parentId, st.folders, st.notes);
  const n: Note = {
    id: 'n' + Math.random().toString(36).slice(2, 7),
    title: '',
    body: '',
    blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
    nb: parentNb,
    tags: [],
    pinned: false,
    date: 'Just now',
    ord: --st.ordMin,
    parentId: parentId
  };
  sharedNotes.unshift(n);
  st.expandedFolders.add(parentId);
  expandAncestors(ctx, parentId);

  // Set active filter to parent container so it shows in the list view
  const isParentFolder = st.folders.some(f => f.id === parentId);
  const isParentNote = st.notes.some(x => x.id === parentId);
  if (isParentFolder || isParentNote) {
    st.folder = parentId;
    st.nb = 'all';
  } else {
    st.nb = parentId;
    st.folder = null;
  }
  st.quick = 'all';
  st.tag = null;

  saveAndSync();
  selectNote(ctx, n.id, true);
}

export function newSubFolder(ctx: AppContext, parentId: string) {
  const { st } = ctx;
  showPrompt(ctx, 'Folder name:', 'Folder Name', 'New Folder', name => {
    if (!name) return;
    const f: Folder = {
      id: 'f' + Math.random().toString(36).slice(2, 7),
      name: name,
      parentId: parentId,
      color: '#23b8b8'
    };
    st.folders.push(f);
    st.expandedFolders.add(parentId);
    expandAncestors(ctx, parentId);

    // Set active filter to parent container so the user sees the context
    const isParentFolder = st.folders.some(x => x.id === parentId);
    const isParentNote = st.notes.some(x => x.id === parentId);
    if (isParentFolder || isParentNote) {
      st.folder = parentId;
      st.nb = 'all';
    } else {
      st.nb = parentId;
      st.folder = null;
    }
    st.quick = 'all';
    st.tag = null;

    saveAndSync();
  });
}
