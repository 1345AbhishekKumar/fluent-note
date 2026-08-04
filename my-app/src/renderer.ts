import './index.css';

interface Note {
  id: string;
  nb: string;
  tags: string[];
  pinned: boolean;
  date: string;
  title: string;
  body: string;
  ord: number;
}

interface Notebook {
  id: string;
  name: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FlyoutItem {
  sep?: boolean;
  head?: string;
  dot?: string;
  icon?: string;
  label?: string;
  kbd?: string;
  checked?: boolean;
  danger?: boolean;
  keep?: boolean;
  action?: () => void;
}

interface AppInstance {
  root: HTMLDivElement;
  theme: 'light' | 'dark';
  host: HTMLElement;
  setTheme: (theme: 'light' | 'dark') => void;
  sync: () => void;
  onTheme?: (theme: 'light' | 'dark') => void;
  renderSidebar: () => void;
  renderList: () => void;
  renderEditor: () => void;
  syncNotes: (newNotes: Note[]) => void;
  selectNote: (id: string | null, focusTitle?: boolean) => void;
  renderMeta: () => void;
  getSelectedNoteId: () => string | null;
  selectFirstNote: () => void;
}

/* ================= ICONS ================= */
const IC = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.3"/><path d="M15.8 15.8 20.5 20.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4.5 10.5 12 4l7.5 6.5"/><path d="M6.5 9.2v9.3h11V9.2"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M5 4.8A1.8 1.8 0 0 1 6.8 3H19v14.2H6.8A1.8 1.8 0 0 0 5 19z"/><path d="M5 19a1.8 1.8 0 0 0 1.8 1.8H19V17.2"/><path d="M8.5 7h7"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3.6 12.5 11.4 4.7a2 2 0 0 1 1.4-.6h4.6a2 2 0 0 1 2 2v4.6a2 2 0 0 1-.6 1.4l-7.8 7.8a2 2 0 0 1-2.8 0l-4.6-4.6a2 2 0 0 1 0-2.8z"/><circle cx="15.4" cy="8.6" r="1.3"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M13.4 2.9a1 1 0 0 1 1.6-.4l6.5 6.5a1 1 0 0 1-.4 1.6l-2.9 1-2.7 2.7-.6 3.9a1 1 0 0 1-1.7.6l-3-3-4.9 4.9-1.2-1.2 4.9-4.9-3-3a1 1 0 0 1 .6-1.7l3.9-.6 2.7-2.7z" class="f"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"/><path d="M12 7.5V12l3 2"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20.2 13.4A8.2 8.2 0 1 1 10.6 3.8a6.6 6.6 0 0 0 9.6 9.6z"/></svg>',
  split: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="7.2" height="15" rx="1.6"/><rect x="13.3" y="4.5" width="7.2" height="15" rx="1.6"/></svg>',
  chevD: '<svg viewBox="0 0 24 24"><path d="M6.5 9.5 12 15l5.5-5.5"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" class="f"/><circle cx="12" cy="12" r="1.6" class="f"/><circle cx="19" cy="12" r="1.6" class="f"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M8.3 13.7 3.8 9.2l4.5-4.5"/><path d="M3.8 9.2H13a6.8 6.8 0 0 1 0 13.6H9"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="m15.7 13.7 4.5-4.5-4.5-4.5"/><path d="M20.2 9.2H11a6.8 6.8 0 0 0 0 13.6h4"/></svg>',
  ul: '<svg viewBox="0 0 24 24"><circle cx="4.6" cy="6" r="1.5" class="f"/><circle cx="4.6" cy="12" r="1.5" class="f"/><circle cx="4.6" cy="18" r="1.5" class="f"/><path d="M9 6h10.4M9 12h10.4M9 18h10.4"/></svg>',
  ol: '<svg viewBox="0 0 24 24"><text x="2.4" y="8" font-size="7" fill="currentColor" stroke="none">1</text><text x="2.4" y="14.5" font-size="7" fill="currentColor" stroke="none">2</text><text x="2.4" y="21" font-size="7" fill="currentColor" stroke="none">3</text><path d="M10 6h9.4M10 12.5h9.4M10 19h9.4"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M9.8 6.6C7.2 7.5 5.6 9.5 5.6 12.2c.3-.2.8-.3 1.2-.3 1.6 0 2.7 1.1 2.7 2.6s-1.1 2.7-2.7 2.7C5 17.2 4 15.6 4 13.1c0-3.3 2-6 5.2-7.2zm9 0c-2.6.9-4.2 2.9-4.2 5.6.3-.2.8-.3 1.2-.3 1.6 0 2.7 1.1 2.7 2.6s-1.1 2.7-2.7 2.7c-1.8 0-2.8-1.6-2.8-4.1 0-3.3 2-6 5.2-7.2z" class="f"/></svg>',
  hl: '<svg viewBox="0 0 24 24"><path d="m13.6 4.9 5.5 5.5L10 19.5H4.5V14z"/><path d="m11.4 7.1 5.5 5.5"/><path d="M4 21.5h16"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="m10.8 13.2 2.4-2.4"/><path d="m12.6 6.8 1.6-1.6a3.9 3.9 0 0 1 5.5 5.5l-1.6 1.6"/><path d="m11.4 17.2-1.6 1.6a3.9 3.9 0 0 1-5.5-5.5l1.6-1.6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M10.5 4.5 3 12l7.5 7.5"/><path d="M3.6 12H21"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 6.5h15"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="m6.5 6.5 1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/><path d="M10 10.5v6M14 10.5v6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8.7" y="8.7" width="11" height="11" rx="2"/><path d="M15.3 5.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8.3a2 2 0 0 0 2 2h.5"/></svg>',
  sortIc: '<svg viewBox="0 0 24 24"><path d="M7.5 4.5v13M7.5 17.5 4.3 14.3M7.5 17.5l3.2-3.2"/><path d="M16.5 19.5v-13M16.5 6.5l-3.2 3.2M16.5 6.5l3.2 3.2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m4.5 12.5 5 5L19.5 6.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="m13.2 4.8 6 6M4 20l1.2-4.6L15.4 5.2a2 2 0 0 1 2.8 0l1.6 1.6a2 2 0 0 1 0 2.8L9.6 19.8z"/></svg>'
};

