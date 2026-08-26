import type { AppContext } from '../../../context';
import type { Block, BlockType, Note } from '../../../../types';
import { findBlockById, moveCaret } from '../../../../utils';
import { duplicateBlockWithNewIds } from '../editorHelpers';
import { saveAndSync } from '../../../../store';
import { 
  rerenderNote, focusNextBlockOrNew, openMediaFilePrompt, openUrlPopupEditor,
  openEmojiPicker, openDatePicker, openMentionPicker, openMathPopupEditor 
} from './editorPopups';
import { showAutocompletePicker } from './editorAutocompletePicker';
import { openHtmlSidebarEditor } from '../../htmlSidebarEditor';

export interface SlashItem {
  group?: string;
  type?: string;
  label?: string;
  desc?: string;
  icon?: string;
  aliases?: string[];
  danger?: boolean;
}

export const allSlashItems: SlashItem[] = [
  { group: 'Basic' },
  { type: 'paragraph',  label: 'Text',       desc: 'Plain text block',        icon: '<svg viewBox="0 0 24 24"><path d="M13 4v16M6 4h12M10 4v16"/></svg>',   aliases: ['text','plain'] },
  { type: 'heading1',   label: 'Heading 1',  desc: 'Large heading',           icon: '<svg viewBox="0 0 24 24"><path d="M4 12h8M4 6v12M12 6v12M17 12l2-2v8"/></svg>',  aliases: ['h1','#'] },
  { type: 'heading2',   label: 'Heading 2',  desc: 'Medium heading',          icon: '<svg viewBox="0 0 24 24"><path d="M4 12h8M4 6v12M12 6v12M20 18h-4a2 2 0 0 1 2-4h-2"/></svg>',  aliases: ['h2','##'] },
  { type: 'heading3',   label: 'Heading 3',  desc: 'Small heading',           icon: '<svg viewBox="0 0 24 24"><path d="M4 12h8M4 6v12M12 6v12M16 10h4l-2 3a2 2 0 1 1-2 3"/></svg>',  aliases: ['h3','###'] },
  { type: 'bullet',     label: 'Bullet',     desc: 'Bulleted list item',      icon: '<svg viewBox="0 0 24 24"><circle cx="4" cy="12" r="2" fill="currentColor"/><path d="M9 12h11"/></svg>',   aliases: ['bullet','bullets','list','lists'] },
  { type: 'numbered',   label: 'Numbered',   desc: 'Numbered list item',      icon: '<svg viewBox="0 0 24 24"><path d="M4 10V6l-1 1M4 18h3M9 12h11M9 6h11M9 18h11"/></svg>',  aliases: ['num','numbered','numbers','ol'] },
  { type: 'todo',       label: 'To-do',      desc: 'Checkbox task',           icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m9 12 2 2 4-4"/></svg>',   aliases: ['todo','todos','task','tasks','check'] },
  { type: 'toggle',     label: 'Toggle list',desc: 'Collapsible section',     icon: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',   aliases: ['toggle','collapse','>'] },
  { type: 'toggle_h1',  label: 'Toggle heading 1', desc: 'Large toggle header',  icon: '<svg viewBox="0 0 24 24"><path d="m6 9 4 3-4 3M13 15h7"/></svg>',  aliases: ['toggle h1','toggle1','h1 toggle'] },
  { type: 'toggle_h2',  label: 'Toggle heading 2', desc: 'Medium toggle header', icon: '<svg viewBox="0 0 24 24"><path d="m6 9 4 3-4 3M13 15h7"/></svg>',  aliases: ['toggle h2','toggle2','h2 toggle'] },
  { type: 'toggle_h3',  label: 'Toggle heading 3', desc: 'Small toggle header',  icon: '<svg viewBox="0 0 24 24"><path d="m6 9 4 3-4 3M13 15h7"/></svg>',  aliases: ['toggle h3','toggle3','h3 toggle'] },
  { type: 'quote',      label: 'Quote',      desc: 'Block quote',             icon: '<svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5H3v8h4c0 3-2 5-4 5zm11 0c3 0 7-1 7-8V5h-7v8h4c0 3-2 5-4 5z"/></svg>',   aliases: ['quote','quotes','blockquote','blockquotes'] },
  { type: 'divider',    label: 'Divider',    desc: 'Horizontal rule',         icon: '<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/></svg>',   aliases: ['div','divider','hr','separator'] },
  { type: 'callout',    label: 'Callout',    desc: 'Info box with icon',      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',  aliases: ['callout','info','box','alert'] },
  { type: 'subpage',    label: 'Page',       desc: 'Nested sub-page',         icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',  aliases: ['page','subpage'] },
  { type: 'subfolder',  label: 'Subfolder',  desc: 'Nested sub-folder',       icon: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',  aliases: ['folder','subfolder'] },
  { type: 'table',      label: 'Table',      desc: 'Simple table block',      icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',  aliases: ['table','simpletable','grid'] },
  { group: 'Media' },
  { type: 'image',      label: 'Image',      desc: 'Upload or embed image',   icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',  aliases: ['image','img','photo','picture'] },
  { type: 'video',      label: 'Video',      desc: 'Upload or embed video',   icon: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',  aliases: ['video','youtube','vimeo'] },
  { type: 'audio',      label: 'Audio',      desc: 'Upload or embed audio',   icon: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',  aliases: ['audio','music','sound','spotify'] },
  { type: 'pdf',        label: 'PDF',        desc: 'Embed a PDF from URL',    icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',  aliases: ['pdf'] },
  { type: 'bookmark',   label: 'Bookmark',   desc: 'Web bookmark card',       icon: '<svg viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',  aliases: ['book','bookmark','link','url'] },
  { type: 'code',       label: 'Code',       desc: 'Syntax-highlighted code', icon: '<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',  aliases: ['code','snippet','pre'] },
  { type: 'file',       label: 'File',       desc: 'Upload any file',         icon: '<svg viewBox="0 0 24 24"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',  aliases: ['file','upload','attach'] },
  { group: 'Inline & Links' },
  { type: 'link_page',    label: 'Link to page',    desc: 'Link to an existing note',      icon: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', aliases: ['link','page link','wikilink'] },
  { type: 'link_heading', label: 'Link to section', desc: 'Link to a specific heading',    icon: '<svg viewBox="0 0 24 24"><path d="M4 12h8M4 6v12M12 6v12M17 12l2-2v8"/></svg>', aliases: ['heading link','section link','anchor'] },
  { type: 'link_block',   label: 'Link to block',   desc: 'Link to a paragraph or block',  icon: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>', aliases: ['block link','block ref'] },
  { type: 'embed_page',   label: 'Embed page',      desc: 'Embed live preview card of page', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>', aliases: ['embed','transclude'] },
  { type: 'mention',    label: 'Mention',    desc: 'Mention a page or person',icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>',   aliases: ['mention','at','person'] },
  { type: 'date',       label: 'Date',       desc: 'Insert date/reminder',    icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',  aliases: ['date','reminder','time','calendar'] },
  { type: 'equation',   label: 'Equation',   desc: 'Inline TeX formula',      icon: '<svg viewBox="0 0 24 24"><path d="M4 4h6l4 16 4-16h2"/></svg>',   aliases: ['equation','eq','formula'] },
  { type: 'emoji',      label: 'Emoji',      desc: 'Insert emoji',            icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',  aliases: ['emoji','emoticon'] },
  { group: 'Advanced' },
  { type: 'duplicate',  label: 'Duplicate',  desc: 'Copy this block',         icon: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',   aliases: ['duplicate','copy','clone'] },
  { type: 'moveto',     label: 'Move to',    desc: 'Move block to a page',    icon: '<svg viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',   aliases: ['moveto','move'] },
  { type: 'delete',     label: 'Delete',     desc: 'Delete this block',       icon: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',   aliases: ['delete','remove'], danger: true },
  { type: 'toc',        label: 'Contents',   desc: 'Table of contents',       icon: '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',   aliases: ['toc','contents','tableofcontents'] },
  { type: 'template',   label: 'Template',   desc: 'Reusable block button',   icon: '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',  aliases: ['button','template'] },
  { type: 'breadcrumb', label: 'Breadcrumb', desc: 'Page location trail',     icon: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',   aliases: ['bread','breadcrumb','trail'] },
  { type: 'math',       label: 'Math',       desc: 'Block TeX equation',      icon: '<svg viewBox="0 0 24 24"><path d="M4 4h6l4 16 4-16h2"/></svg>',   aliases: ['math','latex','tex'] },
  { type: 'mermaid',    label: 'Mermaid Diagram', desc: 'Flowchart & UML diagram', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><line x1="10.5" y1="7" x2="6.5" y2="16"/><line x1="13.5" y1="7" x2="17.5" y2="16"/></svg>',  aliases: ['mermaid','diagram','flowchart','graph','uml'] },
  { type: 'html',       label: 'HTML Preview',    desc: 'Interactive HTML/CSS/JS sandbox', icon: '<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20"/></svg>',  aliases: ['html','htmlpreview','preview','web','sandbox'] },
  { group: 'Colors' },
  { type: 'color_blue', label: 'Blue text', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#0067c0"/></svg>', aliases: ['color blue','blue','text blue'] },
  { type: 'color_red', label: 'Red text', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#e05555"/></svg>', aliases: ['color red','red','text red'] },
  { type: 'color_green', label: 'Green text', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#10b981"/></svg>', aliases: ['color green','green','text green'] },
  { type: 'color_yellow', label: 'Yellow text', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#f59e0b"/></svg>', aliases: ['color yellow','yellow','text yellow'] },
  { type: 'color_purple', label: 'Purple text', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#8b5cf6"/></svg>', aliases: ['color purple','purple','text purple'] },
  { type: 'color_default', label: 'Default color', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>', aliases: ['color default','default','black'] },
  { type: 'bg_blue', label: 'Blue background', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="#0067c0"/></svg>', aliases: ['blue background','bg blue'] },
  { type: 'bg_red', label: 'Red background', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="#e05555"/></svg>', aliases: ['red background','bg red'] },
  { type: 'bg_green', label: 'Green background', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="#10b981"/></svg>', aliases: ['green background','bg green'] },
  { type: 'bg_yellow', label: 'Yellow background', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="#f59e0b"/></svg>', aliases: ['yellow background','bg yellow'] },
  { type: 'bg_purple', label: 'Purple background', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="#8b5cf6"/></svg>', aliases: ['purple background','bg purple'] },
  { type: 'bg_default', label: 'Default background', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>', aliases: ['bg default','default background'] }
];

let activeSlashBlockId: string | null = null;
let selectedSlashItemIndex = 0;
let visibleSlashItems: SlashItem[] = [];

export function getActiveSlashBlockId() { return activeSlashBlockId; }
export function getSelectedSlashItemIndex() { return selectedSlashItemIndex; }
export function setSelectedSlashItemIndex(idx: number) { selectedSlashItemIndex = idx; }
export function getVisibleSlashItems() { return visibleSlashItems; }

export function filterSlashItems(query: string): SlashItem[] {
  if (!query) return allSlashItems;
  const q = query.toLowerCase();
  
  if (q === 'turn') {
    const basicTypes = ['paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'todo', 'toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3', 'quote', 'divider', 'callout'];
    return [
      { group: 'Basic Conversions' },
      ...allSlashItems.filter(item => !item.group && basicTypes.includes(item.type || ''))
    ];
  }

  if (q === 'color') {
    return [
      { group: 'Colors' },
      ...allSlashItems.filter(item => !item.group && (item.type?.startsWith('color_') || item.type?.startsWith('bg_')))
    ];
  }

  const result: SlashItem[] = [];
  let lastGroup: SlashItem | null = null;
  for (const item of allSlashItems) {
    if (item.group) { lastGroup = item; continue; }
    const matchLabel = (item.label || '').toLowerCase().includes(q);
    const matchAlias = (item.aliases || []).some(a => a.toLowerCase().includes(q));
    if (matchLabel || matchAlias) {
      if (lastGroup && (result.length === 0 || result[result.length - 1].group !== lastGroup.group)) {
        result.push(lastGroup);
      }
      result.push(item);
    }
  }
  return result;
}

export function showSlashMenu(ctx: AppContext, blockEl: HTMLElement, textField: HTMLElement, query = '') {
  closeSlashMenu(ctx);
  selectedSlashItemIndex = 0;

  const filtered = filterSlashItems(query);
  visibleSlashItems = filtered;

  if (filtered.filter(i => !i.group).length === 0) return;

  const menu = document.createElement('div');
  menu.className = 'slash-menu absolute z-[1000] bg-acr border border-acr-brd rounded-xl shadow-lg backdrop-blur-md w-[260px] max-h-[340px] overflow-y-auto py-1.5 flex flex-col';

  let realIndex = 0;
  menu.innerHTML = filtered.map(item => {
    if (item.group) {
      return `<div class="slash-menu-group text-[10px] font-semibold uppercase tracking-wider text-text3 px-3 pt-2 pb-1">${item.group}</div>`;
    }
    const i = realIndex++;
    const dangerCls = item.danger ? ' danger text-[#e05555] hover:bg-[rgba(220,50,50,0.1)] hover:text-[#e03333] [&.selected]:bg-[rgba(220,50,50,0.1)] [&.selected]:text-[#e03333]' : '';
    return `<button class="slash-item flex items-center gap-[10px] px-3 py-1.5 text-[13px] text-text1 bg-transparent border-none text-left cursor-pointer w-full rounded-none hover:bg-accent-soft hover:text-accent [&.selected]:bg-accent-soft [&.selected]:text-accent ${dangerCls} ${i === selectedSlashItemIndex ? 'selected' : ''}" data-index="${i}">
      <span class="slash-item-icon text-[14px] opacity-85 min-w-[18px] text-center font-mono">${item.icon}</span>
      <div class="slash-item-info flex flex-col gap-[1px]">
        <span class="slash-item-label text-[13px] font-medium leading-[1.3]">${item.label}</span>
        <span class="slash-item-desc text-[11px] text-text3 leading-[1.2]">${item.desc || ''}</span>
      </div>
    </button>`;
  }).join('');

  const rect = textField.getBoundingClientRect();
  const innerRect = ctx.elements.edInner.getBoundingClientRect();
  menu.style.left = (rect.left - innerRect.left) + 'px';

  ctx.elements.edInner.appendChild(menu);

  const menuHeight = menu.offsetHeight || 340;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    menu.style.top = (rect.top - innerRect.top - menuHeight - 4) + 'px';
  } else {
    menu.style.top = (rect.bottom - innerRect.top + 4) + 'px';
  }
  activeSlashBlockId = blockEl.dataset.id!;

  menu.querySelectorAll('.slash-item').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const index = parseInt((btn as HTMLElement).dataset.index!);
      executeSlashCommand(ctx, index);
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });
}

export function closeSlashMenu(ctx?: AppContext) {
  const menu = document.querySelector('.slash-menu');
  if (menu) menu.remove();
  activeSlashBlockId = null;
  selectedSlashItemIndex = 0;
  visibleSlashItems = [];
}

export function updateSlashMenuSelection(menu: HTMLElement) {
  menu.querySelectorAll('.slash-item').forEach((btn, i) => {
    btn.classList.toggle('selected', i === selectedSlashItemIndex);
  });
  const sel = menu.querySelector('.slash-item.selected') as HTMLElement;
  if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
}

export function executeSlashCommand(ctx: AppContext, realIndex: number) {
  if (!activeSlashBlockId) return;
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;

  let count = 0;
  let chosenItem: SlashItem | undefined;
  for (const item of visibleSlashItems) {
    if (item.group) continue;
    if (count === realIndex) { chosenItem = item; break; }
    count++;
  }
  if (!chosenItem) return;

  const match = findBlockById(n.blocks, activeSlashBlockId);
  closeSlashMenu(ctx);
  if (!match) return;

  let content = match.block.content;
  const slashMatch = content.match(/(?:^|\s)\/[^\s]*$/);
  if (slashMatch && slashMatch.index !== undefined) {
    const slashIdx = slashMatch.index + (slashMatch[0].startsWith('/') ? 0 : slashMatch[0].indexOf('/'));
    content = content.substring(0, slashIdx).trim();
  } else {
    const slashPos = content.lastIndexOf('/');
    if (slashPos !== -1) content = content.substring(0, slashPos).trim();
    else content = content.trim();
  }
  match.block.content = content;

  const cmdType = chosenItem.type!;
  const blockId = match.block.id;

  switch (cmdType) {
    case 'subpage': {
      const newId = 'n-' + Math.random().toString(36).slice(2, 7);
      const subpageTitle = content || 'Untitled';
      const newNote: Note = {
        id: newId,
        nb: n.nb,
        tags: [],
        pinned: false,
        date: 'Just now',
        title: subpageTitle,
        body: `<h2>${subpageTitle}</h2><p></p>`,
        blocks: [{ id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: '', children: [] }],
        ord: 0,
        parentId: n.id
      };
      ctx.st.notes.unshift(newNote);
      match.block.type = 'subpage';
      match.block.content = subpageTitle;
      match.block.url = newId;
      saveAndSync();
      rerenderNote(ctx, n);
      ctx.selectNote(newId, true);
      return;
    }
    case 'subfolder': {
      match.parentList.splice(match.index, 1);
      if (n.blocks.length === 0) {
        n.blocks.push({ id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: '', children: [] });
      }
      saveAndSync();
      rerenderNote(ctx, n);
      ctx.newSubFolder(n.id);
      return;
    }

    case 'paragraph':
    case 'heading1': case 'heading2': case 'heading3':
    case 'bullet': case 'numbered':
      match.block.type = cmdType as BlockType;
      break;

    case 'callout':
    case 'quote': case 'toggle': case 'toggle_h1': case 'toggle_h2': case 'toggle_h3':
      match.block.type = cmdType as BlockType;
      if (cmdType === 'callout') match.block.icon = '💡';
      if (!match.block.children || match.block.children.length === 0) {
        match.block.children = [{ id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: '', children: [] }];
      }
      break;

    case 'todo':
      match.block.type = 'todo';
      match.block.checked = false;
      break;

    case 'table':
      match.block.type = 'table';
      match.block.content = JSON.stringify([
        ['Header 1', 'Header 2', 'Header 3'],
        ['', '', ''],
        ['', '', '']
      ]);
      break;

    case 'divider':
      match.block.type = 'divider';
      match.block.content = '';
      rerenderNote(ctx, n);
      focusNextBlockOrNew(ctx, n, match.index, match.parentList);
      return;

    case 'code':
      match.block.type = 'code';
      match.block.language = 'plaintext';
      break;

    case 'mermaid':
      match.block.type = 'mermaid';
      match.block.mermaidMode = 'split';
      if (!match.block.content || match.block.content.trim() === '') {
        match.block.content = `graph TD\n  A[Start] --> B{Is it working?}\n  B -->|Yes| C[Awesome!]\n  B -->|No| D[Debug]`;
      }
      break;

    case 'html':
      match.block.type = 'html';
      match.block.htmlMode = 'split';
      if (!match.block.content || match.block.content.trim() === '') {
        match.block.content = `<div style="text-align: center; padding: 20px; font-family: sans-serif;">\n  <h2 style="color: #3b82f6;">Hello HTML Preview! 🚀</h2>\n  <p>Edit HTML, CSS, and JS to see live changes.</p>\n  <button onclick="alert('Interactive JavaScript works!')" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Click Me</button>\n</div>`;
      }
      rerenderNote(ctx, n);
      openHtmlSidebarEditor(ctx, match.block.id);
      return;

    case 'image': case 'video': case 'audio': case 'file': {
      const isUrl = /^(https?:\/\/[^\s]+)$/i.test(content);
      if (isUrl) {
        match.block.type = cmdType as BlockType;
        match.block.url = content;
        match.block.content = cmdType;
        rerenderNote(ctx, n);
        focusNextBlockOrNew(ctx, n, match.index, match.parentList);
        return;
      }
      rerenderNote(ctx, n);
      openMediaFilePrompt(ctx, cmdType, match.block, n);
      return;
    }

    case 'pdf': case 'bookmark': {
      const isUrl = /^(https?:\/\/[^\s]+)$/i.test(content);
      if (isUrl) {
        match.block.type = cmdType as BlockType;
        match.block.url = content;
        match.block.content = content;
        rerenderNote(ctx, n);

        if (cmdType === 'bookmark' && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.fetchLinkMetadata) {
          window.electronAPI.fetchLinkMetadata(content)
            .then((meta) => {
              if (meta && meta.title) {
                match.block.bookmarkTitle = meta.title;
                match.block.bookmarkDesc = meta.description;
                match.block.bookmarkImage = meta.image;
                match.block.bookmarkIcon = meta.icon;
                rerenderNote(ctx, n);
              }
            })
            .catch((err) => {
              console.error('Error fetching link metadata:', err);
            });
        }
        focusNextBlockOrNew(ctx, n, match.index, match.parentList);
        return;
      }

      const originalState: Partial<Block> = {
        type: match.block.type,
        content: match.block.content,
        url: match.block.url,
        bookmarkTitle: match.block.bookmarkTitle,
        bookmarkDesc: match.block.bookmarkDesc,
        bookmarkImage: match.block.bookmarkImage,
        bookmarkIcon: match.block.bookmarkIcon
      };
      match.block.type = cmdType as BlockType;
      rerenderNote(ctx, n);
      const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
      if (blockEl) {
        openUrlPopupEditor(ctx, cmdType, match.block, n, blockEl, originalState);
      }
      return;
    }

    case 'emoji':
      openEmojiPicker(ctx, match.block, n, blockId);
      return;

    case 'date':
      openDatePicker(ctx, match.block, n);
      return;

    case 'equation': case 'math': {
      const originalState: Partial<Block> = {
        type: match.block.type,
        content: match.block.content
      };
      match.block.type = cmdType as BlockType;
      rerenderNote(ctx, n);
      const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
      if (blockEl) {
        openMathPopupEditor(ctx, match.block, n, blockEl, originalState);
      }
      return;
    }

    case 'mention':
      openMentionPicker(ctx, match.block, n, blockId);
      return;

    case 'duplicate': {
      const clone = duplicateBlockWithNewIds(match.block);
      match.parentList.splice(match.index + 1, 0, clone);
      rerenderNote(ctx, n);
      return;
    }

    case 'delete':
      match.parentList.splice(match.index, 1);
      if (n.blocks.length === 0) n.blocks.push({ id: 'b' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: '', children: [] });
      rerenderNote(ctx, n);
      return;

    case 'moveto': {
      const targets = ctx.st.notes.filter(x => x.id !== n.id);
      if (targets.length === 0) { ctx.toast('No other notes to move to', '', () => {}); return; }
      const picker = document.createElement('div');
      picker.className = 'slash-menu mention-picker';
      let selectedIndex = 0;
      const visibleTargets = targets.slice(0, 12);

      picker.innerHTML = visibleTargets.map((t, i) =>
        `<button class="slash-item ${i === 0 ? 'selected' : ''}" data-index="${i}"><span class="slash-item-icon">📄</span><span class="slash-item-label">${t.title || 'Untitled'}</span></button>`
      ).join('');
      const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
      const rect = blockEl?.getBoundingClientRect();
      const innerRect = ctx.elements.edInner.getBoundingClientRect();
      if (rect) {
        picker.style.left = (rect.left - innerRect.left) + 'px';
        picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
      }
      ctx.elements.edInner.appendChild(picker);

      const updateSelection = () => {
        picker.querySelectorAll('.slash-item').forEach((btn, idx) => {
          btn.classList.toggle('selected', idx === selectedIndex);
        });
        const sel = picker.querySelector('.slash-item.selected') as HTMLElement;
        if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
      };

      const doMove = (targetIdx: number) => {
        const target = visibleTargets[targetIdx];
        if (!target) return;
        const blockCopy = duplicateBlockWithNewIds(match.block);
        target.blocks.push(blockCopy);
        match.parentList.splice(match.index, 1);
        if (n.blocks.length === 0) n.blocks.push({ id: 'b-' + Math.random().toString(36).slice(2, 7), type: 'paragraph', content: '', children: [] });
        saveAndSync();
        rerenderNote(ctx, n);
        cleanup();
        ctx.toast(`Block moved to "${target.title || 'Untitled'}"`, '', () => {});
      };

      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % visibleTargets.length;
          updateSelection();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + visibleTargets.length) % visibleTargets.length;
          updateSelection();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          doMove(selectedIndex);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cleanup();
        }
      };

      const close = (e: MouseEvent) => {
        if (!picker.contains(e.target as Node)) {
          cleanup();
        }
      };

      const cleanup = () => {
        picker.remove();
        document.removeEventListener('keydown', handleKeydown, true);
        document.removeEventListener('click', close);
      };

      picker.querySelectorAll('.slash-item').forEach((btn, i) => {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          doMove(i);
        });
      });

      document.addEventListener('keydown', handleKeydown, true);
      setTimeout(() => {
        document.addEventListener('click', close);
      }, 0);
      return;
    }

    case 'toc':
      match.block.type = 'toc';
      match.block.content = '';
      rerenderNote(ctx, n);
      focusNextBlockOrNew(ctx, n, match.index, match.parentList);
      return;

    case 'breadcrumb':
      match.block.type = 'breadcrumb';
      match.block.content = '';
      rerenderNote(ctx, n);
      focusNextBlockOrNew(ctx, n, match.index, match.parentList);
      return;

    case 'template':
      match.block.type = 'template';
      match.block.content = 'Template button';
      break;

    case 'link_page': {
      rerenderNote(ctx, n);
      const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
      if (field) showAutocompletePicker(ctx, match.block, field, '[[', '');
      return;
    }
    case 'link_heading': {
      rerenderNote(ctx, n);
      const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
      if (field) showAutocompletePicker(ctx, match.block, field, '[[', '#');
      return;
    }
    case 'link_block': {
      rerenderNote(ctx, n);
      const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
      if (field) showAutocompletePicker(ctx, match.block, field, '[[', '#^');
      return;
    }
    case 'embed_page': {
      rerenderNote(ctx, n);
      const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
      if (field) showAutocompletePicker(ctx, match.block, field, '![[', '');
      return;
    }

    case 'color_blue':    match.block.textColor = '#2b579a'; ctx.st.lastUsedColor = '#2b579a'; break;
    case 'color_red':     match.block.textColor = '#b91d47'; ctx.st.lastUsedColor = '#b91d47'; break;
    case 'color_green':   match.block.textColor = '#00a300'; ctx.st.lastUsedColor = '#00a300'; break;
    case 'color_yellow':  match.block.textColor = '#d8c200'; ctx.st.lastUsedColor = '#d8c200'; break;
    case 'color_purple':  match.block.textColor = '#7e3878'; ctx.st.lastUsedColor = '#7e3878'; break;
    case 'color_default': match.block.textColor = ''; ctx.st.lastUsedColor = ''; break;
    case 'bg_blue':       match.block.bgColor = 'rgba(43,87,154,0.12)'; ctx.st.lastUsedBgColor = 'rgba(43,87,154,0.12)'; break;
    case 'bg_red':        match.block.bgColor = 'rgba(185,29,71,0.12)'; ctx.st.lastUsedBgColor = 'rgba(185,29,71,0.12)'; break;
    case 'bg_green':      match.block.bgColor = 'rgba(0,163,0,0.12)'; ctx.st.lastUsedBgColor = 'rgba(0,163,0,0.12)'; break;
    case 'bg_yellow':     match.block.bgColor = 'rgba(255,233,160,0.35)'; ctx.st.lastUsedBgColor = 'rgba(255,233,160,0.35)'; break;
    case 'bg_purple':     match.block.bgColor = 'rgba(126,56,120,0.12)'; ctx.st.lastUsedBgColor = 'rgba(126,56,120,0.12)'; break;
    case 'bg_default':    match.block.bgColor = ''; ctx.st.lastUsedBgColor = ''; break;

    default:
      return;
  }

  rerenderNote(ctx, n);
  const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
  if (field) moveCaret(field);
}
