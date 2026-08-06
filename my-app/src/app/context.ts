import type { AppInstance, Note, TransientClip, FlyoutItem, Folder } from '../types';

export interface AppContext {
  root: HTMLElement;
  api: AppInstance;
  st: {
    notes: Note[];
    folders: Folder[];
    expandedFolders: Set<string>;
    ordMin: number;
    sel: string | null;
    nb: string;
    folder: string | null;
    tag: string | null;
    quick: string;
    q: string;
    sort: string;
    snippets: boolean;
    sbUser: boolean;
    overlay: boolean;
    view: 'list' | 'grid' | 'graph';
    gridSort: 'title' | 'notebook' | 'tags' | 'date';
    gridSortAsc: boolean;
    lens: 'notes' | 'academic' | 'review';
    clips: TransientClip[];
    historyStack?: string[];
    historyIndex?: number;
    selectedBlockIds?: Set<string>;
    lastUsedColor?: string;
    lastUsedBgColor?: string;
    zoomFactor?: number;
  };
  elements: {
    searchIn: HTMLInputElement;
    burger: HTMLButtonElement;
    themeBtn: HTMLButtonElement;
    splitBtn: HTMLButtonElement;
    sidebar: HTMLElement;
    sbScroll: HTMLElement;
    nbsEl: HTMLElement;
    tagsEl: HTMLElement;
    lpTitle: HTMLElement;
    lpSub: HTMLElement;
    lpScroll: HTMLElement;
    actFilter: HTMLButtonElement;
    actSort: HTMLButtonElement;
    newNoteBtns: HTMLButtonElement[];
    edBack: HTMLButtonElement;
    tools: HTMLElement;
    styleBtn: HTMLButtonElement;
    styleLbl: HTMLElement;
    pinBtn: HTMLButtonElement;
    edMore: HTMLButtonElement;
    edScroll: HTMLElement;
    edInner: HTMLElement;
    edTitle: HTMLElement;
    edBody: HTMLElement;
    edEmpty: HTMLElement;
    metaNb: HTMLButtonElement;
    metaDate: HTMLElement;
    metaTags: HTMLButtonElement;
    mtTxt: HTMLElement;
    wcEl: HTMLElement;
    saveEl: HTMLElement;
    saveT: HTMLElement;
    fly: HTMLElement;
    toastEl: HTMLElement;
    tMsg: HTMLElement;
    tAct: HTMLButtonElement;
    scrim: HTMLElement;
  };
  
  // Shared actions
  toast: (msg: string, actLabel?: string, fn?: () => void) => void;
  markSaving: () => void;
  selectNote: (id: string | null, focusTitle?: boolean, skipHistory?: boolean) => void;
  renderSidebar: () => void;
  renderList: () => void;
  renderEditor: () => void;
  renderMeta: () => void;
  renderReviewInbox: () => void;
  switchLens: (lens: 'notes' | 'academic' | 'review') => void;
  startP2PShare: (target: Note | { type: 'notebook' | 'tag'; id: string; name: string }) => void;
  newNote: () => void;
  newSubNote: (parentId: string) => void;
  newSubFolder: (parentId: string) => void;
  deleteNote: (n: Note) => void;
  closeOverlayIf: () => void;
  syncToolbar: () => void;
  showPrompt: (title: string, placeholder: string, defaultValue: string, callback: (val: string | null) => void) => void;
  
  // Flyouts
  showFlyout: (menu: HTMLElement) => void;
  hideFlyout: () => void;
  openFly: (anchor: HTMLElement, items: FlyoutItem[]) => void;
  openFlyAt: (cx: number, cy: number, items: FlyoutItem[]) => void;
}