/* ================= DATA ================= */
const NBS: Notebook[] = [
  { id: 'design', name: 'Design Team', color: '#8470ff' },
  { id: 'work', name: 'Work', color: '#ff9d42' },
  { id: 'research', name: 'Research', color: '#23b8b8' },
  { id: 'personal', name: 'Personal', color: '#ff6a8f' }
];

const TAGS: Tag[] = [
  { id: 'design', name: 'design', color: '#4cc2ff' },
  { id: 'ideas', name: 'ideas', color: '#ffb900' },
  { id: 'todo', name: 'to-do', color: '#6ccb5f' },
  { id: 'meeting', name: 'meeting', color: '#c58af9' },
  { id: 'reading', name: 'reading', color: '#ff8fb2' },
  { id: 'travel', name: 'travel', color: '#4de0c0' }
];

const DEFAULT_NOTES: Note[] = [
  {
    id: 'n1',
    nb: 'design',
    tags: ['design', 'reading'],
    pinned: true,
    date: 'Today · 09:24',
    title: 'Fluent design deep-dive',
    body: '<h2>Why Fluent feels different</h2><p>Mica and Acrylic move chrome from <b>opaque bars</b> to ambient layers — the desktop becomes part of the app\u2019s palette.</p><h2>Materials at a glance</h2><ul><li><b>Mica</b> — long-lived, subtly opaque, samples the wallpaper once. Calm and cheap to render.</li><li><b>Acrylic</b> — blur + noise for short-lived surfaces. Flyouts only.</li><li><b>Reveal</b> — light that follows the pointer across lists.</li></ul><blockquote>\u201cMaterial is not decoration. It is hierarchy.\u201d</blockquote><p>Next: map editor chrome to these layers and audit the corner-radius grid (4 / 8 px).</p>',
    ord: 0
  },
  {
    id: 'n2',
    nb: 'research',
    tags: ['design'],
    pinned: false,
    date: 'Today · 08:05',
    title: 'Mica material spec notes',
    body: '<p>Sampling strategy: blurred wallpaper at low opacity over a base fill.</p><ul><li>Light base: <b>#F3F3F3</b> at ~82%</li><li>Dark base: <b>#202020</b> at ~80%</li></ul><p>Pair with a 1&nbsp;px inner highlight on the top edge so the surface \u201ccatches light\u201d.</p>',
    ord: 1
  },
  {
    id: 'n3',
    nb: 'work',
    tags: ['meeting'],
    pinned: true,
    date: 'Yesterday',
    title: 'Q3 roadmap sync',
    body: '<h2>Decisions</h2><ul><li>Ship sidebar collapse-by-default below 1280&nbsp;px</li><li>Adopt 8&nbsp;px corner radius for every floating card</li></ul><h2>Action items</h2><p>Maya — motion audit · Jonas — dark-mode contrast pass · Priya — resize breakpoint spec.</p>',
    ord: 2
  },
  {
    id: 'n4',
    nb: 'research',
    tags: ['reading'],
    pinned: false,
    date: 'Tuesday',
    title: 'Reading list — interface physics',
    body: '<p>Queued:</p><ul><li>Designing Fluid Interfaces — WWDC \u201918</li><li>The Details of UI Typography — WWDC \u201920</li><li>Interruptible-springs cheatsheet</li></ul><p>Key takeaway so far: <i>never animate from the target value — animate from the presentation value.</i></p>',
    ord: 3
  },
  {
    id: 'n5',
    nb: 'personal',
    tags: ['travel'],
    pinned: false,
    date: 'Monday',
    title: 'Kyoto — five days',
    body: '<h2>Must see</h2><ul><li>Fushimi Inari at sunrise (before crowds)</li><li>Nishiki market lunch crawl</li><li>Kiyomizu-dera at dusk</li></ul><p>Rail pass arrives Tuesday. Book the ryokan with the cedar bath.</p>',
    ord: 4
  },
  {
    id: 'n6',
    nb: 'design',
    tags: ['ideas'],
    pinned: false,
    date: 'Mar 18',
    title: 'Idea: gesture-first onboarding',
    body: '<p>First-run that teaches swipes <i>by being swipeable</i>: the onboarding cards themselves use the production spring curve.</p><blockquote>If the tutorial feels like the app, you don\u2019t need a tutorial.</blockquote>',
    ord: 5
  },
  {
    id: 'n7',
    nb: 'personal',
    tags: [],
    pinned: false,
    date: 'Mar 14',
    title: 'Weekly reflection',
    body: '<p>This week moved fast. Wins: prototype approved, zero regressions. Next week: protect two deep-work mornings.</p>',
    ord: 6
  },
  {
    id: 'n8',
    nb: 'work',
    tags: ['todo'],
    pinned: false,
    date: 'Mar 10',
    title: 'Prototype checklist',
    body: '<p>Before review:</p><ul><li>Mica tint verified in both themes</li><li>Acrylic flyouts anchored to triggers</li><li>Reduced-motion path tested</li><li>Resize: 1440 → 1024 → 720 → 480</li></ul>',
    ord: 7
  }
];

