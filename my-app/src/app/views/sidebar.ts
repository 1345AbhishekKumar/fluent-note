import type { AppContext } from '../context';
import { TAGS, IC } from '../../constants';
import { sharedNotebooks as NBS, saveAndSync } from '../../store';
import { openImportDialog } from '../components/p2p';
import { openSettings } from './settings';

import { renderTreeItem, initSidebarDragAndDrop } from './sidebar/sidebarTree';
import { initSidebarContextMenus } from './sidebar/sidebarContextMenus';
import { openVaultSwitcher, reloadFromVault } from './sidebar/sidebarVault';

export { openVaultSwitcher, reloadFromVault };

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
    return `<button class="tagchip flex items-center gap-[6px] px-2.5 py-1 rounded-full text-[11.5px] font-medium text-text2 bg-nav-h border border-transparent transition-[background,color,border-color] duration-quick ease-smooth-out hover:bg-card-h hover:text-text1 [&.on]:bg-[color-mix(in_srgb,var(--tc)_16%,transparent)] [&.on]:border-[color-mix(in_srgb,var(--tc)_45%,transparent)] [&.on]:text-text1 ${ctx.st.tag === t.id ? 'on' : ''}" data-tag="${t.id}" style="--tc:${t.color}"><span class="dot w-2 h-2 rounded-full flex-none" style="background:${t.color}"></span>${t.name}<span class="cnt ml-auto text-[10.5px] text-text3 font-medium">${c}</span></button>`;
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
      openSettings(ctx);
      return;
    }
    if (target.closest('.sb-vault')) {
      openVaultSwitcher(ctx);
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

  if (ctx.elements.searchIn) {
    ctx.elements.searchIn.addEventListener('input', () => {
      ctx.st.q = ctx.elements.searchIn.value.trim().toLowerCase();
      ctx.renderList();
    });
  }

  initSidebarContextMenus(ctx);
  initSidebarDragAndDrop(ctx);
}
