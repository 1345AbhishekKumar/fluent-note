import type { Notebook, Tag, Note, TransientClip, Folder } from '../types';

export const IC = {
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
  pen: '<svg viewBox="0 0 24 24"><path d="m13.2 4.8 6 6M4 20l1.2-4.6L15.4 5.2a2 2 0 0 1 2.8 0l1.6 1.6a2 2 0 0 1 0 2.8L9.6 19.8z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" class="f"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  graph: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="5" cy="18" r="2.5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="19" cy="18" r="2.5" stroke="currentColor" stroke-width="2" fill="none"/><line x1="10.5" y1="7" x2="6.5" y2="16" stroke="currentColor" stroke-width="2"/><line x1="13.5" y1="7" x2="17.5" y2="16" stroke="currentColor" stroke-width="2"/><line x1="7.5" y1="18" x2="16.5" y2="18" stroke="currentColor" stroke-width="2"/></svg>',
  dragHandle: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="1.5" class="f"/><circle cx="9" cy="12" r="1.5" class="f"/><circle cx="9" cy="16" r="1.5" class="f"/><circle cx="15" cy="8" r="1.5" class="f"/><circle cx="15" cy="12" r="1.5" class="f"/><circle cx="15" cy="16" r="1.5" class="f"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  vault: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3v3.5M12 17.5v3M3 12h3.5M17.5 12h3"></path></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
};

export const DEFAULT_NOTEBOOKS: Notebook[] = [
  { id: 'design', name: 'Design Team', color: '#8470ff' },
  { id: 'work', name: 'Work', color: '#ff9d42' },
  { id: 'research', name: 'Research', color: '#23b8b8' },
  { id: 'personal', name: 'Personal', color: '#ff6a8f' }
];

export const TAGS: Tag[] = [
  { id: 'design', name: 'design', color: '#4cc2ff' },
  { id: 'ideas', name: 'ideas', color: '#ffb900' },
  { id: 'todo', name: 'to-do', color: '#6ccb5f' },
  { id: 'meeting', name: 'meeting', color: '#c58af9' },
  { id: 'reading', name: 'reading', color: '#ff8fb2' },
  { id: 'travel', name: 'travel', color: '#4de0c0' }
];