const LOCAL_STORAGE_KEY = 'fluent_notes_app_notes';

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading notes:', e);
  }
  return DEFAULT_NOTES;
}

function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Error saving notes:', e);
  }
}

// Shared notes array loaded once
const sharedNotes: Note[] = loadNotes();

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function strip(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const APPS: AppInstance[] = [];

// Window controls HTML for frameless Electron window
const winControlsHtml = `
  <div class="win-controls">
    <button class="wbtn win-min" title="Minimize">
      <svg viewBox="0 0 10 10"><path d="M0,4.5h10v1H0z" fill="currentColor"/></svg>
    </button>
    <button class="wbtn win-max" title="Maximize">
      <svg viewBox="0 0 10 10"><path d="M0,0h10v10H0V0zm1,1v8h8V1H1z" fill="currentColor"/></svg>
    </button>
    <button class="wbtn win-close" title="Close">
      <svg viewBox="0 0 10 10"><path d="M0,0l10,10M10,0L0,10" stroke="currentColor" stroke-width="1.2"/></svg>
    </button>
  </div>
`;

function saveAndSync() {
  saveNotes(sharedNotes);
  APPS.forEach(app => {
    app.syncNotes(sharedNotes);
    app.renderSidebar();
    app.renderList();
    app.renderMeta();
  });
}

function saveAndSyncContent() {
  saveNotes(sharedNotes);
  APPS.forEach(app => {
    app.syncNotes(sharedNotes);
    app.renderList();
  });
}

function createApp(host: HTMLElement, theme: 'light' | 'dark'): AppInstance {
  const root = document.createElement('div');
  root.className = 'win';
  root.dataset.theme = theme;
  root.innerHTML = `
  <div class="titlebar">
    <button class="tbtn ic burger" title="Toggle navigation" aria-label="Toggle navigation">${IC.menu}</button>
    <span class="app-ico">${IC.pen}</span><span class="app-name">Fluent Notes</span>
    <div class="tb-search"><div class="sbox"><span class="ic s-ic">${IC.search}</span><input class="search" type="text" placeholder="Search notes" spellcheck="false"><kbd class="s-kbd">Ctrl K</kbd></div></div>
    <span class="tb-spacer"></span>
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
        <div class="sb-label sb-txt">Notebooks</div>
        <nav class="sb-nav nbs"></nav>
        <div class="sb-label sb-txt">Tags</div>
        <div class="sb-tags"></div>
      </div>
      <div class="sb-foot"><button class="nav-item rv sb-set"><span class="ic">${IC.gear}</span><span class="sb-txt">Settings</span></button></div>
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
        <div class="ed-body" contenteditable="true" spellcheck="false" data-ph="Start writing…"></div>
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

  const searchIn = q<HTMLInputElement>('.search');
  const burger = q<HTMLButtonElement>('.burger');
  const themeBtn = q<HTMLButtonElement>('.theme-btn');
  const splitBtn = q<HTMLButtonElement>('.split-btn');
  const sidebar = q<HTMLElement>('.sidebar');
  const sbScroll = q<HTMLElement>('.sb-scroll');
  const nbsEl = q<HTMLElement>('.nbs');
  const tagsEl = q<HTMLElement>('.sb-tags');
  const lpTitle = q<HTMLElement>('.lp-title');
  const lpSub = q<HTMLElement>('.lp-sub');
  const lpScroll = q<HTMLElement>('.lp-scroll');
  const actFilter = q<HTMLButtonElement>('.act-filter');
  const actSort = q<HTMLButtonElement>('.act-sort');
  const newNoteBtns = [q<HTMLButtonElement>('.new-note'), q<HTMLButtonElement>('.sb-new')];
  const edBack = q<HTMLButtonElement>('.ed-back');
  const tools = q<HTMLElement>('.ed-tools');
  const styleBtn = q<HTMLButtonElement>('.style-btn');
  const styleLbl = q<HTMLElement>('.style-lbl');
  const pinBtn = q<HTMLButtonElement>('.pin-btn');
  const edMore = q<HTMLButtonElement>('.ed-more');
  const edScroll = q<HTMLElement>('.ed-scroll');
  const edInner = q<HTMLElement>('.ed-inner');
  const edTitle = q<HTMLElement>('.ed-title');
  const edBody = q<HTMLElement>('.ed-body');
  const edEmpty = q<HTMLElement>('.ed-empty');
  const metaNb = q<HTMLButtonElement>('.meta-nb');
  const metaDate = q<HTMLElement>('.md-txt');
  const metaTags = q<HTMLButtonElement>('.meta-tags');
  const mtTxt = q<HTMLElement>('.mt-txt');
  const wcEl = q<HTMLElement>('.wc');
  const saveEl = q<HTMLElement>('.save');
  const saveT = q<HTMLElement>('.save-t');
  const fly = q<HTMLElement>('.flyout');
  const toastEl = q<HTMLElement>('.toast');
  const tMsg = q<HTMLElement>('.t-msg');
  const tAct = q<HTMLButtonElement>('.t-act');
  const scrim = q<HTMLElement>('.scrim');

  const st = {
    notes: sharedNotes,
    ordMin: 0,
    sel: null as string | null,
    nb: 'all',
    tag: null as string | null,
    quick: 'all',
    q: '',
    sort: 'date',
    snippets: true,
    sbUser: false,
    overlay: false
  };

  const api: AppInstance = {
    root,
    theme,
    host,
    setTheme(t) {
      api.theme = t;
      root.dataset.theme = t;
      themeBtn.innerHTML = t === 'dark' ? IC.sun : IC.moon;
      if (api.onTheme) api.onTheme(t);
    },
    sync: syncToolbar,
    renderSidebar,
    renderList,
    renderEditor,
    syncNotes(newNotes) {
      st.notes = newNotes;
    },
    selectNote(id, focusTitle) {
      selectNote(id, focusTitle);
    },
    renderMeta,
    getSelectedNoteId() {
      return st.sel;
    },
    selectFirstNote() {
      const arr = filtered();
      selectNote(arr.length ? arr[0].id : null);
    }
  };
  APPS.push(api);

  /* theme + split */
  api.setTheme(theme);
  themeBtn.addEventListener('click', () => api.setTheme(api.theme === 'dark' ? 'light' : 'dark'));
  
  splitBtn.addEventListener('click', () => {
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

  if (winMin) {
    winMin.addEventListener('click', () => {
      if (window.electronAPI?.minimizeWindow) {
        window.electronAPI.minimizeWindow();
      }
    });
  }
  if (winMax) {
    winMax.addEventListener('click', () => {
      if (window.electronAPI?.maximizeWindow) {
        window.electronAPI.maximizeWindow();
      }
    });
  }
  if (winClose) {
    winClose.addEventListener('click', () => {
      if (window.electronAPI?.closeWindow) {
        window.electronAPI.closeWindow();
      }
    });
  }

  /* ---------- renders ---------- */
  function filtered(): Note[] {
    let arr = st.notes.filter(n => {
      if (st.quick === 'pinned' && !n.pinned) return false;
      if (st.nb !== 'all' && n.nb !== st.nb) return false;
      if (st.tag && !n.tags.includes(st.tag)) return false;
      if (st.q) {
        const hay = (n.title + ' ' + strip(n.body)).toLowerCase();
        if (!hay.includes(st.q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      if (st.sort === 'title') {
        return a.title.localeCompare(b.title);
      }
      return a.ord - b.ord;
    });
    return arr;
  }

  function renderSidebar() {
    qAll('.nav-item[data-q]').forEach(b => {
      const on = (b.dataset.q === 'pinned') 
        ? (st.quick === 'pinned') 
        : (st.quick === 'all' && st.nb === 'all' && !st.tag);
      b.classList.toggle('sel', on);
    });

    nbsEl.innerHTML = NBS.map(nb => {
      const c = st.notes.filter(n => n.nb === nb.id).length;
      return `<button class="nav-item rv ${st.nb === nb.id ? 'sel' : ''}" data-nb="${nb.id}"><span class="ni-bar"></span><span class="ic" style="color:${nb.color}">${IC.book}</span><span class="sb-txt">${nb.name}</span><span class="cnt sb-txt">${c}</span></button>`;
    }).join('');

    tagsEl.innerHTML = TAGS.map(t => {
      const c = st.notes.filter(n => n.tags.includes(t.id)).length;
      return `<button class="tagchip ${st.tag === t.id ? 'on' : ''}" data-tag="${t.id}" style="--tc:${t.color}"><span class="dot" style="background:${t.color}"></span>${t.name}<span class="cnt">${c}</span></button>`;
    }).join('');
  }

  function renderList() {
    const arr = filtered();
    if (st.q) {
      lpTitle.textContent = `Results for “${st.q}”`;
    } else if (st.quick === 'pinned') {
      lpTitle.textContent = 'Pinned';
    } else if (st.nb !== 'all') {
      const foundNb = NBS.find(n => n.id === st.nb);
      lpTitle.textContent = foundNb ? foundNb.name : 'Notebook';
    } else if (st.tag) {
      const foundTag = TAGS.find(t => t.id === st.tag);
      lpTitle.textContent = foundTag ? '#' + foundTag.name : 'Tag';
    } else {
      lpTitle.textContent = 'All notes';
    }

    lpSub.textContent = `${arr.length} note${arr.length === 1 ? '' : 's'}`;
    actFilter.classList.toggle('on', !!st.tag);
    if (!arr.length) {
      lpScroll.innerHTML = `<div class="lp-empty">No notes here.${st.q || st.tag ? '<br><button data-clear="1">Clear filters</button>' : ''}</div>`;
      return;
    }

    lpScroll.innerHTML = arr.map(n => {
      const nb = NBS.find(x => x.id === n.nb) || NBS[0];
      const tg = TAGS.find(x => x.id === n.tags[0]);
      return `<button class="note-card rv ${n.id === st.sel ? 'sel' : ''}" data-id="${n.id}">
        <div class="nc-top"><span class="nc-title">${esc(n.title) || 'Untitled'}</span>${n.pinned ? `<span class="nc-pin ic">${IC.pin}</span>` : ''}</div>
        <div class="nc-snip">${esc(strip(n.body)) || 'No additional text'}</div>
        <div class="nc-meta"><span>${n.date}</span><span class="nc-nb"><span class="dot" style="background:${nb.color}"></span>${nb.name}</span>${tg ? `<span class="nc-tag"><span class="dot" style="background:${tg.color}"></span>${tg.name}</span>` : ''}</div>
      </button>`;
    }).join('');
  }

  function renderMeta() {
    const n = st.notes.find(x => x.id === st.sel);
    if (!n) return;
    const nb = NBS.find(x => x.id === n.nb) || NBS[0];
    const dotEl = metaNb.querySelector('.dot') as HTMLElement;
    if (dotEl) dotEl.style.background = nb.color;
    const nbNameEl = metaNb.querySelector('.nb-name');
    if (nbNameEl) nbNameEl.textContent = nb.name;
    metaDate.textContent = 'Updated ' + n.date.toLowerCase();
    mtTxt.textContent = n.tags.length ? n.tags.map(t => TAGS.find(x => x.id === t)?.name || t).join(', ') : 'Tags';
    pinBtn.classList.toggle('on', n.pinned);
  }

  function renderEditor() {
    const n = st.notes.find(x => x.id === st.sel);
    edEmpty.style.display = n ? 'none' : 'flex';
    edTitle.style.display = n ? '' : 'none';
    const edMetaEl = q('.ed-meta');
    if (edMetaEl) edMetaEl.style.display = n ? '' : 'none';
    edBody.style.display = n ? '' : 'none';
    if (!n) return;
    edTitle.textContent = n.title;
    edBody.innerHTML = n.body;
    renderMeta();
    updateStatus();
  }

  function selectNote(id: string | null, focusTitle: boolean = false) {
    st.sel = id;
    renderList();
    edInner.classList.add('swap');
    setTimeout(() => {
      renderEditor();
      edInner.classList.remove('swap');
      if (focusTitle) {
        edTitle.focus();
      }
    }, REDUCED ? 0 : 120);
    if (root.classList.contains('s') && id) {
      root.classList.add('show-editor');
    }
  }

  function renderAll() {
    renderSidebar();
    renderList();
    renderEditor();
  }

  /* ---------- status ---------- */
  function updateStatus() {
    const n = st.notes.find(x => x.id === st.sel);
    const words = n ? strip(edBody.innerHTML).split(/\s+/).filter(Boolean).length : 0;
    wcEl.textContent = words + ' words';
  }

  let saveTimer: any = null;
  function markSaving() {
    saveEl.className = 'save busy';
    saveT.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveEl.className = 'save ok';
      saveT.textContent = 'Saved';
    }, 700);
  }

  /* ---------- toast ---------- */
  let toastTimer: any = null;
  let toastFn: (() => void) | null = null;
  function toast(msg: string, actLabel?: string, fn?: () => void) {
    tMsg.textContent = msg;
    tAct.textContent = actLabel || '';
    toastFn = fn || null;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
  }
  tAct.addEventListener('click', () => {
    if (toastFn) toastFn();
    toastEl.classList.remove('show');
  });

  /* ---------- flyout ---------- */
  let flyItems: FlyoutItem[] = [];
  let flyAnchor: HTMLElement | null = null;

  function buildFly(items: FlyoutItem[]) {
    flyItems = items;
    fly.innerHTML = items.map((it, i) => {
      if (it.sep) return '<div class="fly-sep"></div>';
      if (it.head) return `<div class="fly-head">${it.head}</div>`;
      
      const dotHtml = it.dot ? `<span class="dot" style="background:${it.dot}"></span>` : '';
      const iconHtml = it.icon ? `<span class="ic">${it.icon}</span>` : '';
      const kbdHtml = it.kbd ? `<span class="kbd">${it.kbd}</span>` : '';
      const chkHtml = it.checked ? `<span class="ic fly-chk">${IC.check}</span>` : '';
      const dangerClass = it.danger ? 'danger' : '';
      
      return `<button class="fly-item rv ${dangerClass}" data-i="${i}">
        ${dotHtml || iconHtml}
        <span class="fly-lbl">${it.label || ''}</span>
        ${kbdHtml || chkHtml}
      </button>`;
    }).join('');
  }

  function placeFly(x: number, y: number, anchor: HTMLElement | null) {
    flyAnchor = anchor || null;
    const wr = root.getBoundingClientRect();
    fly.style.left = '-9999px';
    fly.style.top = '-9999px';
    fly.classList.add('open');
    const fw = fly.offsetWidth;
    const fh = fly.offsetHeight;
    let ox = '0%';
    let oy = '0';
    if (x + fw > wr.width - 8) {
      x = wr.width - 8 - fw;
      ox = '100%';
    }
    if (x < 8) x = 8;
    if (y + fh > wr.height - 8) {
      y = y - fh - (anchor ? anchor.offsetHeight + 12 : 12);
      oy = '100%';
    }
    if (y < 8) y = 8;
    fly.style.setProperty('--fo', `${ox} ${oy}`);
    fly.style.left = x + 'px';
    fly.style.top = y + 'px';
  }

  function openFly(anchor: HTMLElement, items: FlyoutItem[]) {
    buildFly(items);
    const wr = root.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    placeFly(ar.left - wr.left, ar.bottom - wr.top + 6, anchor);
  }

  function openFlyAt(cx: number, cy: number, items: FlyoutItem[]) {
    buildFly(items);
    const wr = root.getBoundingClientRect();
    placeFly(cx - wr.left, cy - wr.top + 4, null);
  }

  function closeFly() {
    fly.classList.remove('open');
    flyAnchor = null;
  }

  fly.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const b = target.closest('.fly-item') as HTMLElement;
    if (!b) return;
    const it = flyItems[parseInt(b.dataset.i!)];
    if (it.keep) {
      if (it.action) it.action();
      buildFly(flyItems);
      return;
    }
    closeFly();
    if (it.action) it.action();
  });

  root.addEventListener('pointerdown', e => {
    const target = e.target as HTMLElement;
    if (fly.classList.contains('open') && !fly.contains(target) && !(flyAnchor && flyAnchor.contains(target))) {
      closeFly();
    }
  }, true);

  [lpScroll, edScroll, sbScroll].forEach(el => {
    el.addEventListener('scroll', closeFly, { passive: true });
  });

  /* ---------- flyout content ---------- */
  const sortItems = () => [
    { head: 'Sort by' },
    { label: 'Last edited', icon: IC.clock, checked: st.sort === 'date', action: () => { st.sort = 'date'; renderList(); } },
    { label: 'Title A–Z', icon: IC.sortIc, checked: st.sort === 'title', action: () => { st.sort = 'title'; renderList(); } },
    { sep: true },
    { label: 'Show snippets', icon: IC.ul, checked: st.snippets, action: () => { st.snippets = !st.snippets; root.classList.toggle('no-snip', !st.snippets); } },
    { sep: true },
    { label: 'New note', icon: IC.plus, action: newNote }
  ];

  const filterItems = () => [
    { head: 'Filter by tag' },
    { label: 'All tags', icon: IC.tag, checked: !st.tag, action: () => { st.tag = null; renderSidebar(); renderList(); } },
    ...TAGS.map(t => ({
      label: t.name,
      dot: t.color,
      checked: st.tag === t.id,
      action: () => {
        st.tag = st.tag === t.id ? null : t.id;
        renderSidebar();
        renderList();
      }
    }))
  ];

  const styleItems = () => {
    let cur = 'p';
    try {
      cur = (document.queryCommandValue('formatBlock') || 'p').toLowerCase();
    } catch (e) {}
    return [
      ['p', 'Paragraph'],
      ['h2', 'Heading 1'],
      ['h3', 'Heading 2'],
      ['blockquote', 'Quote']
    ].map(([b, l]) => ({
      label: l,
      checked: cur === b,
      action: () => {
        edBody.focus();
        try {
          document.execCommand('formatBlock', false, cur === b && b !== 'p' ? '<p>' : '<' + b + '>');
        } catch (e) {}
        syncToolbar();
        const n = st.notes.find(x => x.id === st.sel);
        if (n) {
          n.body = edBody.innerHTML;
          saveAndSyncContent();
          markSaving();
        }
      }
    }));
  };

  const nbItems = (n: Note) => NBS.map(nb => ({
    label: nb.name,
    dot: nb.color,
    checked: n.nb === nb.id,
    action: () => {
      n.nb = nb.id;
      saveAndSync();
    }
  }));

  const tagItems = (n: Note) => TAGS.map(t => ({
    label: t.name,
    dot: t.color,
    checked: n.tags.includes(t.id),
    keep: true,
    action: () => {
      n.tags = n.tags.includes(t.id) ? n.tags.filter(x => x !== t.id) : [...n.tags, t.id];
      saveAndSync();
    }
  }));

  const noteItems = (n: Note) => [
    {
      label: n.pinned ? 'Unpin note' : 'Pin note',
      icon: IC.pin,
      action: () => {
        n.pinned = !n.pinned;
        saveAndSync();
      }
    },
    {
      label: 'Duplicate',
      icon: IC.copy,
      action: () => {
        const c: Note = {
          ...n,
          id: 'n' + Math.random().toString(36).slice(2, 7),
          title: n.title + ' (copy)',
          tags: [...n.tags],
          ord: n.ord - .5,
          date: 'Just now'
        };
        sharedNotes.push(c);
        selectNote(c.id);
        saveAndSync();
        toast('Note duplicated');
      }
    },
    { label: 'Copy link', icon: IC.link, kbd: 'Ctrl C', action: () => toast('Link copied to clipboard (demo)') },
    { sep: true },
    {
      label: 'Delete note',
      icon: IC.trash,
      danger: true,
      action: () => deleteNote(n)
    }
  ];

  function deleteNote(n: Note) {
    const idx = sharedNotes.indexOf(n);
    if (idx !== -1) {
      sharedNotes.splice(idx, 1);
      
      APPS.forEach(app => {
        if (app.getSelectedNoteId() === n.id) {
          app.selectFirstNote();
        }
      });
      
      saveAndSync();
      toast('Note deleted', 'Undo', () => {
        sharedNotes.splice(idx, 0, n);
        APPS.forEach(app => {
          if (app.getSelectedNoteId() === null) {
            app.selectNote(n.id);
          }
        });
        saveAndSync();
      });
    }
  }

  function newNote() {
    const n: Note = {
      id: 'n' + Math.random().toString(36).slice(2, 7),
      title: '',
      body: '',
      nb: st.nb !== 'all' ? st.nb : 'design',
      tags: st.tag ? [st.tag] : [],
      pinned: false,
      date: 'Just now',
      ord: --st.ordMin
    };
    sharedNotes.unshift(n);
    st.quick = 'all';
    saveAndSync();
    selectNote(n.id, true);
  }

  /* ---------- sidebar events ---------- */
  sidebar.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const qb = target.closest('[data-q]') as HTMLElement;
    const nb = target.closest('[data-nb]') as HTMLElement;
    const tg = target.closest('[data-tag]') as HTMLElement;
    
    if (target.closest('.sb-set')) {
      toast('Settings is a demo surface');
      return;
    }
    if (target.closest('.sb-new')) {
      newNote();
      closeOverlayIf();
      return;
    }
    
    if (qb) {
      st.quick = qb.dataset.q!;
      st.nb = 'all';
      st.tag = null;
    } else if (nb) {
      st.nb = nb.dataset.nb!;
      st.quick = 'all';
      st.tag = null;
    } else if (tg) {
      st.tag = st.tag === tg.dataset.tag ? null : tg.dataset.tag!;
      st.quick = 'all';
    } else {
      return;
    }
    
    renderSidebar();
    renderList();
    closeOverlayIf();
  });

  function closeOverlayIf() {
    if (st.overlay) {
      st.overlay = false;
      root.classList.remove('sb-open');
    }
  }

  /* ---------- list events ---------- */
  lpScroll.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-clear]')) {
      st.q = '';
      st.tag = null;
      searchIn.value = '';
      renderSidebar();
      renderList();
      return;
    }
    const c = target.closest('.note-card') as HTMLElement;
    if (c) selectNote(c.dataset.id!);
  });

  lpScroll.addEventListener('contextmenu', e => {
    const target = e.target as HTMLElement;
    const c = target.closest('.note-card') as HTMLElement;
    if (!c) return;
    e.preventDefault();
    const n = st.notes.find(x => x.id === c.dataset.id);
    if (n) {
      openFlyAt(e.clientX, e.clientY, noteItems(n));
    }
  });

  actSort.addEventListener('click', () => openFly(actSort, sortItems()));
  actFilter.addEventListener('click', () => openFly(actFilter, filterItems()));
  newNoteBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', newNote);
  });

  /* ---------- editor events ---------- */
  edBack.addEventListener('click', () => root.classList.remove('show-editor'));
  
  tools.addEventListener('mousedown', e => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) e.preventDefault();
  });
  
  tools.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const b = target.closest('button') as HTMLButtonElement;
    if (!b) return;
    const n = st.notes.find(x => x.id === st.sel);
    if (!n) return;
    
    if (b === styleBtn) {
      openFly(styleBtn, styleItems());
      return;
    }
    if (b === edMore) {
      openFly(edMore, noteItems(n));
      return;
    }
    if (b === pinBtn) {
      n.pinned = !n.pinned;
      saveAndSync();
      return;
    }
    
    const cmd = b.dataset.cmd;
    if (!cmd) return;
    edBody.focus();
    try {
      if (cmd === 'quote') {
        let cur = 'p';
        try {
          cur = (document.queryCommandValue('formatBlock') || '').toLowerCase();
        } catch (e2) {}
        document.execCommand('formatBlock', false, cur === 'blockquote' ? '<p>' : '<blockquote>');
      } else if (cmd === 'hiliteColor') {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('hiliteColor', false, api.theme === 'dark' ? 'rgba(255,210,63,.32)' : '#ffe9a0');
      } else if (cmd === 'link') {
        const u = prompt('Link URL', 'https://');
        if (u) document.execCommand('createLink', false, u);
      } else {
        document.execCommand(cmd, false, undefined);
      }
    } catch (err) {}
    
    syncToolbar();
    saveAndSyncContent();
    markSaving();
  });

  metaNb.addEventListener('click', () => {
    const n = st.notes.find(x => x.id === st.sel);
    if (n) openFly(metaNb, nbItems(n));
  });

  metaTags.addEventListener('click', () => {
    const n = st.notes.find(x => x.id === st.sel);
    if (n) openFly(metaTags, tagItems(n));
  });

  edTitle.addEventListener('input', () => {
    const n = st.notes.find(x => x.id === st.sel);
    if (n) {
      n.title = edTitle.textContent || '';
      saveAndSyncContent();
      markSaving();
    }
  });

  edTitle.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      edBody.focus();
    }
  });

  edBody.addEventListener('input', () => {
    const n = st.notes.find(x => x.id === st.sel);
    if (n) {
      n.body = edBody.innerHTML;
      saveAndSyncContent();
      updateStatus();
      markSaving();
    }
  });

  /* ---------- search ---------- */
  searchIn.addEventListener('input', () => {
    st.q = searchIn.value.trim().toLowerCase();
    renderList();
  });

  /* ---------- burger / overlay ---------- */
  burger.addEventListener('click', () => {
    if (root.classList.contains('m') || root.classList.contains('s')) {
      st.overlay = !st.overlay;
      root.classList.toggle('sb-open', st.overlay);
    } else {
      st.sbUser = !st.sbUser;
      root.classList.toggle('sb-user', st.sbUser);
    }
  });
  
  scrim.addEventListener('click', closeOverlayIf);

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
    if (document.activeElement !== edBody && document.activeElement !== edTitle) return;
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
    styleLbl.textContent = ({
      p: 'Paragraph',
      h2: 'Heading 1',
      h3: 'Heading 2',
      blockquote: 'Quote',
      div: 'Paragraph'
    } as any)[cur] || 'Paragraph';
  }

  // Initial load
  const initialSelId = sharedNotes.length ? sharedNotes[0].id : null;
  st.sel = initialSelId;
  renderAll();
  
  return api;
}

/* ================= BOOT ================= */
document.addEventListener('DOMContentLoaded', () => {
  const halfA = document.getElementById('halfA');
  const halfB = document.getElementById('halfB');
  if (!halfA || !halfB) return;

  const appA = createApp(halfA, 'light');
  const appB = createApp(halfB, 'dark');

  appA.onTheme = (t) => {
    document.body.dataset.wall = t;
  };

  document.addEventListener('selectionchange', () => {
    requestAnimationFrame(() => APPS.forEach(a => a.sync && a.sync()));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      APPS.forEach(a => {
        a.root.querySelector('.flyout')?.classList.remove('open');
        a.root.classList.remove('sb-open');
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      (appA.root.querySelector('.search') as HTMLInputElement)?.focus();
    }
  });

  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch (e) {}
});
