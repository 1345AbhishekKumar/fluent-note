export type BlockType =
  | 'paragraph' | 'heading1' | 'heading2' | 'heading3'
  | 'todo' | 'bullet' | 'numbered' | 'toggle' | 'toggle_h1' | 'toggle_h2' | 'toggle_h3'
  | 'quote' | 'divider' | 'code' | 'callout'
  | 'image' | 'video' | 'audio' | 'pdf' | 'bookmark' | 'file'
  | 'equation' | 'math' | 'mermaid'
  | 'toc' | 'breadcrumb' | 'template' | 'subpage'
  | 'column_list' | 'column';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  children: Block[];
  icon?: string;        // for callout custom emoji
  // Media / embed extras
  url?: string;        // for image, video, audio, pdf, bookmark
  fileName?: string;   // for file uploads
  language?: string;   // for code blocks
  codeWrap?: boolean;
  codeFullWidth?: boolean;
  mermaidMode?: 'diagram' | 'code' | 'split';
  collapsed?: boolean; // for toggle blocks
  textColor?: string;
  bgColor?: string;
  comment?: string;
  columnWidth?: number; // for multi-column layouts
  // Bookmark details
  bookmarkTitle?: string;
  bookmarkDesc?: string;
  bookmarkImage?: string;
  bookmarkIcon?: string;
}

export interface Note {
  id: string;
  nb: string;
  tags: string[];
  pinned: boolean;
  date: string;
  title: string;
  body: string;
  blocks: Block[];
  ord: number;
  authors?: string;
  journal?: string;
  year?: string;
  status?: 'transient' | 'permanent';
  archived?: boolean;
  parentId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
}

export interface Notebook {
  id: string;
  name: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TransientClip {
  id: string;
  cluster: string;
  content: string;
  archived: boolean;
}

export interface FlyoutItem {
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

export interface AppInstance {
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
  selectNote: (id: string | null, focusTitle?: boolean, skipHistory?: boolean) => void;
  renderMeta: () => void;
  getSelectedNoteId: () => string | null;
  selectFirstNote: () => void;
  showReceivedToast: (closureCount: number, title: string) => void;
  st: any;
  navigateNote: (direction: 'prev' | 'next') => void;
  closeVaultSwitcher?: () => void;
}