export const DEFAULT_NOTES: Note[] = [
  {
    id: 'n1',
    nb: 'design',
    tags: ['design', 'reading'],
    pinned: true,
    date: 'Today · 09:24',
    title: 'Fluent design deep-dive',
    body: '<h2>Why Fluent feels different</h2><p>Mica and Acrylic move chrome from <b>opaque bars</b> to ambient layers — the desktop becomes part of the app\u2019s palette.</p><h2>Materials at a glance</h2><ul><li><b>Mica</b> — long-lived, subtly opaque, samples the wallpaper once. Calm and cheap to render.</li><li><b>Acrylic</b> — blur + noise for short-lived surfaces. Flyouts only.</li><li><b>Reveal</b> — light that follows the pointer across lists.</li></ul><blockquote>\u201cMaterial is not decoration. It is hierarchy.\u201d</blockquote><p>Next: map editor chrome to these layers and audit the corner-radius grid (4 / 8 px).</p>',
    blocks: [],
    ord: 0,
    parentId: null
  },
  {
    id: 'n2',
    nb: 'design',
    tags: ['design'],
    pinned: false,
    date: 'Today · 08:05',
    title: 'Mica material spec notes',
    body: '<p>Sampling strategy: blurred wallpaper at low opacity over a base fill.</p><ul><li>Light base: <b>#F3F3F3</b> at ~82%</li><li>Dark base: <b>#202020</b> at ~80%</li></ul><p>Pair with a 1&nbsp;px inner highlight on the top edge so the surface \u201ccatches light\u201d.</p>',
    blocks: [],
    ord: 1,
    parentId: 'f1'
  },
  {
    id: 'n3',
    nb: 'work',
    tags: ['meeting'],
    pinned: true,
    date: 'Yesterday',
    title: 'Q3 roadmap sync',
    body: '<h2>Decisions</h2><ul><li>Ship sidebar collapse-by-default below 1280&nbsp;px</li><li>Adopt 8&nbsp;px corner radius for every floating card</li></ul><h2>Action items</h2><p>Maya — motion audit · Jonas — dark-mode contrast pass · Priya — resize breakpoint spec.</p>',
    blocks: [],
    ord: 2,
    parentId: null
  },
  {
    id: 'n4',
    nb: 'research',
    tags: ['reading'],
    pinned: false,
    date: 'Tuesday',
    title: 'Reading list — interface physics',
    body: '<p>Queued:</p><ul><li>Designing Fluid Interfaces — WWDC \u201918</li><li>The Details of UI Typography — WWDC \u201920</li><li>Interruptible-springs cheatsheet</li></ul><p>Key takeaway so far: <i>never animate from the target value — animate from the presentation value.</i></p>',
    blocks: [],
    ord: 3,
    parentId: null
  },
  {
    id: 'n5',
    nb: 'personal',
    tags: ['travel'],
    pinned: false,
    date: 'Monday',
    title: 'Kyoto — five days',
    body: '<h2>Must see</h2><ul><li>Fushimi Inari at sunrise (before crowds)</li><li>Nishiki market lunch crawl</li><li>Kiyomizu-dera at dusk</li></ul><p>Rail pass arrives Tuesday. Book the ryokan with the cedar bath.</p>',
    blocks: [],
    ord: 4,
    parentId: null
  },
  {
    id: 'n6',
    nb: 'design',
    tags: ['ideas'],
    pinned: false,
    date: 'Mar 18',
    title: 'Idea: gesture-first onboarding',
    body: '<p>First-run that teaches swipes <i>by being swipeable</i>: the onboarding cards themselves use the production spring curve.</p><blockquote>If the tutorial feels like the app, you don\u2019t need a tutorial.</blockquote>',
    blocks: [],
    ord: 5,
    parentId: 'f2'
  },
  {
    id: 'n7',
    nb: 'personal',
    tags: [],
    pinned: false,
    date: 'Mar 14',
    title: 'Weekly reflection',
    body: '<p>This week moved fast. Wins: prototype approved, zero regressions. Next week: protect two deep-work mornings.</p>',
    blocks: [],
    ord: 6,
    parentId: null
  },
  {
    id: 'n8',
    nb: 'design',
    tags: ['todo'],
    pinned: false,
    date: 'Mar 10',
    title: 'Prototype checklist',
    body: '<p>Before review:</p><ul><li>Mica tint verified in both themes</li><li>Acrylic flyouts anchored to triggers</li><li>Reduced-motion path tested</li><li>Resize: 1440 → 1024 → 720 → 480</li></ul>',
    blocks: [],
    ord: 7,
    parentId: 'f3'
  }
];

export const LOCAL_STORAGE_KEY = 'fluent_notes_app_notes';
export const CLIPS_KEY = 'fluent_notes_app_clips';
export const FOLDERS_KEY = 'fluent_notes_app_folders';
export const NOTEBOOKS_KEY = 'fluent_notes_app_notebooks';

export const DEFAULT_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Assets & Spec Docs', parentId: 'design', color: '#8470ff' },
  { id: 'f2', name: 'Sub-research', parentId: 'n1', color: '#23b8b8' },
  { id: 'f3', name: 'Nested Sub-folder', parentId: 'f2', color: '#ff6a8f' }
];

export const DEFAULT_CLIPS: TransientClip[] = [
  { id: 'c1', cluster: 'Interface Physics', content: 'Never animate from the target value — animate from the presentation value.', archived: false },
  { id: 'c2', cluster: 'Interface Physics', content: 'Spring animations should be interruptible and feel weighted.', archived: false },
  { id: 'c3', cluster: 'Material Design', content: 'Mica samples the desktop wallpaper once for long-lived surfaces.', archived: false },
  { id: 'c4', cluster: 'Material Design', content: 'Acrylic uses blur and noise for transient surfaces like menus.', archived: false }
];

export const winControlsHtml = `
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
