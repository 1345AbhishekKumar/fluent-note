import type { AppInstance, Note, Block, Folder } from '../types';
import { IC, TAGS, winControlsHtml } from '../constants';
import { sharedNotebooks as NBS } from '../store';
import { resolveNoteId, genId, findNotebookForParent } from '../utils';
import { sharedNotes, APPS, saveAndSync, saveAndSyncContent, loadClips, sharedFolders } from '../store';
import type { AppContext } from './context';
import { initFlyout } from './components/flyout';
import { startP2PShare } from './components/p2p';
import { renderSidebar, initSidebarEvents, openVaultSwitcher, reloadFromVault } from './views/sidebar';
import { renderList, initListEvents, filtered } from './views/list';
import { renderEditor, initEditorEvents } from './views/editor';
import { renderReviewInbox } from './views/review';
import { showPrompt } from './components/prompt';
import { renderAppLayout } from './appLayout';
import { selectNote, navigateNote, deleteNote, newNote, newSubNote, newSubFolder } from './appActions';
import { initVaultSwitcher } from './appVaultSwitcher';
import { initResponsive } from './appResponsive';
import { initResize } from './appResize';

const REDUCED = (typeof matchMedia !== 'undefined') ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;

export function createApp(host: HTMLElement, theme: 'light' | 'dark'): AppInstance {
  const root = document.createElement('div');
  root.className = 'win relative flex-1 flex flex-col overflow-hidden bg-mica backdrop-blur-3xl backdrop-saturate-[1.25]';
  root.dataset.theme = theme;
  root.innerHTML = renderAppLayout(theme, IC, TAGS, winControlsHtml);
  host.appendChild(root);

  const q = <T extends HTMLElement>(s: string): T => root.querySelector(s) as T;
  const qAll = <T extends HTMLElement>(s: string): T[] => Array.from(root.querySelectorAll(s)) as T[];

  const st = {
    notes: sharedNotes,
    folders: sharedFolders,
    expandedFolders: new Set<string>(['design']),
    ordMin: 0,
    sel: null as string | null,
    nb: 'all',
    folder: null as string | null,
    tag: null as string | null,
    quick: 'all',
    q: '',
    sort: 'date',
    snippets: true,
    sbUser: false,
    overlay: false,
    view: 'list' as 'list' | 'grid' | 'graph',
    gridSort: 'title' as 'title' | 'notebook' | 'tags' | 'date',
    gridSortAsc: true,
    lens: 'notes' as 'notes' | 'academic' | 'review',
    clips: loadClips(),
    historyStack: [] as string[],
    historyIndex: -1,
    selectedBlockIds: new Set<string>(),
    lastUsedColor: '',
    lastUsedBgColor: '',
    zoomFactor: 1.0
  };

  const elements = {
    searchIn: q<HTMLInputElement>('.search'),
    burger: q<HTMLButtonElement>('.burger'),
    themeBtn: q<HTMLButtonElement>('.theme-btn'),
    splitBtn: q<HTMLButtonElement>('.split-btn'),
    sidebar: q<HTMLElement>('.sidebar'),
    sbScroll: q<HTMLElement>('.sb-scroll'),
    nbsEl: q<HTMLElement>('.nbs'),
    tagsEl: q<HTMLElement>('.sb-tags'),
    lpTitle: q<HTMLElement>('.lp-title'),
    lpSub: q<HTMLElement>('.lp-sub'),
    lpScroll: q<HTMLElement>('.lp-scroll'),
    actFilter: q<HTMLButtonElement>('.act-filter'),
    actSort: q<HTMLButtonElement>('.act-sort'),
    newNoteBtns: [q<HTMLButtonElement>('.new-note'), q<HTMLButtonElement>('.sb-new')],
    edBack: q<HTMLButtonElement>('.ed-back'),
    tools: q<HTMLElement>('.ed-tools'),
    styleBtn: q<HTMLButtonElement>('.style-btn'),
    styleLbl: q<HTMLElement>('.style-lbl'),
    pinBtn: q<HTMLButtonElement>('.pin-btn'),
    edMore: q<HTMLButtonElement>('.ed-more'),
    edScroll: q<HTMLElement>('.ed-scroll'),
    edInner: q<HTMLElement>('.ed-inner'),
    edTitle: q<HTMLElement>('.ed-title'),
    edBody: q<HTMLElement>('.ed-body'),
    edEmpty: q<HTMLElement>('.ed-empty'),
    metaNb: q<HTMLButtonElement>('.meta-nb'),
    metaDate: q<HTMLElement>('.md-txt'),
    metaTags: q<HTMLButtonElement>('.meta-tags'),
    mtTxt: q<HTMLElement>('.mt-txt'),
    wcEl: q<HTMLElement>('.wc'),
    saveEl: q<HTMLElement>('.save'),
    saveT: q<HTMLElement>('.save-t'),
    fly: q<HTMLElement>('.flyout'),
    toastEl: q<HTMLElement>('.toast'),
    tMsg: q<HTMLElement>('.t-msg'),
    tAct: q<HTMLButtonElement>('.t-act'),
    scrim: q<HTMLElement>('.scrim')
  };

  let toastTimer: any = null;
  let toastFn: (() => void) | null = null;
  function toast(msg: string, actLabel?: string, fn?: () => void) {
    elements.tMsg.textContent = msg;
    elements.tAct.textContent = actLabel || '';
    toastFn = fn || null;
    elements.toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toastEl.classList.remove('show'), 3600);
  }
  elements.tAct.addEventListener('click', () => {
    if (toastFn) toastFn();
    elements.toastEl.classList.remove('show');
  });

  let saveTimer: any = null;
  function markSaving() {
    elements.saveEl.className = 'save busy';
    elements.saveT.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      elements.saveEl.className = 'save ok';
      elements.saveT.textContent = 'Saved';
    }, 700);
  }

  let activeFlyoutMenu: HTMLElement | null = null;
  function showFlyout(menu: HTMLElement) {
    hideFlyout();
    activeFlyoutMenu = menu;
    root.appendChild(menu);
    setTimeout(() => {
      window.addEventListener('click', hideFlyoutClickOutside);
    }, 0);
  }
  function hideFlyout() {
    if (activeFlyoutMenu) {
      activeFlyoutMenu.remove();
      activeFlyoutMenu = null;
      window.removeEventListener('click', hideFlyoutClickOutside);
    }
  }
  function hideFlyoutClickOutside(e: MouseEvent) {
    if (activeFlyoutMenu && !activeFlyoutMenu.contains(e.target as Node)) {
      hideFlyout();
    }
  }

  const api: AppInstance = {
    root,
    theme,
    host,
    setTheme(t) {
      api.theme = t;
      root.dataset.theme = t;
      elements.themeBtn.innerHTML = t === 'dark' ? IC.sun : IC.moon;
      if (api.onTheme) api.onTheme(t);
    },
    sync: () => syncToolbar(),
    renderSidebar: () => renderSidebar(ctx),
    renderList: () => renderList(ctx),
    renderEditor: () => renderEditor(ctx),
    syncNotes(newNotes) {
      st.notes = newNotes;
    },
    selectNote(id, focusTitle, skipHistory) {
      selectNote(ctx, id, focusTitle, skipHistory);
    },
    renderMeta: () => renderMeta(),
    getSelectedNoteId() {
      return st.sel;
    },
    selectFirstNote() {
      const arr = filtered(ctx);
      selectNote(ctx, arr.length ? arr[0].id : null);
    },
    showReceivedToast(closureCount, title) {
      toast(`Received ${closureCount} shared notes (incl. "${title}") from peer!`);
      const nId = resolveNoteId(title, st.notes);
      if (nId) {
        selectNote(ctx, nId);
      }
    },
    st,
    navigateNote(direction) {
      navigateNote(ctx, direction);
    },
    closeVaultSwitcher() {
      const overlay = root.querySelector('#vaultOverlay') as HTMLElement;
      if (overlay) {
        overlay.style.display = 'none';
        const closeBtn = overlay.querySelector('#vaultClose') as HTMLElement;
        if (closeBtn) closeBtn.style.display = '';
        const createForm = overlay.querySelector('#vaultCreateForm') as HTMLElement;
        if (createForm) createForm.style.display = 'none';
        const nameInput = overlay.querySelector('#vaultNameInput') as HTMLInputElement;
        if (nameInput) nameInput.value = '';
      }
    }
  };

  const ctx: AppContext = {
    // New composition properties
    state: st,
    meta: {
      root,
      api,
      elements
    },
    actions: {
      toast,
      markSaving,
      selectNote: (id, focusTitle, skipHistory) => selectNote(ctx, id, focusTitle, skipHistory),
      renderSidebar: () => renderSidebar(ctx),
      renderList: () => renderList(ctx),
      renderEditor: () => renderEditor(ctx),
      renderMeta: () => renderMeta(),
      renderReviewInbox: () => renderReviewInbox(ctx),
      switchLens,
      startP2PShare: (target) => startP2PShare(ctx, target),
      newNote: () => newNote(ctx),
      newSubNote: (parentId) => newSubNote(ctx, parentId),
      newSubFolder: (parentId) => newSubFolder(ctx, parentId),
      deleteNote: (n) => deleteNote(ctx, n),
      closeOverlayIf,
      syncToolbar,
      showPrompt: (title, placeholder, defaultValue, cb) => showPrompt(ctx, title, placeholder, defaultValue, cb),
      showFlyout,
      hideFlyout,
      openFly: (anchor, items) => ctx.openFly(anchor, items),
      openFlyAt: (cx, cy, items) => ctx.openFlyAt(cx, cy, items)
    },

    // Legacy keys
    root,
    api,
    st,
    elements,
    toast,
    markSaving,
    selectNote: (id, focusTitle, skipHistory) => selectNote(ctx, id, focusTitle, skipHistory),
    renderSidebar: () => renderSidebar(ctx),
    renderList: () => renderList(ctx),
    renderEditor: () => renderEditor(ctx),
    renderMeta: () => renderMeta(),
    renderReviewInbox: () => renderReviewInbox(ctx),
    switchLens,
    startP2PShare: (target) => startP2PShare(ctx, target),
    newNote: () => newNote(ctx),
    newSubNote: (parentId) => newSubNote(ctx, parentId),
    newSubFolder: (parentId) => newSubFolder(ctx, parentId),
    deleteNote: (n) => deleteNote(ctx, n),
    showPrompt: (title, placeholder, defaultValue, cb) => showPrompt(ctx, title, placeholder, defaultValue, cb),
    closeOverlayIf,
    syncToolbar,
    showFlyout,
    hideFlyout,
    openFly: () => {}, // assigned inside initFlyout
    openFlyAt: () => {} // assigned inside initFlyout
  };

  APPS.push(api);

  // Initialize flyout mechanics and builders
  initFlyout(ctx);

  /* theme + split */
  api.setTheme(theme);
  elements.themeBtn.addEventListener('click', () => api.setTheme(api.theme === 'dark' ? 'light' : 'dark'));
  
  elements.splitBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('split');
    APPS.forEach(a => {
      const btn = a.root.querySelector('.split-btn');
      if (btn) btn.classList.toggle('on', on);
    });
  });

  /* Window control listeners */
  const winMin = q<HTMLButtonElement>('.win-min');
  const winMax = q<HTMLButtonElement>('.win-max');
  const winClose = q<HTMLButtonElement>('.win-close');

  if (winMin) winMin.addEventListener('click', () => window.electronAPI?.minimizeWindow?.());
  if (winMax) winMax.addEventListener('click', () => window.electronAPI?.maximizeWindow?.());
  if (winClose) winClose.addEventListener('click', () => window.electronAPI?.closeWindow?.());

  initVaultSwitcher(ctx, root);

  function renderMeta() {
    const n = st.notes.find(x => x.id === st.sel);
    if (!n) return;
    const nb = NBS.find(x => x.id === n.nb);
    const dotEl = elements.metaNb.querySelector('.dot') as HTMLElement;
    if (dotEl) {
      dotEl.style.background = nb ? nb.color : 'transparent';
      dotEl.style.display = nb ? 'inline-block' : 'none';
    }
    const nbNameEl = elements.metaNb.querySelector('.nb-name');
    if (nbNameEl) nbNameEl.textContent = nb ? nb.name : 'No Notebook';
    elements.metaDate.textContent = 'Updated ' + n.date.toLowerCase();
    elements.mtTxt.textContent = n.tags.length ? n.tags.map(t => TAGS.find(x => x.id === t)?.name || t).join(', ') : 'Tags';
    elements.pinBtn.classList.toggle('on', n.pinned);
  }

  function switchLens(nextLens: 'notes' | 'academic' | 'review') {
    st.lens = nextLens;
    root.className = `win lens-${nextLens}`;
    const lensLbl = q<HTMLElement>('.lens-lbl');
    if (lensLbl) {
      lensLbl.textContent = nextLens === 'notes' ? 'Notes Lens' : nextLens === 'academic' ? 'Academic Lens' : 'Review Lens';
    }
    if (nextLens === 'review') {
      renderReviewInbox(ctx);
    }
    renderList(ctx);
    renderEditor(ctx);
  }



  function closeOverlayIf() {
    if (st.overlay) {
      st.overlay = false;
      root.classList.remove('sb-open');
    }
  }

  initResponsive(ctx, root);

  function syncToolbar() {
    const active = document.activeElement;
    const insideEditor = active && (
      active === elements.edBody || 
      active === elements.edTitle || 
      active.classList.contains('block-text-field') || 
      active.classList.contains('block-code-field') ||
      elements.edBody.contains(active)
    );
    if (!insideEditor) return;

    qAll('button[data-cmd]').forEach(b => {
      const c = b.dataset.cmd;
      if (c && ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].includes(c)) {
        let on = false;
        try {
          on = document.queryCommandState(c);
        } catch (e) {}
        b.classList.toggle('toggled', on);
      }
    });

    let cur = 'paragraph';
    if (active && active.classList.contains('block-text-field')) {
      const blockEl = active.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        cur = blockEl.dataset.type || 'paragraph';
      }
    }
    const typeLabelMap: Record<string, string> = {
      paragraph: 'Paragraph',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      todo: 'To-do',
      bullet: 'Bulleted list',
      numbered: 'Numbered list',
      toggle: 'Toggle',
      quote: 'Quote',
      code: 'Code Block',
      callout: 'Callout'
    };
    elements.styleLbl.textContent = typeLabelMap[cur] || 'Paragraph';
  }

  // Initialize modular component events
  initSidebarEvents(ctx);
  initListEvents(ctx);
  initEditorEvents(ctx);
  initResize(ctx);

  // Listen for Ctrl+Shift+, shortcut dispatched from sidebar.ts
  document.addEventListener('fluent:open-vault-switcher', () => {
    openVaultSwitcher(ctx);
  });

  // Escape to close overlays
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const vaultOverlay = document.getElementById('vaultOverlay');
      if (vaultOverlay && vaultOverlay.style.display === 'flex') {
        vaultOverlay.style.display = 'none';
      }
      const settingsOverlay = document.getElementById('settingsOverlay');
      if (settingsOverlay && settingsOverlay.style.display === 'flex') {
        settingsOverlay.style.display = 'none';
      }
    }
  });

  // Initial load
  const initialSelId = sharedNotes.length ? sharedNotes[0].id : null;
  st.sel = initialSelId;
  api.renderSidebar();
  api.renderList();
  api.renderEditor();

  // Set vault name in lens button
  if (window.electronAPI) {
    try {
      const vaultPath = window.electronAPI.getVaultPathSync();
      if (vaultPath) {
        const parts = vaultPath.replace(/\\/g, '/').split('/');
        const vaultName = parts[parts.length - 1] || vaultPath;
        const lensLbl = q<HTMLElement>('.lens-lbl');
        if (lensLbl) lensLbl.textContent = vaultName;
      } else {
        // No active vault configured, open the switcher immediately on startup
        openVaultSwitcher(ctx);
        const closeBtn = root.querySelector('#vaultClose') as HTMLElement;
        if (closeBtn) closeBtn.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }
  
  return api;
}
