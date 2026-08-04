import type { AppInstance, Note, Block, Folder } from '../types';
import { IC, TAGS, winControlsHtml } from '../constants';
import { sharedNotebooks as NBS } from '../store';
import { resolveNoteId, genId, findNotebookForParent } from '../utils';
import { sharedNotes, APPS, saveAndSync, saveAndSyncContent, loadClips, sharedFolders } from '../store';
import type { AppContext } from './context';
import { initFlyout } from './components/flyout';
import { startP2PShare } from './components/p2p';
import { renderSidebar, initSidebarEvents } from './views/sidebar';
import { renderList, initListEvents, filtered } from './views/list';
import { renderEditor, initEditorEvents } from './views/editor';
import { renderReviewInbox } from './views/review';
import { showPrompt } from './components/prompt';

const REDUCED = (typeof matchMedia !== 'undefined') ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;

export function createApp(host: HTMLElement, theme: 'light' | 'dark'): AppInstance {
  const root = document.createElement('div');
  root.className = 'win';
  root.dataset.theme = theme;
  root.innerHTML = `
  <div class="titlebar">
    <button class="tbtn ic burger" title="Toggle navigation" aria-label="Toggle navigation">${IC.menu}</button>
    <span class="app-ico">${IC.pen}</span><span class="app-name">Fluent Notes</span>
    <div class="tb-search"><div class="sbox"><span class="ic s-ic">${IC.search}</span><input class="search" type="text" placeholder="Search notes" spellcheck="false"><kbd class="s-kbd">Ctrl K</kbd></div></div>
    <span class="tb-spacer"></span>
    <div class="lens-switcher-container">
      <button class="tbtn style-btn lens-btn"><span class="lens-lbl">Notes Lens</span><span class="ic">${IC.chevD}</span></button>
    </div>
    <button class="tbtn ic split-btn" title="Side-by-side themes">${IC.split}</button>
    <button class="tbtn ic theme-btn" title="Toggle theme">${IC.moon}</button>
    ${winControlsHtml}
  </div>
  <div class="app-body">
    <aside class="pane sidebar">
      <div class="sb-scroll">
        <button class="sb-new"><span class="ic">${IC.plus}</span><span class="sb-txt">New note</span></button>
        <div class="sb-label sb-txt">Quick access</div>
        <nav class="sb-nav">
          <button class="nav-item rv" data-q="all"><span class="ni-bar"></span><span class="ic">${IC.home}</span><span class="sb-txt">All notes</span></button>
          <button class="nav-item rv" data-q="pinned"><span class="ni-bar"></span><span class="ic">${IC.pin}</span><span class="sb-txt">Pinned</span></button>
        </nav>
        <div class="sb-label sb-txt">Views</div>
        <nav class="sb-nav views-nav">
          <button class="nav-item rv" data-view="list"><span class="ni-bar"></span><span class="ic">${IC.ul}</span><span class="sb-txt">List</span></button>
          <button class="nav-item rv" data-view="grid"><span class="ni-bar"></span><span class="ic">${IC.grid}</span><span class="sb-txt">Grid</span></button>
          <button class="nav-item rv" data-view="graph"><span class="ni-bar"></span><span class="ic">${IC.graph}</span><span class="sb-txt">Graph</span></button>
        </nav>
        <div class="sb-label sb-txt" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:10px;">
          <span>Notebooks</span>
          <button class="btn-new-nb" title="New notebook" style="display:flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:3px; cursor:pointer; color:var(--text3);">
            ${IC.plus}
          </button>
        </div>
        <nav class="sb-nav nbs"></nav>
        <div class="sb-label sb-txt">Tags</div>
        <div class="sb-tags"></div>
      </div>
      <div class="sb-foot" style="display:flex; flex-direction:column; gap:2px;">
        <button class="nav-item rv sb-import"><span class="ic">${IC.link}</span><span class="sb-txt">Import Share</span></button>
        <button class="nav-item rv sb-set"><span class="ic">${IC.gear}</span><span class="sb-txt">Settings</span></button>
      </div>
    </aside>
    <section class="pane listpane">
      <div class="lp-head">
        <div class="lp-tr">
          <h2 class="lp-title">All notes</h2>
          <div class="lp-actions">
            <button class="ib ic act-filter" title="Filter by tag">${IC.tag}</button>
            <button class="ib ic act-sort" title="Sort & view">${IC.sortIc}</button>
            <button class="ib ic new-note" title="New note">${IC.plus}</button>
          </div>
        </div>
        <div class="lp-sub"></div>
      </div>
      <div class="lp-scroll"></div>
    </section>
    <div class="review-inbox-pane">
      <h3>Transient Highlights</h3>
      <div class="review-clusters"></div>
    </div>
    <section class="pane editorpane">
      <div class="ed-bar">
        <button class="ib ic ed-back" title="Back to list">${IC.back}</button>
        <div class="ed-tools">
          <button class="ib ic" data-cmd="undo" title="Undo">${IC.undo}</button>
          <button class="ib ic" data-cmd="redo" title="Redo">${IC.redo}</button>
          <span class="sep"></span>
          <button class="ib style-btn"><span class="style-lbl">Paragraph</span><span class="ic">${IC.chevD}</span></button>
          <span class="sep"></span>
          <button class="ib tb-chr" data-cmd="bold" title="Bold (Ctrl+B)"><span class="chr b">B</span></button>
          <button class="ib tb-chr" data-cmd="italic" title="Italic (Ctrl+I)"><span class="chr i">I</span></button>
          <button class="ib tb-chr" data-cmd="underline" title="Underline (Ctrl+U)"><span class="chr u">U</span></button>
          <button class="ib tb-chr" data-cmd="strikeThrough" title="Strikethrough"><span class="chr s">S</span></button>
          <span class="sep"></span>
          <button class="ib ic" data-cmd="insertUnorderedList" title="Bulleted list">${IC.ul}</button>
          <button class="ib ic" data-cmd="insertOrderedList" title="Numbered list">${IC.ol}</button>
          <button class="ib ic" data-cmd="quote" title="Quote">${IC.quote}</button>
          <button class="ib ic" data-cmd="hiliteColor" title="Highlight">${IC.hl}</button>
          <button class="ib ic" data-cmd="link" title="Insert link">${IC.link}</button>
          <span class="sep"></span>
          <button class="ib ic pin-btn" title="Pin note">${IC.pin}</button>
          <button class="ib ic ed-more" title="More">${IC.dots}</button>
        </div>
      </div>
      <div class="ed-scroll"><div class="ed-inner">
        <h1 class="ed-title" contenteditable="true" spellcheck="false"></h1>
        <div class="ed-meta">
          <button class="pill meta-nb"><span class="dot"></span><span class="nb-name"></span><span class="ic">${IC.chevD}</span></button>
          <span class="meta-date"><span class="ic">${IC.clock}</span><span class="md-txt"></span></span>
          <button class="pill meta-tags"><span class="ic">${IC.tag}</span><span class="mt-txt">Tags</span><span class="ic">${IC.chevD}</span></button>
        </div>
        <div class="academic-metadata">
          <label>Authors <input type="text" class="ac-authors" placeholder="Authors" spellcheck="false"></label>
          <label>Journal <input type="text" class="ac-journal" placeholder="Journal" spellcheck="false"></label>
          <label>Year <input type="text" class="ac-year" placeholder="Year" spellcheck="false"></label>
        </div>
        <div class="ed-body" spellcheck="false" data-ph="Start writing…"></div>
        <div class="sub-items-panel">
          <div class="sub-items-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0;">Subfolders & Subpages</h4>
            <button class="ib ic sub-items-add-btn" title="Add subfolder or subpage" style="width:24px; height:24px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:var(--text3); cursor:pointer;">${IC.plus}</button>
          </div>
          <div class="sub-items-list"></div>
        </div>
        <div class="backlinks-panel">
          <h4>Backlinks</h4>
          <div class="backlinks-list"></div>
        </div>
        <div class="ed-empty"><span class="ic">${IC.pen}</span>Select a note, or create a new one.</div>
      </div></div>
      <div class="ed-status"><span class="wc">0 words</span><span class="save ok"><span class="ic">${IC.check}</span><span class="save-t">Saved</span></span></div>
    </section>
    <div class="scrim"></div>
  </div>
  <div class="flyout"></div>
  <div class="toast"><span class="t-msg"></span><button class="t-act"></button></div>`;
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
    clips: loadClips()
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
    selectNote(id, focusTitle) {
      selectNote(id, focusTitle);
    },
    renderMeta: () => renderMeta(),
    getSelectedNoteId() {
      return st.sel;
    },
    selectFirstNote() {
      const arr = filtered(ctx);
      selectNote(arr.length ? arr[0].id : null);
    },
    showReceivedToast(closureCount, title) {
      toast(`Received ${closureCount} shared notes (incl. "${title}") from peer!`);
      const nId = resolveNoteId(title, st.notes);
      if (nId) {
        selectNote(nId);
      }
    }
  };

  const ctx: AppContext = {
    root,
    api,
    st,
    elements,
    toast,
    markSaving,
    selectNote,
    renderSidebar: () => renderSidebar(ctx),
    renderList: () => renderList(ctx),
    renderEditor: () => renderEditor(ctx),
    renderMeta: () => renderMeta(),
    renderReviewInbox: () => renderReviewInbox(ctx),
    switchLens,
    startP2PShare: (target) => startP2PShare(ctx, target),
    newNote,
    newSubNote,
    newSubFolder,
    deleteNote,
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

  function renderMeta() {
    const n = st.notes.find(x => x.id === st.sel);
    if (!n) return;
    const nb = NBS.find(x => x.id === n.nb) || NBS[0];
    const dotEl = elements.metaNb.querySelector('.dot') as HTMLElement;
    if (dotEl) dotEl.style.background = nb.color;
    const nbNameEl = elements.metaNb.querySelector('.nb-name');
    if (nbNameEl) nbNameEl.textContent = nb.name;
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

  function expandAncestors(id: string | null) {
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

  function selectNote(id: string | null, focusTitle: boolean = false) {
    st.sel = id;
    if (id) {
      expandAncestors(id);
    }
    renderList(ctx);
    renderSidebar(ctx);
    elements.edInner.classList.add('swap');
    setTimeout(() => {
      renderEditor(ctx);
      elements.edInner.classList.remove('swap');
      if (focusTitle) elements.edTitle.focus();
    }, REDUCED ? 0 : 120);
    if (root.classList.contains('s') && id) {
      root.classList.add('show-editor');
    }
  }

  function deleteNote(n: Note) {
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

  function newNote() {
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
    selectNote(n.id, true);
  }

  function newSubNote(parentId: string) {
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
    expandAncestors(parentId);

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
    selectNote(n.id, true);
  }

  function newSubFolder(parentId: string) {
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
      expandAncestors(parentId);

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

  function closeOverlayIf() {
    if (st.overlay) {
      st.overlay = false;
      root.classList.remove('sb-open');
    }
  }

  /* ---------- burger / overlay ---------- */
  elements.burger.addEventListener('click', () => {
    if (root.classList.contains('m') || root.classList.contains('s')) {
      st.overlay = !st.overlay;
      root.classList.toggle('sb-open', st.overlay);
    } else {
      st.sbUser = !st.sbUser;
      root.classList.toggle('sb-user', st.sbUser);
    }
  });
  elements.scrim.addEventListener('click', closeOverlayIf);

  /* ---------- reveal hover ---------- */
  root.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target as HTMLElement;
    const t = target.closest('.rv') as HTMLElement;
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* ---------- container breakpoints ---------- */
  new ResizeObserver(() => {
    const w = root.clientWidth;
    const h = root.clientHeight;
    root.classList.toggle('xl', w >= 1000);
    root.classList.toggle('l', w >= 780 && w < 1000);
    root.classList.toggle('m', w >= 620 && w < 780);
    root.classList.toggle('s', w < 620);
    root.classList.toggle('h-sm', h < 600 && h >= 430);
    root.classList.toggle('h-xs', h < 430);
    if (!(w < 620)) root.classList.remove('show-editor');
  }).observe(root);

  function syncToolbar() {
    if (document.activeElement !== elements.edBody && document.activeElement !== elements.edTitle) return;
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
    let cur = 'p';
    try {
      cur = (document.queryCommandValue('formatBlock') || 'p').toLowerCase();
    } catch (e) {}
    elements.styleLbl.textContent = ({
      p: 'Paragraph',
      h2: 'Heading 1',
      h3: 'Heading 2',
      blockquote: 'Quote',
      div: 'Paragraph'
    } as any)[cur] || 'Paragraph';
  }

  // Initialize modular component events
  initSidebarEvents(ctx);
  initListEvents(ctx);
  initEditorEvents(ctx);

  // Initial load
  const initialSelId = sharedNotes.length ? sharedNotes[0].id : null;
  st.sel = initialSelId;
  api.renderSidebar();
  api.renderList();
  api.renderEditor();
  
  return api;
}
