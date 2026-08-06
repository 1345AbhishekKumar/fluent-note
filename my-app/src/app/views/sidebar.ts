import type { AppContext } from '../context';
import { TAGS, IC } from '../../constants';
import { sharedNotebooks as NBS } from '../../store';
import { saveAndSync } from '../../store';
import { noteItems } from '../components/flyout';
import { findNotebookForParent } from '../../utils';
import { openImportDialog } from '../components/p2p';

function renderTreeItem(
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

export function renderSidebar(ctx: AppContext) {
  ctx.elements.sidebar.querySelectorAll('.nav-item[data-q]').forEach(b => {
    const htmlBtn = b as HTMLElement;
    const on = (htmlBtn.dataset.q === 'pinned') 
      ? (ctx.st.quick === 'pinned') 
      : (ctx.st.quick === 'all' && ctx.st.nb === 'all' && !ctx.st.folder && !ctx.st.tag);
    htmlBtn.classList.toggle('sel', on);
  });

  ctx.elements.sidebar.querySelectorAll('.views-nav .nav-item[data-view]').forEach(b => {
    const htmlBtn = b as HTMLElement;
    htmlBtn.classList.toggle('sel', htmlBtn.dataset.view === ctx.st.view);
  });

  ctx.elements.nbsEl.innerHTML = NBS.map(nb => renderTreeItem(ctx, nb.id, 'notebook')).join('');

  ctx.elements.tagsEl.innerHTML = TAGS.map(t => {
    const c = ctx.st.notes.filter(n => n.tags.includes(t.id)).length;
    return `<button class="tagchip ${ctx.st.tag === t.id ? 'on' : ''}" data-tag="${t.id}" style="--tc:${t.color}"><span class="dot" style="background:${t.color}"></span>${t.name}<span class="cnt">${c}</span></button>`;
  }).join('');
}

export function initSidebarEvents(ctx: AppContext) {
  ctx.elements.sidebar.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const qb = target.closest('[data-q]') as HTMLElement;
    const tg = target.closest('[data-tag]') as HTMLElement;
    const vb = target.closest('[data-view]') as HTMLElement;
    const treeChevron = target.closest('.tree-chevron') as HTMLElement;
    const treeAddBtn = target.closest('.tree-add-btn') as HTMLElement;
    const treeRow = target.closest('.tree-row') as HTMLElement;
    
    if (target.closest('.sb-import')) {
      openImportDialog(ctx);
      return;
    }
    if (target.closest('.sb-set')) {
      ctx.toast('Settings is a demo surface');
      return;
    }
    if (target.closest('.sb-new')) {
      ctx.newNote();
      ctx.closeOverlayIf();
      return;
    }

    const newNbBtn = target.closest('.btn-new-nb') as HTMLElement;
    if (newNbBtn) {
      e.stopPropagation();
      e.preventDefault();
      ctx.showPrompt('Notebook name:', 'Notebook Name', 'New Notebook', name => {
        if (!name) return;
        const color = ['#8470ff', '#ff9d42', '#23b8b8', '#ff6a8f'][NBS.length % 4];
        const newNb = {
          id: 'nb-' + Math.random().toString(36).slice(2, 7),
          name: name,
          color: color
        };
        NBS.push(newNb);
        saveAndSync();
      });
      return;
    }

    if (treeAddBtn) {
      e.stopPropagation();
      e.preventDefault();
      const row = treeAddBtn.closest('.tree-row') as HTMLElement;
      const itemId = row.dataset.id!;
      const itemType = row.dataset.type!;
      
      let items: any[] = [];
      if (itemType === 'notebook') {
        items = [
          { head: 'Notebook Actions' },
          { label: 'New note inside', icon: IC.plus, action: () => ctx.newSubNote(itemId) },
          { label: 'New folder inside', icon: IC.plus, action: () => ctx.newSubFolder(itemId) }
        ];
      } else if (itemType === 'folder') {
        items = [
          { head: 'Folder Actions' },
          { label: 'New note inside', icon: IC.plus, action: () => ctx.newSubNote(itemId) },
          { label: 'New folder inside', icon: IC.plus, action: () => ctx.newSubFolder(itemId) }
        ];
      } else if (itemType === 'note') {
        items = [
          { head: 'Page Actions' },
          { label: 'New subpage', icon: IC.plus, action: () => ctx.newSubNote(itemId) },
          { label: 'New subfolder', icon: IC.plus, action: () => ctx.newSubFolder(itemId) }
        ];
      }
      ctx.openFly(treeAddBtn, items);
      return;
    }
    
    if (treeChevron) {
      e.stopPropagation();
      e.preventDefault();
      const row = treeChevron.closest('.tree-row') as HTMLElement;
      const itemId = row.dataset.id!;
      if (ctx.st.expandedFolders.has(itemId)) {
        ctx.st.expandedFolders.delete(itemId);
      } else {
        ctx.st.expandedFolders.add(itemId);
      }
      ctx.renderSidebar();
      return;
    }
    
    if (treeRow) {
      const itemId = treeRow.dataset.id!;
      const itemType = treeRow.dataset.type!;
      
      if (itemType === 'note') {
        ctx.selectNote(itemId);
      } else if (itemType === 'folder') {
        ctx.st.folder = itemId;
        ctx.st.nb = 'all';
        ctx.st.quick = 'all';
        ctx.st.tag = null;
        // Toggle expansion as well for folders
        if (ctx.st.expandedFolders.has(itemId)) {
          ctx.st.expandedFolders.delete(itemId);
        } else {
          ctx.st.expandedFolders.add(itemId);
        }
      } else if (itemType === 'notebook') {
        ctx.st.nb = itemId;
        ctx.st.folder = null;
        ctx.st.quick = 'all';
        ctx.st.tag = null;
        // Toggle expansion as well for notebooks
        if (ctx.st.expandedFolders.has(itemId)) {
          ctx.st.expandedFolders.delete(itemId);
        } else {
          ctx.st.expandedFolders.add(itemId);
        }
      }
      
      ctx.renderSidebar();
      ctx.renderList();
      ctx.closeOverlayIf();
      return;
    }
    
    if (qb) {
      ctx.st.quick = qb.dataset.q!;
      ctx.st.nb = 'all';
      ctx.st.folder = null;
      ctx.st.tag = null;
    } else if (tg) {
      ctx.st.tag = ctx.st.tag === tg.dataset.tag ? null : tg.dataset.tag!;
      ctx.st.quick = 'all';
    } else if (vb) {
      ctx.st.view = vb.dataset.view! as any;
    } else {
      return;
    }
    
    ctx.renderSidebar();
    ctx.renderList();
    ctx.closeOverlayIf();
  });

  ctx.elements.sidebar.addEventListener('contextmenu', e => {
    const target = e.target as HTMLElement;
    const tagChip = target.closest('.tagchip') as HTMLElement;
    if (tagChip) {
      e.preventDefault();
      const tagId = tagChip.dataset.tag!;
      const tagObj = TAGS.find(x => x.id === tagId);
      ctx.openFlyAt(e.clientX, e.clientY, [
        { head: 'Tag Actions' },
        { label: 'Share Sub-graph', icon: IC.share, action: () => ctx.startP2PShare({ type: 'tag', id: tagId, name: '#' + (tagObj?.name || tagId) }) }
      ]);
      return;
    }

    const row = target.closest('.tree-row') as HTMLElement;
    if (!row) return;
    
    e.preventDefault();
    const itemId = row.dataset.id!;
    const itemType = row.dataset.type!;
    
    if (itemType === 'notebook') {
      const nbObj = NBS.find(x => x.id === itemId);
      ctx.openFlyAt(e.clientX, e.clientY, [
        { head: 'Notebook Actions' },
        { label: 'New note inside', icon: IC.plus, action: () => ctx.newSubNote(itemId) },
        { label: 'New folder inside', icon: IC.plus, action: () => ctx.newSubFolder(itemId) },
        { sep: true },
        {
          label: 'Rename notebook',
          icon: IC.pen,
          action: () => {
            ctx.showPrompt('Rename notebook:', 'Notebook name', nbObj ? nbObj.name : '', newName => {
              if (newName && nbObj) {
                nbObj.name = newName;
                saveAndSync();
              }
            });
          }
        },
        { sep: true },
        {
          label: 'Delete notebook',
          icon: IC.trash,
          danger: true,
          action: () => {
            if (confirm(`Are you sure you want to delete this notebook and all its notes and folders?`)) {
              // Delete notes inside this notebook
              ctx.st.notes = ctx.st.notes.filter(n => n.nb !== itemId);
              // Delete folders inside this notebook
              deleteFoldersForNotebook(ctx, itemId);
              // Remove notebook from store
              const idx = NBS.findIndex(x => x.id === itemId);
              if (idx !== -1) {
                NBS.splice(idx, 1);
              }
              // If deleted notebook is selected, reset filters
              if (ctx.st.nb === itemId) {
                ctx.st.nb = 'all';
              }
              saveAndSync();
            }
          }
        },
        { sep: true },
        { label: 'Share Sub-graph', icon: IC.share, action: () => ctx.startP2PShare({ type: 'notebook', id: itemId, name: nbObj?.name || itemId }) }
      ]);
    } else if (itemType === 'folder') {
      const folder = ctx.st.folders.find(f => f.id === itemId);
      ctx.openFlyAt(e.clientX, e.clientY, [
        { head: 'Folder Actions' },
        { label: 'New note inside', icon: IC.plus, action: () => ctx.newSubNote(itemId) },
        { label: 'New folder inside', icon: IC.plus, action: () => ctx.newSubFolder(itemId) },
        { sep: true },
        {
          label: 'Rename folder',
          icon: IC.pen,
          action: () => {
            ctx.showPrompt('Rename folder:', 'Folder name', folder ? folder.name : '', newName => {
              if (newName && folder) {
                folder.name = newName;
                saveAndSync();
              }
            });
          }
        },
        { sep: true },
        {
          label: 'Delete folder',
          icon: IC.trash,
          danger: true,
          action: () => {
            if (confirm(`Are you sure you want to delete this folder and all its contents recursively?`)) {
              deleteFolderRecursive(ctx, itemId);
              saveAndSync();
            }
          }
        }
      ]);
    } else if (itemType === 'note') {
      const note = ctx.st.notes.find(n => n.id === itemId);
      if (note) {
        ctx.openFlyAt(e.clientX, e.clientY, noteItems(ctx, note));
      }
    }
  });

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

function isDescendantOf(ctx: AppContext, childId: string, parentId: string): boolean {
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

function updateNotebookIdRecursive(ctx: AppContext, folderId: string, notebookId: string) {
  const childFolders = ctx.st.folders.filter(f => f.parentId === folderId);
  const childNotes = ctx.st.notes.filter(n => n.parentId === folderId);

  childNotes.forEach(n => {
    n.nb = notebookId;
  });
  childFolders.forEach(f => {
    updateNotebookIdRecursive(ctx, f.id, notebookId);
  });
}

function deleteFolderRecursive(ctx: AppContext, folderId: string) {
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

function deleteFoldersForNotebook(ctx: AppContext, notebookId: string) {
  const toDelete = ctx.st.folders.filter(f => f.parentId === notebookId);
  toDelete.forEach(f => deleteFolderRecursive(ctx, f.id));
}
