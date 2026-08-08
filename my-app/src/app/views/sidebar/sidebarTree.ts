import type { AppContext } from '../../context';
import { IC } from '../../../constants';
import { sharedNotebooks as NBS, saveAndSync } from '../../../store';
import { findNotebookForParent } from '../../../utils';

export function renderTreeItem(
  ctx: AppContext,
  itemId: string,
  itemType: 'notebook' | 'folder' | 'note',
  level: number = 0
): string {
  let childrenHtml = '';
  let isExpanded = false;
  let label = '';
  let color = '';
  let iconHtml = '';
  let isSelected = false;
  const indentStyle = `style="padding-left: ${level * 12 + 10}px;"`;

  if (itemType === 'notebook') {
    const nb = NBS.find(n => n.id === itemId);
    if (!nb) return '';
    label = nb.name;
    color = nb.color;
    iconHtml = IC.book;
    isExpanded = ctx.st.expandedFolders.has(itemId);
    isSelected = ctx.st.nb === itemId && !ctx.st.folder && ctx.st.quick === 'all' && !ctx.st.tag && !ctx.st.sel;
    
    const childFolders = ctx.st.folders.filter(f => f.parentId === itemId);
    const childNotes = ctx.st.notes.filter(n => n.nb === itemId && (!n.parentId || n.parentId === itemId));

    if (isExpanded) {
      childrenHtml = [
        ...childFolders.map(f => renderTreeItem(ctx, f.id, 'folder', level + 1)),
        ...childNotes.map(n => renderTreeItem(ctx, n.id, 'note', level + 1))
      ].join('');
    }
  } else if (itemType === 'folder') {
    const folder = ctx.st.folders.find(f => f.id === itemId);
    if (!folder) return '';
    label = folder.name;
    color = folder.color || '#cccccc';
    iconHtml = IC.folder;
    isExpanded = ctx.st.expandedFolders.has(itemId);
    isSelected = ctx.st.folder === itemId && ctx.st.quick === 'all' && !ctx.st.tag && !ctx.st.sel;

    const childFolders = ctx.st.folders.filter(f => f.parentId === itemId);
    const childNotes = ctx.st.notes.filter(n => n.parentId === itemId);

    if (isExpanded) {
      childrenHtml = [
        ...childFolders.map(f => renderTreeItem(ctx, f.id, 'folder', level + 1)),
        ...childNotes.map(n => renderTreeItem(ctx, n.id, 'note', level + 1))
      ].join('');
    }
  } else if (itemType === 'note') {
    const note = ctx.st.notes.find(n => n.id === itemId);
    if (!note) return '';
    label = note.title || 'Untitled note';
    color = '#23b8b8';
    iconHtml = IC.note;
    isExpanded = ctx.st.expandedFolders.has(itemId);
    isSelected = ctx.st.sel === itemId;

    const childFolders = ctx.st.folders.filter(f => f.parentId === itemId);
    const childNotes = ctx.st.notes.filter(n => n.parentId === itemId);

    if (isExpanded && (childFolders.length > 0 || childNotes.length > 0)) {
      childrenHtml = [
        ...childFolders.map(f => renderTreeItem(ctx, f.id, 'folder', level + 1)),
        ...childNotes.map(n => renderTreeItem(ctx, n.id, 'note', level + 1))
      ].join('');
    }
  }

  const hasChildren = itemType === 'notebook' || itemType === 'folder' || (itemType === 'note' && (ctx.st.folders.some(f => f.parentId === itemId) || ctx.st.notes.some(n => n.parentId === itemId)));

  const chevronHtml = hasChildren ? `
    <span class="tree-chevron ${isExpanded ? 'open' : ''}" style="color: ${color}">
      ${IC.chevD}
    </span>
  ` : '<span class="tree-chevron-spacer"></span>';

  return `
    <div class="tree-item-group" data-id="${itemId}" data-type="${itemType}">
      <button class="nav-item rv tree-row ${isSelected ? 'sel' : ''}" ${indentStyle} data-id="${itemId}" data-type="${itemType}" draggable="${itemType !== 'notebook'}">
        <span class="ni-bar"></span>
        ${chevronHtml}
        <span class="ic" style="color: ${color}">${iconHtml}</span>
        <span class="sb-txt">${label}</span>
        <span class="tree-add-btn ic" title="Add sub-item" style="margin-left:auto; display:none; align-items:center; justify-content:center; width:20px; height:20px; border-radius:4px; opacity:0.6; transition:opacity var(--duration-quick) var(--ease-smooth-out);">${IC.plus}</span>
      </button>
      ${childrenHtml ? `<div class="tree-children">${childrenHtml}</div>` : ''}
    </div>
  `;
}

