import type { AppContext } from '../../context';
import { TAGS, IC } from '../../../constants';
import { sharedNotebooks as NBS, saveAndSync } from '../../../store';
import { noteItems } from '../../components/flyout';
import { deleteFolderRecursive, deleteFoldersForNotebook } from './sidebarTree';

export function initSidebarContextMenus(ctx: AppContext) {
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
}