export function isDescendantOf(ctx: AppContext, childId: string, parentId: string): boolean {
  let currentId: string | null = childId;
  while (currentId) {
    const parentFolder = ctx.st.folders.find(f => f.id === currentId);
    if (parentFolder) {
      if (parentFolder.parentId === parentId) return true;
      currentId = parentFolder.parentId;
      continue;
    }
    const parentNote = ctx.st.notes.find(n => n.id === currentId);
    if (parentNote) {
      if (parentNote.parentId === parentId) return true;
      currentId = parentNote.parentId || null;
      continue;
    }
    break;
  }
  return false;
}

export function updateNotebookIdRecursive(ctx: AppContext, folderId: string, notebookId: string) {
  const childFolders = ctx.st.folders.filter(f => f.parentId === folderId);
  const childNotes = ctx.st.notes.filter(n => n.parentId === folderId);

  childNotes.forEach(n => {
    n.nb = notebookId;
  });
  childFolders.forEach(f => {
    updateNotebookIdRecursive(ctx, f.id, notebookId);
  });
}

export function deleteFolderRecursive(ctx: AppContext, folderId: string) {
  const childFolders = ctx.st.folders.filter(f => f.parentId === folderId);
  const childNotes = ctx.st.notes.filter(n => n.parentId === folderId);

  childFolders.forEach(f => deleteFolderRecursive(ctx, f.id));
  childNotes.forEach(n => {
    const idx = ctx.st.notes.findIndex(x => x.id === n.id);
    if (idx !== -1) {
      ctx.st.notes.splice(idx, 1);
      if (ctx.st.sel === n.id) {
        ctx.api.selectFirstNote();
      }
    }
  });

  const folderIdx = ctx.st.folders.findIndex(f => f.id === folderId);
  if (folderIdx !== -1) ctx.st.folders.splice(folderIdx, 1);

  if (ctx.st.folder === folderId) {
    ctx.st.folder = null;
  }
}

export function deleteFoldersForNotebook(ctx: AppContext, notebookId: string) {
  const toDelete = ctx.st.folders.filter(f => f.parentId === notebookId);
  toDelete.forEach(f => deleteFolderRecursive(ctx, f.id));
}

export function initSidebarDragAndDrop(ctx: AppContext) {
  let draggedItemId: string | null = null;
  let draggedItemType: string | null = null;

  ctx.elements.sidebar.addEventListener('dragstart', e => {
    const target = e.target as HTMLElement;
    const row = target.closest('.tree-row') as HTMLElement;
    if (!row || row.dataset.type === 'notebook') {
      e.preventDefault();
      return;
    }
    draggedItemId = row.dataset.id!;
    draggedItemType = row.dataset.type!;
    row.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', draggedItemId);
      e.dataTransfer.effectAllowed = 'move';
    }
  });

  ctx.elements.sidebar.addEventListener('dragover', e => {
    const target = e.target as HTMLElement;
    const row = target.closest('.tree-row') as HTMLElement;
    if (!row || !draggedItemId) return;
    
    const destId = row.dataset.id!;
    const destType = row.dataset.type!;
    
    if (destId === draggedItemId) return;
    if (isDescendantOf(ctx, destId, draggedItemId)) return;
    
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    row.classList.add('drag-over');
  });

  ctx.elements.sidebar.addEventListener('dragleave', e => {
    const target = e.target as HTMLElement;
    const row = target.closest('.tree-row') as HTMLElement;
    if (row) {
      row.classList.remove('drag-over');
    }
  });

  ctx.elements.sidebar.addEventListener('dragend', () => {
    ctx.elements.sidebar.querySelectorAll('.tree-row').forEach(el => {
      el.classList.remove('drag-over', 'dragging');
    });
    draggedItemId = null;
    draggedItemType = null;
  });

  ctx.elements.sidebar.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const row = target.closest('.tree-row') as HTMLElement;
    if (!row || !draggedItemId || !draggedItemType) return;
    
    const destId = row.dataset.id!;
    const destType = row.dataset.type!;
    
    row.classList.remove('drag-over');
    
    if (destId === draggedItemId) return;
    if (isDescendantOf(ctx, destId, draggedItemId)) return;
    
    let destParentId: string | null = null;
    let newNotebookId = 'design';
    
    if (destType === 'notebook') {
      destParentId = null;
      newNotebookId = destId;
    } else {
      destParentId = destId;
      newNotebookId = findNotebookForParent(destId, ctx.st.folders, ctx.st.notes);
    }
    
    if (draggedItemType === 'note') {
      const note = ctx.st.notes.find(n => n.id === draggedItemId);
      if (note) {
        note.parentId = destParentId;
        note.nb = newNotebookId;
      }
    } else if (draggedItemType === 'folder') {
      const folder = ctx.st.folders.find(f => f.id === draggedItemId);
      if (folder) {
        folder.parentId = destParentId;
        updateNotebookIdRecursive(ctx, folder.id, newNotebookId);
      }
    }
    
    ctx.st.expandedFolders.add(destId);
    saveAndSync();
  });
}
