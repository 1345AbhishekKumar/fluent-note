import type { AppContext } from '../context';
import type { Block, BlockType, Note, FlyoutItem } from '../../types';
import { 
  findBlockById, getBlockLevel, flattenBlocks, flattenVisibleBlocks,
  isCaretAtStart, moveCaret, resolveNoteId, genId, renderBlockTree, setEdBodyHtml,
  esc
} from '../../utils';
import { saveAndSyncContent, saveAndSync } from '../../store';

function duplicateBlockWithNewIds(block: Block): Block {
  return {
    ...block,
    id: genId(),
    children: (block.children || []).map(child => duplicateBlockWithNewIds(child))
  };
}

function duplicateBlocksWithNewIds(blocks: Block[]): Block[] {
  return blocks.map(b => duplicateBlockWithNewIds(b));
}

export function initEditorKeyEvents(ctx: AppContext) {
  const isToggleType = (t: string) => ['toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3'].includes(t);
  const isNonTextFieldBlock = (t: string) => ['divider', 'image', 'video', 'audio', 'pdf', 'bookmark', 'file', 'toc', 'breadcrumb', 'math', 'equation'].includes(t);

  // Helper to get next Wednesday date
  function getNextWednesday() {
    const today = new Date();
    const day = today.getDay();
    const daysUntilWednesday = (3 - day + 7) % 7 || 7;
    const nextWed = new Date(today.getTime() + daysUntilWednesday * 86400000);
    return nextWed.toISOString().slice(0, 10);
  }

  // Helper to insert text at caret position in contenteditable
  function insertTextAtCaret(el: HTMLElement, val: string) {
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(val);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.textContent = (el.textContent || '') + val;
    }

    // Synchronize content to memory immediately
    const blockEl = el.closest('.block-wrapper') as HTMLElement;
    if (blockEl) {
      const blockId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (n) {
        const match = findBlockById(n.blocks, blockId);
        if (match) {
          match.block.content = el.textContent || '';
        }
      }
    }
  }

  // Rerender selected block outlines
  function rerenderSelectionStyles() {
    const selectedIds = ctx.st.selectedBlockIds || new Set<string>();
    ctx.elements.edBody.querySelectorAll('.block-wrapper').forEach(el => {
      const bId = (el as HTMLElement).dataset.id;
      if (bId) {
        el.classList.toggle('selected', selectedIds.has(bId));
      }
    });
  }

  let activePickerEl: HTMLElement | null = null;
  let activePickerBlockId: string | null = null;
  let activePickerSymbol: string | null = null;
  let selectedPickerIndex = 0;
  let visiblePickerItems: any[] = [];

  function showAutocompletePicker(block: Block, textField: HTMLElement, symbol: string, query = '') {
    closeAutocompletePicker();
    selectedPickerIndex = 0;
    activePickerSymbol = symbol;
    activePickerBlockId = block.id;

    const picker = document.createElement('div');
    picker.className = 'slash-menu autocomplete-picker';

    let items: { label: string; desc?: string; icon: string; action: () => void }[] = [];
    
    if (symbol === '@') {
      const members = [
        { name: 'John Doe', role: 'Collaborator' },
        { name: 'Jane Smith', role: 'Researcher' },
        { name: 'Alice Johnson', role: 'Writer' }
      ];
      members.forEach(m => {
        if (m.name.toLowerCase().includes(query.toLowerCase())) {
          items.push({
            label: m.name,
            desc: m.role,
            icon: '👤',
            action: () => {
              insertTextAtCaret(textField, `@${m.name}`);
              saveAndSyncContent();
            }
          });
        }
      });

      ctx.st.notes.forEach(x => {
        if (x.id !== ctx.st.sel && (x.title || '').toLowerCase().includes(query.toLowerCase())) {
          items.push({
            label: x.title || 'Untitled',
            desc: 'Link to note',
            icon: '📄',
            action: () => {
              insertTextAtCaret(textField, `[[${x.title || 'Untitled'}]]`);
              saveAndSyncContent();
            }
          });
        }
      });

      const dateOptions = [
        { label: 'Today', val: new Date().toISOString().slice(0, 10) },
        { label: 'Yesterday', val: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
        { label: 'Tomorrow', val: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
        { label: 'Next Wednesday', val: getNextWednesday() }
      ];
      dateOptions.forEach(d => {
        if (d.label.toLowerCase().includes(query.toLowerCase())) {
          items.push({
            label: d.label,
            desc: d.val,
            icon: '📅',
            action: () => {
              insertTextAtCaret(textField, `📅 ${d.val}`);
              saveAndSyncContent();
            }
          });
        }
      });

      if ('add a reminder'.includes(query.toLowerCase()) || 'remind'.includes(query.toLowerCase())) {
        items.push({
          label: 'Add a reminder',
          desc: 'Get notified at a specific time',
          icon: '⏰',
          action: () => {
            const time = prompt('Enter reminder time (YYYY-MM-DD HH:MM):');
            if (time) {
              insertTextAtCaret(textField, `⏰ Reminder: ${time}`);
              ctx.toast(`Reminder set for ${time}`);
              saveAndSyncContent();
            }
          }
        });
      }
    } else if (symbol === '[[' || symbol === '+') {
      ctx.st.notes.forEach(x => {
        if (x.id !== ctx.st.sel && (x.title || '').toLowerCase().includes(query.toLowerCase())) {
          items.push({
            label: x.title || 'Untitled',
            desc: 'Link to note',
            icon: '📄',
            action: () => {
              insertTextAtCaret(textField, `[[${x.title || 'Untitled'}]]`);
              saveAndSyncContent();
            }
          });
        }
      });

      if ('add new sub-page'.includes(query.toLowerCase()) || 'subpage'.includes(query.toLowerCase())) {
        items.push({
          label: 'Add new sub-page',
          desc: 'Create and nest a sub-page here',
          icon: '➕',
          action: () => {
            const title = query || 'New Subpage';
            const parentN = ctx.st.notes.find(x => x.id === ctx.st.sel);
            if (parentN) {
              const newN: Note = {
                id: 'n' + Math.random().toString(36).slice(2, 7),
                title: title,
                body: '',
                blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
                nb: parentN.nb,
                tags: [],
                pinned: false,
                date: 'Just now',
                ord: --ctx.st.ordMin,
                parentId: parentN.id
              };
              ctx.st.notes.unshift(newN);
              saveAndSync();
              insertTextAtCaret(textField, `[[${title}]]`);
            }
          }
        });
      }

      if ('add new page in...'.includes(query.toLowerCase()) || 'page elsewhere'.includes(query.toLowerCase())) {
        items.push({
          label: 'Add new page in...',
          desc: 'Create new page in another folder',
          icon: '↗',
          action: () => {
            const title = query || 'New Page';
            ctx.showPrompt('Enter parent folder/note ID or notebook name:', 'design', 'design', parentId => {
              if (parentId) {
                const newN: Note = {
                  id: 'n' + Math.random().toString(36).slice(2, 7),
                  title: title,
                  body: '',
                  blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
                  nb: 'design',
                  tags: [],
                  pinned: false,
                  date: 'Just now',
                  ord: --ctx.st.ordMin,
                  parentId: parentId
                };
                ctx.st.notes.unshift(newN);
                saveAndSync();
                insertTextAtCaret(textField, `[[${title}]]`);
              }
            });
          }
        });
      }
    }

    if (items.length === 0) return;
    visiblePickerItems = items;

    picker.innerHTML = items.map((item, idx) => `
      <button class="slash-item ${idx === selectedPickerIndex ? 'selected' : ''}" data-index="${idx}">
        <span class="slash-item-icon">${item.icon}</span>
        <div class="slash-item-info">
          <span class="slash-item-label">${item.label}</span>
          <span class="slash-item-desc">${item.desc || ''}</span>
        </div>
      </button>
    `).join('');

    const rect = textField.getBoundingClientRect();
    const innerRect = ctx.elements.edInner.getBoundingClientRect();
    picker.style.left = (rect.left - innerRect.left) + 'px';
    picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';

    ctx.elements.edInner.appendChild(picker);
    activePickerEl = picker;

    picker.querySelectorAll('.slash-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.index!);
        executePickerCommand(index);
      });
    });
  }

  function updatePickerSelection(menu: HTMLElement) {
    menu.querySelectorAll('.slash-item').forEach((btn, i) => {
      btn.classList.toggle('selected', i === selectedPickerIndex);
    });
    const sel = menu.querySelector('.slash-item.selected') as HTMLElement;
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function executePickerCommand(index: number) {
    if (index >= 0 && index < visiblePickerItems.length) {
      const item = visiblePickerItems[index];
      const activeEl = document.activeElement as HTMLElement;
      const blockId = activePickerBlockId;
      
      if (activeEl && activeEl.classList.contains('block-text-field')) {
        const text = activeEl.textContent || '';
        const symbol = activePickerSymbol || '';
        const lastIdx = text.lastIndexOf(symbol);
        if (lastIdx !== -1) {
          activeEl.textContent = text.slice(0, lastIdx);
          
          // Sync textContent change to memory!
          if (blockId) {
            const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
            if (n) {
              const match = findBlockById(n.blocks, blockId);
              if (match) {
                match.block.content = activeEl.textContent || '';
              }
            }
          }
        }
      }
      
      item.action();
      
      // Sync action's text changes to memory and rerender to display badges immediately!
      if (blockId) {
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, blockId);
          if (match && activeEl) {
            match.block.content = activeEl.textContent || '';
            rerender(n);
            const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
            if (field) moveCaret(field);
          }
        }
      }
    }
    closeAutocompletePicker();
  }

  function closeAutocompletePicker() {
    if (activePickerEl) {
      activePickerEl.remove();
      activePickerEl = null;
    }
    activePickerBlockId = null;
    activePickerSymbol = null;
    selectedPickerIndex = 0;
    visiblePickerItems = [];
  }

  // Inner helpers for block mutations
  function findParentBlockOfList(currentList: Block[], targetList: Block[], parentBlock: Block): { parentList: Block[], block: Block } | null {
    for (const block of currentList) {
      if (block.children === targetList) {
        return { parentList: currentList, block: parentBlock };
      }
      const match = findParentBlockOfList(block.children, targetList, block);
      if (match) return match;
    }
    return null;
  }

  let activeSlashBlockId: string | null = null;
  let selectedSlashItemIndex = 0;
  // Track currently shown filtered items (mirrors what's rendered in the menu)
  let visibleSlashItems: typeof allSlashItems = [];

  // ── Full slash item catalogue ─────────────────────────────────────────────
  interface SlashItem {
    group?: string;         // section header (no type / action)
    type?: string;          // block type or command
    label?: string;
    desc?: string;
    icon?: string;
    aliases?: string[];     // extra trigger keywords
    danger?: boolean;
  }
  const allSlashItems: SlashItem[] = [
    // ── BASIC ─────────────────────────────────────────────────────────────
    { group: 'Basic' },
    { type: 'paragraph',  label: 'Text',       desc: 'Plain text block',        icon: '¶',   aliases: ['text','plain'] },
    { type: 'heading1',   label: 'Heading 1',  desc: 'Large heading',           icon: 'H1',  aliases: ['h1','#'] },
    { type: 'heading2',   label: 'Heading 2',  desc: 'Medium heading',          icon: 'H2',  aliases: ['h2','##'] },
    { type: 'heading3',   label: 'Heading 3',  desc: 'Small heading',           icon: 'H3',  aliases: ['h3','###'] },
    { type: 'bullet',     label: 'Bullet',     desc: 'Bulleted list item',      icon: '•',   aliases: ['bullet','list'] },
    { type: 'numbered',   label: 'Numbered',   desc: 'Numbered list item',      icon: '1.',  aliases: ['num','numbered','ol'] },
    { type: 'todo',       label: 'To-do',      desc: 'Checkbox task',           icon: '☑',   aliases: ['todo','task','check'] },
    { type: 'toggle',     label: 'Toggle list',desc: 'Collapsible section',     icon: '▶',   aliases: ['toggle','collapse','>'] },
    { type: 'toggle_h1',  label: 'Toggle heading 1', desc: 'Large toggle header',  icon: '▶1',  aliases: ['toggle h1','toggle1','h1 toggle'] },
    { type: 'toggle_h2',  label: 'Toggle heading 2', desc: 'Medium toggle header', icon: '▶2',  aliases: ['toggle h2','toggle2','h2 toggle'] },
    { type: 'toggle_h3',  label: 'Toggle heading 3', desc: 'Small toggle header',  icon: '▶3',  aliases: ['toggle h3','toggle3','h3 toggle'] },
    { type: 'quote',      label: 'Quote',      desc: 'Block quote',             icon: '❝',   aliases: ['quote','blockquote'] },
    { type: 'divider',    label: 'Divider',    desc: 'Horizontal rule',         icon: '—',   aliases: ['div','divider','hr','separator'] },
    { type: 'callout',    label: 'Callout',    desc: 'Info box with icon',      icon: '💡',  aliases: ['callout','info','box','alert'] },
    { type: 'subpage',    label: 'Page',       desc: 'Nested sub-page',         icon: '📄',  aliases: ['page','subpage'] },
    { type: 'subfolder',  label: 'Subfolder',  desc: 'Nested sub-folder',       icon: '📁',  aliases: ['folder','subfolder'] },
    // ── MEDIA ─────────────────────────────────────────────────────────────
    { group: 'Media' },
    { type: 'image',      label: 'Image',      desc: 'Upload or embed image',   icon: '🖼',  aliases: ['image','img','photo','picture'] },
    { type: 'video',      label: 'Video',      desc: 'Upload or embed video',   icon: '🎬',  aliases: ['video','youtube','vimeo'] },
    { type: 'audio',      label: 'Audio',      desc: 'Upload or embed audio',   icon: '🎵',  aliases: ['audio','music','sound','spotify'] },
    { type: 'pdf',        label: 'PDF',        desc: 'Embed a PDF from URL',    icon: '📄',  aliases: ['pdf'] },
    { type: 'bookmark',   label: 'Bookmark',   desc: 'Web bookmark card',       icon: '🔖',  aliases: ['book','bookmark','link','url'] },
    { type: 'code',       label: 'Code',       desc: 'Syntax-highlighted code', icon: '</>',  aliases: ['code','snippet','pre'] },
    { type: 'file',       label: 'File',       desc: 'Upload any file',         icon: '📎',  aliases: ['file','upload','attach'] },
    // ── INLINE ────────────────────────────────────────────────────────────
    { group: 'Inline' },
    { type: 'mention',    label: 'Mention',    desc: 'Mention a page or person',icon: '@',   aliases: ['mention','at','person'] },
    { type: 'date',       label: 'Date',       desc: 'Insert date/reminder',    icon: '📅',  aliases: ['date','reminder','time','calendar'] },
    { type: 'equation',   label: 'Equation',   desc: 'Inline TeX formula',      icon: '∑',   aliases: ['equation','eq','formula'] },
    { type: 'emoji',      label: 'Emoji',      desc: 'Insert emoji',            icon: '😊',  aliases: ['emoji','emoticon'] },
    // ── ADVANCED ──────────────────────────────────────────────────────────
    { group: 'Advanced' },
    { type: 'duplicate',  label: 'Duplicate',  desc: 'Copy this block',         icon: '⧉',   aliases: ['duplicate','copy','clone'] },
    { type: 'moveto',     label: 'Move to',    desc: 'Move block to a page',    icon: '↗',   aliases: ['moveto','move'] },
    { type: 'delete',     label: 'Delete',     desc: 'Delete this block',       icon: '🗑',  aliases: ['delete','remove'], danger: true },
    { type: 'toc',        label: 'Contents',   desc: 'Table of contents',       icon: '≡',   aliases: ['toc','contents','tableofcontents'] },
    { type: 'template',   label: 'Template',   desc: 'Reusable block button',   icon: '🔁',  aliases: ['button','template'] },
    { type: 'breadcrumb', label: 'Breadcrumb', desc: 'Page location trail',     icon: '›',   aliases: ['bread','breadcrumb','trail'] },
    { type: 'math',       label: 'Math',       desc: 'Block TeX equation',      icon: '∫',   aliases: ['math','latex','tex'] },
    // ── COLORS ────────────────────────────────────────────────────────────
    { group: 'Colors' },
    { type: 'color_blue', label: 'Blue text', icon: '🎨', aliases: ['color blue','blue','text blue'] },
    { type: 'color_red', label: 'Red text', icon: '🎨', aliases: ['color red','red','text red'] },
    { type: 'color_green', label: 'Green text', icon: '🎨', aliases: ['color green','green','text green'] },
    { type: 'color_yellow', label: 'Yellow text', icon: '🎨', aliases: ['color yellow','yellow','text yellow'] },
    { type: 'color_purple', label: 'Purple text', icon: '🎨', aliases: ['color purple','purple','text purple'] },
    { type: 'color_default', label: 'Default color', icon: '🎨', aliases: ['color default','default','black'] },
    { type: 'bg_blue', label: 'Blue background', icon: '🎨', aliases: ['blue background','bg blue'] },
    { type: 'bg_red', label: 'Red background', icon: '🎨', aliases: ['red background','bg red'] },
    { type: 'bg_green', label: 'Green background', icon: '🎨', aliases: ['green background','bg green'] },
    { type: 'bg_yellow', label: 'Yellow background', icon: '🎨', aliases: ['yellow background','bg yellow'] },
    { type: 'bg_purple', label: 'Purple background', icon: '🎨', aliases: ['purple background','bg purple'] },
    { type: 'bg_default', label: 'Default background', icon: '🎨', aliases: ['bg default','default background'] }
  ];

  // ── Emoji set (simple grid) ───────────────────────────────────────────────
  const EMOJI_LIST = ['😀','😂','🥰','😎','🤔','😢','🎉','🔥','💡','✅','❌','⭐','🚀','🌿','🎵','📚','💻','🔗','📝','🗑','⚡','🌈','🎨','🏆','📌','🔒','🌍','⚙️','🧠','💬'];

  function filterSlashItems(query: string): SlashItem[] {
    if (!query) return allSlashItems;
    const q = query.toLowerCase();
    
    // /turn support: filters to basic block styles
    if (q === 'turn') {
      const basicTypes = ['paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'todo', 'toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3', 'quote', 'divider', 'callout'];
      return [
        { group: 'Basic Conversions' },
        ...allSlashItems.filter(item => !item.group && basicTypes.includes(item.type || ''))
      ];
    }

    // /color support: filters to color options
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
        // Add group header once if we haven't yet
        if (lastGroup && (result.length === 0 || result[result.length - 1].group !== lastGroup.group)) {
          result.push(lastGroup);
        }
        result.push(item);
      }
    }
    return result;
  }

  function focusNextBlockOrNew(n: Note, index: number, parentList: Block[]) {
    if (index + 1 < parentList.length) {
      const nextBlock = parentList[index + 1];
      setTimeout(() => {
        const field = ctx.elements.edBody.querySelector(`[data-id="${nextBlock.id}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field);
      }, 50);
    } else {
      const newBlockId = genId();
      const newBlock: Block = { id: newBlockId, type: 'paragraph', content: '', children: [] };
      parentList.push(newBlock);
      rerender(n);
      setTimeout(() => {
        const field = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field);
      }, 50);
    }
  }

  function showSlashMenu(blockEl: HTMLElement, textField: HTMLElement, query = '') {
    closeSlashMenu();
    selectedSlashItemIndex = 0;

    const filtered = filterSlashItems(query);
    visibleSlashItems = filtered;

    if (filtered.filter(i => !i.group).length === 0) return; // nothing matched

    const menu = document.createElement('div');
    menu.className = 'slash-menu';

    let realIndex = 0; // index among non-group items only
    menu.innerHTML = filtered.map(item => {
      if (item.group) {
        return `<div class="slash-menu-group">${item.group}</div>`;
      }
      const i = realIndex++;
      const dangerCls = item.danger ? ' danger' : '';
      return `<button class="slash-item${dangerCls} ${i === selectedSlashItemIndex ? 'selected' : ''}" data-index="${i}">
        <span class="slash-item-icon">${item.icon}</span>
        <div class="slash-item-info">
          <span class="slash-item-label">${item.label}</span>
          <span class="slash-item-desc">${item.desc || ''}</span>
        </div>
      </button>`;
    }).join('');

    const rect = textField.getBoundingClientRect();
    const innerRect = ctx.elements.edInner.getBoundingClientRect();
    menu.style.left = (rect.left - innerRect.left) + 'px';
    menu.style.top = (rect.bottom - innerRect.top + 4) + 'px';

    ctx.elements.edInner.appendChild(menu);
    activeSlashBlockId = blockEl.dataset.id!;

    menu.querySelectorAll('.slash-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.index!);
        executeSlashCommand(index);
      });
    });
  }

  function closeSlashMenu() {
    const menu = ctx.root.querySelector('.slash-menu');
    if (menu) menu.remove();
    activeSlashBlockId = null;
    selectedSlashItemIndex = 0;
    visibleSlashItems = [];
  }

  function openLanguagePicker(btn: HTMLElement, blockId: string) {
    closeLanguagePicker();

    const popup = document.createElement('div');
    popup.className = 'language-picker-popup';
    popup.innerHTML = `
      <div class="lang-search-wrapper">
        <input type="text" class="lang-search-input" placeholder="Search for a language..." />
      </div>
      <div class="lang-list-container"></div>
    `;

    const btnRect = btn.getBoundingClientRect();
    const innerRect = ctx.elements.edInner.getBoundingClientRect();
    popup.style.left = Math.max(8, btnRect.right - innerRect.left - 200) + 'px';
    popup.style.top = (btnRect.bottom - innerRect.top + 4) + 'px';

    ctx.elements.edInner.appendChild(popup);

    const searchInput = popup.querySelector('.lang-search-input') as HTMLInputElement;
    const listContainer = popup.querySelector('.lang-list-container') as HTMLElement;

    const langOptions = [
      { val: 'plaintext', label: 'Plain Text' },
      { val: 'javascript', label: 'JavaScript' },
      { val: 'typescript', label: 'TypeScript' },
      { val: 'html', label: 'HTML' },
      { val: 'css', label: 'CSS' },
      { val: 'json', label: 'JSON' },
      { val: 'python', label: 'Python' },
      { val: 'sql', label: 'SQL' },
      { val: 'cpp', label: 'C++' },
      { val: 'java', label: 'Java' },
      { val: 'rust', label: 'Rust' },
      // Frameworks
      { val: 'javascript', label: 'React (JSX)' },
      { val: 'typescript', label: 'React (TSX)' },
      { val: 'html', label: 'Vue' },
      { val: 'html', label: 'Angular' },
      { val: 'html', label: 'Svelte' },
      { val: 'typescript', label: 'Next.js' },
      { val: 'typescript', label: 'Nuxt.js' },
      { val: 'python', label: 'Django' },
      { val: 'python', label: 'Flask' },
      { val: 'javascript', label: 'Express' },
      { val: 'java', label: 'Spring' },
      { val: 'php', label: 'Laravel' },
      { val: 'ruby', label: 'Ruby on Rails' },
      // Additional languages
      { val: 'c', label: 'C' },
      { val: 'csharp', label: 'C#' },
      { val: 'dart', label: 'Dart' },
      { val: 'docker', label: 'Docker' },
      { val: 'elixir', label: 'Elixir' },
      { val: 'erlang', label: 'Erlang' },
      { val: 'go', label: 'Go' },
      { val: 'graphql', label: 'GraphQL' },
      { val: 'groovy', label: 'Groovy' },
      { val: 'haskell', label: 'Haskell' },
      { val: 'kotlin', label: 'Kotlin' },
      { val: 'latex', label: 'LaTeX' },
      { val: 'lisp', label: 'Lisp' },
      { val: 'lua', label: 'Lua' },
      { val: 'markdown', label: 'Markdown' },
      { val: 'matlab', label: 'Matlab' },
      { val: 'nix', label: 'Nix' },
      { val: 'objectivec', label: 'Objective-C' },
      { val: 'ocaml', label: 'OCaml' },
      { val: 'php', label: 'PHP' },
      { val: 'powershell', label: 'PowerShell' },
      { val: 'ruby', label: 'Ruby' },
      { val: 'scala', label: 'Scala' },
      { val: 'swift', label: 'Swift' },
      { val: 'verilog', label: 'Verilog' },
      { val: 'vhdl', label: 'VHDL' },
      { val: 'xml', label: 'XML' },
      { val: 'yaml', label: 'YAML' }
    ];

    let selectedIndex = 0;
    let filteredOptions = [...langOptions];

    function renderList() {
      listContainer.innerHTML = filteredOptions.map((opt, i) => `
        <button class="lang-picker-item ${i === selectedIndex ? 'active' : ''}" data-val="${opt.val}" data-index="${i}">
          ${opt.label}
        </button>
      `).join('');

      listContainer.querySelectorAll('.lang-picker-item').forEach(item => {
        item.addEventListener('click', () => {
          const val = (item as HTMLElement).dataset.val!;
          selectLanguage(val);
        });
      });
    }

    function selectLanguage(val: string) {
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, blockId);
      if (match) {
        match.block.language = val;
        rerender(n);
        saveAndSyncContent();
        ctx.markSaving();
      }
      closeLanguagePicker();
    }

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      filteredOptions = langOptions.filter(o => 
        o.label.toLowerCase().includes(query) || o.val.toLowerCase().includes(query)
      );
      selectedIndex = 0;
      renderList();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredOptions.length;
        renderList();
        scrollToActiveItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + filteredOptions.length) % filteredOptions.length;
        renderList();
        scrollToActiveItem();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          selectLanguage(filteredOptions[selectedIndex].val);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeLanguagePicker();
      }
    });

    function scrollToActiveItem() {
      const activeEl = listContainer.querySelector('.lang-picker-item.active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }

    setTimeout(() => searchInput.focus(), 50);
    renderList();
  }

  function closeLanguagePicker() {
    const picker = ctx.root.querySelector('.language-picker-popup');
    if (picker) picker.remove();
  }

  function updateSlashMenuSelection(menu: HTMLElement) {
    menu.querySelectorAll('.slash-item').forEach((btn, i) => {
      btn.classList.toggle('selected', i === selectedSlashItemIndex);
    });
    // Ensure selected item is in view
    const sel = menu.querySelector('.slash-item.selected') as HTMLElement;
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  // ── Helpers for inline / advanced commands ────────────────────────────────
  function openUrlPopupEditor(cmdType: string, block: Block, n: Note, anchorEl: HTMLElement, originalState?: Partial<Block>) {
    ctx.root.querySelector('.url-popup-editor')?.remove();

    const popup = document.createElement('div');
    popup.className = 'url-popup-editor bookmark-popup-editor';

    const buttonText = cmdType === 'bookmark' ? 'Create bookmark' : 'Embed PDF';
    const placeholderText = 'Paste in https://...';
    const descriptionText = cmdType === 'bookmark' 
      ? 'Create a visual bookmark from a link.' 
      : 'Embed a PDF file from a URL.';

    if (cmdType === 'pdf') {
      popup.innerHTML = `
        <button class="bookmark-popup-btn pdf-upload-btn" style="background: var(--nav-h); color: var(--text1); border: 1px solid var(--pane-brd); margin-bottom: 8px;">Upload local PDF</button>
        <div style="text-align: center; margin: 4px 0 8px; color: var(--text3); font-size: 11px; font-weight: 500;">OR</div>
        <input type="text" class="bookmark-popup-input" placeholder="${placeholderText}" value="${block.url || ''}" />
        <button class="bookmark-popup-btn bookmark-action-btn">${buttonText}</button>
        <p class="bookmark-popup-desc" style="margin-top: 8px;">${descriptionText}</p>
      `;
    } else {
      popup.innerHTML = `
        <input type="text" class="bookmark-popup-input" placeholder="${placeholderText}" value="${block.url || ''}" />
        <button class="bookmark-popup-btn bookmark-action-btn">${buttonText}</button>
        <p class="bookmark-popup-desc">${descriptionText}</p>
      `;
    }

    const rect = anchorEl.getBoundingClientRect();
    const parentRect = ctx.elements.edInner.getBoundingClientRect();
    
    popup.style.left = `${rect.left - parentRect.left}px`;
    popup.style.top = `${rect.bottom - parentRect.top + 6}px`;

    ctx.elements.edInner.appendChild(popup);

    const input = popup.querySelector('.bookmark-popup-input') as HTMLInputElement;
    const button = popup.querySelector('.bookmark-action-btn') as HTMLButtonElement;
    const uploadBtn = popup.querySelector('.pdf-upload-btn') as HTMLButtonElement;

    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);

    let finished = false;
    let handleOutsideClick: (e: MouseEvent) => void;

    const saveAndClose = () => {
      if (finished) return;
      let url = input.value.trim();
      if (!url) {
        cancelAndClose();
        return;
      }
      finished = true;

      // Automatically prefix with https:// if no protocol schema is present
      if (!/^(https?:\/\/|file:\/\/|mailto:|tel:)/i.test(url)) {
        url = 'https://' + url;
      }

      block.type = cmdType as BlockType;
      block.url = url;
      block.content = url;

      block.bookmarkTitle = undefined;
      block.bookmarkDesc = undefined;
      block.bookmarkImage = undefined;
      block.bookmarkIcon = undefined;

      rerender(n);

      if (cmdType === 'bookmark') {
        if (window.electronAPI && window.electronAPI.fetchLinkMetadata) {
          window.electronAPI.fetchLinkMetadata(url)
            .then((meta) => {
              if (meta && meta.title) {
                block.bookmarkTitle = meta.title;
                block.bookmarkDesc = meta.description;
                block.bookmarkImage = meta.image;
                block.bookmarkIcon = meta.icon;
                rerender(n);
              }
            })
            .catch((err) => {
              console.error('Error fetching link metadata:', err);
            });
        }
      }

      if (handleOutsideClick) {
        document.removeEventListener('mousedown', handleOutsideClick);
      }
      popup.remove();

      const match = findBlockById(n.blocks, block.id);
      if (match) {
        focusNextBlockOrNew(n, match.index, match.parentList);
      }
    };

    const cancelAndClose = () => {
      if (finished) return;
      finished = true;
      if (originalState) {
        // Clear media/bookmark fields first so we don't have dangling attributes
        delete block.url;
        delete block.bookmarkTitle;
        delete block.bookmarkDesc;
        delete block.bookmarkImage;
        delete block.bookmarkIcon;
        Object.assign(block, originalState);
        rerender(n);
      }
      if (handleOutsideClick) {
        document.removeEventListener('mousedown', handleOutsideClick);
      }
      popup.remove();
    };

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      saveAndClose();
    });

    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelAndClose();
        openMediaFilePrompt('pdf', block, n);
      });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveAndClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelAndClose();
      }
    });

    setTimeout(() => {
      handleOutsideClick = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
          if (input.value.trim()) {
            saveAndClose();
          } else {
            cancelAndClose();
          }
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
    }, 0);
  }

  function openMediaFilePrompt(cmdType: string, block: Block, n: Note) {
    const input = document.createElement('input');
    input.type = 'file';
    if (cmdType === 'image') input.accept = 'image/*';
    else if (cmdType === 'video') input.accept = 'video/*';
    else if (cmdType === 'audio') input.accept = 'audio/*';
    else if (cmdType === 'pdf') input.accept = 'application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        block.type = cmdType as BlockType;
        block.url = e.target?.result as string;
        block.content = file.name;
        block.fileName = file.name;
        rerender(n);
        const match = findBlockById(n.blocks, block.id);
        if (match) {
          focusNextBlockOrNew(n, match.index, match.parentList);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function openTexPrompt(cmdType: string, block: Block, n: Note) {
    const tex = prompt('Enter TeX / LaTeX formula:', block.content || '');
    if (tex === null) return;
    block.type = cmdType as BlockType;
    block.content = tex;
    rerender(n);
    const match = findBlockById(n.blocks, block.id);
    if (match) {
      focusNextBlockOrNew(n, match.index, match.parentList);
    }
  }

  function openEmojiPicker(block: Block, n: Note, blockId: string) {
    // Remove old picker if any
    ctx.root.querySelector('.emoji-picker')?.remove();
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.innerHTML = EMOJI_LIST.map(e =>
      `<button class="emoji-btn" data-emoji="${e}">${e}</button>`
    ).join('');
    // position near the block
    const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
    const rect = blockEl?.getBoundingClientRect();
    const innerRect = ctx.elements.edInner.getBoundingClientRect();
    if (rect) {
      picker.style.left = (rect.left - innerRect.left) + 'px';
      picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
    }
    ctx.elements.edInner.appendChild(picker);
    picker.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = (btn as HTMLElement).dataset.emoji!;
        block.content = (block.content || '') + emoji;
        block.type = 'paragraph';
        rerender(n);
        const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field);
        picker.remove();
      });
    });
    // close on outside click
    setTimeout(() => {
      const closePicker = (e: MouseEvent) => {
        if (!picker.contains(e.target as Node)) { picker.remove(); document.removeEventListener('click', closePicker); }
      };
      document.addEventListener('click', closePicker);
    }, 0);
  }

  function openCalendarPicker(anchorEl: HTMLElement, currentDate: string, onSelect: (newDate: string) => void) {
    const input = document.createElement('input');
    input.type = 'date';
    const match = currentDate.match(/\d{4}-\d{2}-\d{2}/);
    input.value = match ? match[0] : new Date().toISOString().slice(0, 10);
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.style.zIndex = '99999';
    
    const rect = anchorEl.getBoundingClientRect();
    const parentRect = ctx.elements.edInner.getBoundingClientRect();
    input.style.left = `${rect.left - parentRect.left}px`;
    input.style.top = `${rect.bottom - parentRect.top}px`;
    
    ctx.elements.edInner.appendChild(input);
    
    input.addEventListener('change', () => {
      if (input.value) {
        onSelect(input.value);
      }
      input.remove();
    });
    
    input.addEventListener('blur', () => {
      setTimeout(() => input.remove(), 100);
    });
    
    try {
      input.showPicker();
    } catch (e) {
      input.click();
    }
  }

  function openDatePicker(block: Block, n: Note) {
    const today = new Date().toISOString().slice(0, 10);
    const field = ctx.elements.edBody.querySelector(`[data-id="${block.id}"] .block-text-field`) as HTMLElement;
    if (!field) return;
    
    openCalendarPicker(field, today, (newDate) => {
      block.content = (block.content || '') + `📅 ${newDate}`;
      block.type = 'paragraph';
      rerender(n);
      const newField = ctx.elements.edBody.querySelector(`[data-id="${block.id}"] .block-text-field`) as HTMLElement;
      if (newField) moveCaret(newField);
    });
  }

  function openMentionPicker(block: Block, n: Note, blockId: string) {
    const titles = ctx.st.notes.filter(x => x.id !== n.id).map(x => x.title || 'Untitled');
    if (titles.length === 0) { ctx.toast('No other notes to mention', '', () => {}); return; }
    const picker = document.createElement('div');
    picker.className = 'slash-menu mention-picker';
    picker.innerHTML = titles.slice(0, 12).map((t, i) =>
      `<button class="slash-item" data-index="${i}"><span class="slash-item-icon">📄</span><span class="slash-item-label">${t}</span></button>`
    ).join('');
    const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
    const rect = blockEl?.getBoundingClientRect();
    const innerRect = ctx.elements.edInner.getBoundingClientRect();
    if (rect) {
      picker.style.left = (rect.left - innerRect.left) + 'px';
      picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
    }
    ctx.elements.edInner.appendChild(picker);
    picker.querySelectorAll('.slash-item').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const title = titles[i];
        block.content = (block.content || '') + `[[${title}]]`;
        block.type = 'paragraph';
        rerender(n);
        const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field);
        picker.remove();
      });
    });
    setTimeout(() => {
      const close = (e: MouseEvent) => {
        if (!picker.contains(e.target as Node)) { picker.remove(); document.removeEventListener('click', close); }
      };
      document.addEventListener('click', close);
    }, 0);
  }

  function openMathPopupEditor(block: Block, n: Note, anchorEl: HTMLElement, originalState?: Partial<Block>) {
    ctx.root.querySelector('.math-popup-editor')?.remove();

    const popup = document.createElement('div');
    popup.className = 'math-popup-editor';
    popup.style.cssText = `
      position: absolute;
      display: flex;
      align-items: center;
      background: #252526;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      gap: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;

    const textarea = document.createElement('textarea');
    textarea.className = 'math-popup-textarea';
    textarea.value = block.content || '';
    textarea.style.cssText = `
      background: transparent;
      border: none;
      color: #ffffff;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 13px;
      outline: none;
      resize: none;
      width: 280px;
      height: 38px;
      line-height: 1.4;
    `;
    textarea.placeholder = "Enter TeX / LaTeX formula...";

    const doneBtn = document.createElement('button');
    doneBtn.className = 'math-popup-done-btn';
    doneBtn.innerHTML = `Done <span style="font-size: 10px; margin-left: 2px;">↵</span>`;
    doneBtn.style.cssText = `
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      height: 32px;
      white-space: nowrap;
      transition: background 0.15s;
    `;
    doneBtn.addEventListener('mouseenter', () => doneBtn.style.background = '#106ebe');
    doneBtn.addEventListener('mouseleave', () => doneBtn.style.background = '#0078d4');

    popup.appendChild(textarea);
    popup.appendChild(doneBtn);

    const rect = anchorEl.getBoundingClientRect();
    const parentRect = ctx.elements.edInner.getBoundingClientRect();
    popup.style.left = `${rect.left - parentRect.left}px`;
    popup.style.top = `${rect.bottom - parentRect.top + 6}px`;

    ctx.elements.edInner.appendChild(popup);
    textarea.focus();
    textarea.select();

    let finished = false;
    const saveAndClose = () => {
      if (finished) return;
      finished = true;
      block.content = textarea.value.trim();
      rerender(n);
      popup.remove();
      
      const match = findBlockById(n.blocks, block.id);
      if (match) {
        focusNextBlockOrNew(n, match.index, match.parentList);
      }
    };

    const cancelAndClose = () => {
      if (finished) return;
      finished = true;
      if (originalState) {
        Object.assign(block, originalState);
      }
      rerender(n);
      popup.remove();
    };

    doneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveAndClose();
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveAndClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelAndClose();
      }
    });

    setTimeout(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
          saveAndClose();
          document.removeEventListener('mousedown', handleOutsideClick);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
    }, 0);
  }

  function openCalloutEmojiPicker(block: Block, n: Note, anchorEl: HTMLElement) {
    ctx.root.querySelector('.emoji-picker')?.remove();
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.innerHTML = EMOJI_LIST.map(e =>
      `<button class="emoji-btn" data-emoji="${e}">${e}</button>`
    ).join('');
    
    const rect = anchorEl.getBoundingClientRect();
    const innerRect = ctx.elements.edInner.getBoundingClientRect();
    picker.style.left = (rect.left - innerRect.left) + 'px';
    picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
    
    ctx.elements.edInner.appendChild(picker);
    picker.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = (btn as HTMLElement).dataset.emoji!;
        block.icon = emoji;
        rerender(n);
        picker.remove();
      });
    });
    
    setTimeout(() => {
      const closePicker = (e: MouseEvent) => {
        if (!picker.contains(e.target as Node)) { picker.remove(); document.removeEventListener('click', closePicker); }
      };
      document.addEventListener('click', closePicker);
    }, 0);
  }

  function rerender(n: Note) {
    setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
    saveAndSyncContent();
    ctx.markSaving();
  }

  function executeSlashCommand(realIndex: number) {
    if (!activeSlashBlockId) return;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;

    // Find the item at realIndex (skipping group headers)
    let count = 0;
    let chosenItem: SlashItem | undefined;
    for (const item of visibleSlashItems) {
      if (item.group) continue;
      if (count === realIndex) { chosenItem = item; break; }
      count++;
    }
    if (!chosenItem) return;

    const match = findBlockById(n.blocks, activeSlashBlockId);
    closeSlashMenu();
    if (!match) return;

    let content = match.block.content.trim();
    // Strip trailing slash + query typed after it
    const slashPos = content.lastIndexOf('/');
    if (slashPos !== -1) content = content.substring(0, slashPos).trim();
    match.block.content = content;

    const cmdType = chosenItem.type!;
    const blockId = match.block.id;

    switch (cmdType) {
      // ── subpage / subfolder ───────────────────────────────────────────
      case 'subpage':
        rerender(n);
        ctx.newSubNote(n.id);
        return;
      case 'subfolder':
        rerender(n);
        ctx.newSubFolder(n.id);
        return;

      // ── basic block types ─────────────────────────────────────────────
      case 'paragraph':
      case 'callout':
      case 'heading1': case 'heading2': case 'heading3':
      case 'bullet': case 'numbered':
      case 'quote': case 'toggle': case 'toggle_h1': case 'toggle_h2': case 'toggle_h3':
        match.block.type = cmdType as BlockType;
        if (cmdType === 'callout') {
          match.block.icon = '💡';
        }
        break;

      case 'todo':
        match.block.type = 'todo';
        match.block.checked = false;
        break;

      case 'divider':
        match.block.type = 'divider';
        match.block.content = '';
        rerender(n);
        focusNextBlockOrNew(n, match.index, match.parentList);
        return;

      // ── code ──────────────────────────────────────────────────────────
      case 'code':
        match.block.type = 'code';
        match.block.language = 'plaintext';
        break;

      // ── media blocks (file upload) ────────────────────────────────────
      case 'image': case 'video': case 'audio': case 'file': {
        const mediaType = cmdType;
        rerender(n);
        openMediaFilePrompt(mediaType, match.block, n);
        return;
      }

      // ── media blocks (URL prompt) ─────────────────────────────────────
      case 'pdf': case 'bookmark': {
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
        rerender(n);
        const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
        if (blockEl) {
          openUrlPopupEditor(cmdType, match.block, n, blockEl, originalState);
        }
        return;
      }

      // ── inline: emoji ─────────────────────────────────────────────────
      case 'emoji':
        openEmojiPicker(match.block, n, blockId);
        return;

      // ── inline: date ──────────────────────────────────────────────────
      case 'date':
        openDatePicker(match.block, n);
        return;

      // ── inline: equation / math ───────────────────────────────────────
      case 'equation': case 'math': {
        const originalState: Partial<Block> = {
          type: match.block.type,
          content: match.block.content
        };
        match.block.type = cmdType as BlockType;
        rerender(n);
        const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
        if (blockEl) {
          openMathPopupEditor(match.block, n, blockEl, originalState);
        }
        return;
      }

      // ── inline: mention ───────────────────────────────────────────────
      case 'mention':
        openMentionPicker(match.block, n, blockId);
        return;

      // ── advanced: duplicate ───────────────────────────────────────────
      case 'duplicate': {
        const clone = duplicateBlockWithNewIds(match.block);
        match.parentList.splice(match.index + 1, 0, clone);
        rerender(n);
        return;
      }

      // ── advanced: delete ──────────────────────────────────────────────
      case 'delete':
        match.parentList.splice(match.index, 1);
        if (n.blocks.length === 0) n.blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
        rerender(n);
        return;

      // ── advanced: moveto ──────────────────────────────────────────────
      case 'moveto': {
        const targets = ctx.st.notes.filter(x => x.id !== n.id);
        if (targets.length === 0) { ctx.toast('No other notes to move to', '', () => {}); return; }
        const picker = document.createElement('div');
        picker.className = 'slash-menu mention-picker';
        picker.innerHTML = targets.slice(0, 12).map((t, i) =>
          `<button class="slash-item" data-index="${i}"><span class="slash-item-icon">📄</span><span class="slash-item-label">${t.title || 'Untitled'}</span></button>`
        ).join('');
        const blockEl = ctx.elements.edBody.querySelector(`[data-id="${blockId}"]`) as HTMLElement;
        const rect = blockEl?.getBoundingClientRect();
        const innerRect = ctx.elements.edInner.getBoundingClientRect();
        if (rect) {
          picker.style.left = (rect.left - innerRect.left) + 'px';
          picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
        }
        ctx.elements.edInner.appendChild(picker);
        picker.querySelectorAll('.slash-item').forEach((btn, i) => {
          btn.addEventListener('click', () => {
            const target = targets[i];
            const blockCopy = duplicateBlockWithNewIds(match.block);
            target.blocks.push(blockCopy);
            match.parentList.splice(match.index, 1);
            if (n.blocks.length === 0) n.blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
            rerender(n);
            picker.remove();
            ctx.toast(`Block moved to "${target.title || 'Untitled'}"`, '', () => {});
          });
        });
        setTimeout(() => {
          const close = (e: MouseEvent) => {
            if (!picker.contains(e.target as Node)) { picker.remove(); document.removeEventListener('click', close); }
          };
          document.addEventListener('click', close);
        }, 0);
        return;
      }

      // ── advanced: TOC ─────────────────────────────────────────────────
      case 'toc':
        match.block.type = 'toc';
        match.block.content = '';
        rerender(n);
        focusNextBlockOrNew(n, match.index, match.parentList);
        return;

      // ── advanced: breadcrumb ──────────────────────────────────────────
      case 'breadcrumb':
        match.block.type = 'breadcrumb';
        match.block.content = '';
        rerender(n);
        focusNextBlockOrNew(n, match.index, match.parentList);
        return;

      // ── advanced: template ────────────────────────────────────────────
      case 'template':
        match.block.type = 'template';
        match.block.content = 'Template button';
        break;

      // ── Colors ──────────────────────────────────────────────────────────
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
        // Unknown type – no-op
        return;
    }

    rerender(n);
    const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
    if (field) moveCaret(field);
  }

  ctx.elements.edTitle.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstField = ctx.elements.edBody.querySelector('.block-text-field') as HTMLElement;
      if (firstField) {
        firstField.focus();
      }
    }
  });

  ctx.elements.edBody.addEventListener('input', e => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('block-text-field')) return;

    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;

    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;

    const match = findBlockById(n.blocks, blockId);
    if (match) {
      const text = target.textContent || '';
      match.block.content = text;

      // ── Markdown shortcut auto-conversion ──────────────────────────────
      if (match.block.type === 'paragraph' || match.block.type === 'bullet' || match.block.type === 'numbered') {
        type ShortcutEntry = { prefix: string; type: BlockType; strip: number; extra?: () => void };
        const shortcuts: ShortcutEntry[] = [
          { prefix: '### ', type: 'heading3',  strip: 4 },
          { prefix: '## ',  type: 'heading2',  strip: 3 },
          { prefix: '# ',   type: 'heading1',  strip: 2 },
          { prefix: '- [ ] ', type: 'todo',    strip: 6, extra: () => { match.block.checked = false; } },
          { prefix: '- ',   type: 'bullet',    strip: 2 },
          { prefix: '* ',   type: 'bullet',    strip: 2 },
          { prefix: '1. ',  type: 'numbered',  strip: 3 },
          { prefix: '> # ', type: 'toggle_h1', strip: 4 },
          { prefix: '> ## ',type: 'toggle_h2', strip: 5 },
          { prefix: '> ### ',type: 'toggle_h3',strip: 6 },
          { prefix: '> ',   type: 'toggle',    strip: 2 },
          { prefix: '" ',   type: 'quote',     strip: 2 },
          { prefix: '| ',   type: 'quote',     strip: 2 },
          { prefix: '--- ', type: 'divider',   strip: text.length },
          { prefix: '``` ', type: 'code',      strip: 4, extra: () => { match.block.language = 'plaintext'; } },
        ];
        for (const s of shortcuts) {
          if (text.startsWith(s.prefix)) {
            match.block.type = s.type;
            match.block.content = text.substring(s.strip);
            s.extra?.();
            rerender(n);
            
            const noTextField = ['divider', 'math', 'equation', 'image', 'video', 'audio', 'pdf', 'bookmark', 'file', 'toc', 'breadcrumb'].includes(s.type);
            if (noTextField) {
              focusNextBlockOrNew(n, match.index, match.parentList);
            } else {
              const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
              if (newField) moveCaret(newField);
            }
            return;
          }
        }
      }

      // ── --- auto-divider conversion ──────────────────────────────────────
      if (text === '---') {
        match.block.type = 'divider';
        match.block.content = '';
        rerender(n);
        focusNextBlockOrNew(n, match.index, match.parentList);
        return;
      }

      // ── Slash menu trigger / filter ─────────────────────────────────────
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx !== -1) {
        const charBefore = slashIdx > 0 ? text[slashIdx - 1] : '';
        const isValidTrigger = slashIdx === 0 || /\s/.test(charBefore);

        if (isValidTrigger) {
          const query = text.slice(slashIdx + 1);
          if (activeSlashBlockId === blockId) {
            // Update existing menu with filtered results
            showSlashMenu(blockEl, target, query);
          } else if (query === '' || slashIdx === text.length - 1) {
            // Fresh open on bare /
            showSlashMenu(blockEl, target, query);
          }
        } else if (activeSlashBlockId === blockId) {
          closeSlashMenu();
        }
      } else if (activeSlashBlockId === blockId) {
        closeSlashMenu();
      }

      // ── Autocomplete popups trigger / filter (@, [[, +) ──────────────────
      const checkAutocompleteTrigger = (symbol: string) => {
        const symbolIdx = text.lastIndexOf(symbol);
        if (symbolIdx !== -1) {
          const charBefore = symbolIdx > 0 ? text[symbolIdx - 1] : '';
          const isValidTrigger = symbolIdx === 0 || /\s/.test(charBefore);
          if (isValidTrigger) {
            const query = text.slice(symbolIdx + symbol.length);
            showAutocompletePicker(match.block, target, symbol, query);
            return true;
          }
        }
        return false;
      };

      let triggered = false;
      for (const sym of ['@', '[[', '+']) {
        if (checkAutocompleteTrigger(sym)) {
          triggered = true;
          break;
        }
      }
      if (!triggered && activePickerBlockId === blockId) {
        closeAutocompletePicker();
      }

      saveAndSyncContent();
      ctx.markSaving();
    }
  });

  ctx.elements.edBody.addEventListener('keydown', e => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('block-text-field')) return;
    
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;
    
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    
    if (activePickerEl) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedPickerIndex = (selectedPickerIndex + 1) % visiblePickerItems.length;
        updatePickerSelection(activePickerEl);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedPickerIndex = (selectedPickerIndex - 1 + visiblePickerItems.length) % visiblePickerItems.length;
        updatePickerSelection(activePickerEl);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        executePickerCommand(selectedPickerIndex);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocompletePicker();
        return;
      }
    }

    if (activeSlashBlockId) {
      const menu = ctx.root.querySelector('.slash-menu') as HTMLElement;
      if (menu) {
        const actionItems = visibleSlashItems.filter(i => !i.group);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedSlashItemIndex = (selectedSlashItemIndex + 1) % actionItems.length;
          updateSlashMenuSelection(menu);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedSlashItemIndex = (selectedSlashItemIndex - 1 + actionItems.length) % actionItems.length;
          updateSlashMenuSelection(menu);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          executeSlashCommand(selectedSlashItemIndex);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSlashMenu();
          return;
        }
      }
    }

    // ── Esc to enter block selection mode ───────────────────────────
    if (e.key === 'Escape') {
      e.preventDefault();
      ctx.st.selectedBlockIds = new Set([blockId]);
      target.blur();
      rerenderSelectionStyles();
      return;
    }

    // ── Ctrl/Cmd + A once to select block wrapper ────────────────────
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      ctx.st.selectedBlockIds = new Set([blockId]);
      target.blur();
      rerenderSelectionStyles();
      return;
    }

    // ── Ctrl/Cmd + K for link insertion ──────────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        e.preventDefault();
        const url = prompt('Enter link URL:', 'https://');
        if (url) {
          const range = selection.getRangeAt(0);
          const selectedHtml = range.toString();
          const linkHtml = `<a href="${url.trim()}" target="_blank" style="color: var(--accent); text-decoration: underline;">${esc(selectedHtml)}</a>`;
          document.execCommand('insertHTML', false, linkHtml);
          saveAndSyncContent();
          ctx.markSaving();
        }
        return;
      }
    }

    // ── Ctrl/Cmd + Shift + H to apply last text/highlight color ───────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      const match = findBlockById(n.blocks, blockId);
      if (match) {
        if (ctx.st.lastUsedColor !== undefined) match.block.textColor = ctx.st.lastUsedColor;
        if (ctx.st.lastUsedBgColor !== undefined) match.block.bgColor = ctx.st.lastUsedBgColor;
        rerender(n);
        const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (newField) moveCaret(newField);
        saveAndSyncContent();
        ctx.markSaving();
      }
      return;
    }

    // ── Ctrl/Cmd + Shift + M for commenting ──────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      const match = findBlockById(n.blocks, blockId);
      if (match) {
        const commentVal = prompt('Enter comment for this block:', match.block.comment || '');
        if (commentVal !== null) {
          match.block.comment = commentVal.trim() || undefined;
          rerender(n);
          const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
          if (newField) moveCaret(newField);
          saveAndSyncContent();
          ctx.markSaving();
        }
      }
      return;
    }

    // ── Ctrl/Cmd + Shift + S for strikethrough ────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.execCommand('strikeThrough', false, undefined);
      saveAndSyncContent();
      ctx.markSaving();
      return;
    }

    // ── Ctrl/Cmd + Shift + E for inline math/equation ──────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      const selection = window.getSelection()?.toString() || '';
      const val = prompt('Enter TeX / LaTeX formula:', selection);
      if (val !== null) {
        document.execCommand('insertHTML', false, `$$${val.trim()}$$`);
        saveAndSyncContent();
        ctx.markSaving();
        
        const match = findBlockById(n.blocks, blockId);
        if (match) {
          match.block.content = target.textContent || '';
          rerender(n);
          const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
          if (newField) moveCaret(newField);
        }
      }
      return;
    }

    // ── Ctrl/Cmd + E for inline code ─────────────────────────────────
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      const selection = window.getSelection()?.toString();
      if (selection) {
        document.execCommand('insertHTML', false, `<code style="background:var(--bg3); padding: 2px 4px; border-radius: 4px; font-family: monospace;">${esc(selection)}</code>`);
        saveAndSyncContent();
        ctx.markSaving();
      }
      return;
    }

    // ── Shift + Enter for inline line break ──────────────────────────
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak', false, undefined);
      return;
    }

    // ── Ctrl/Cmd + Shift/Alt + Number Style Shortcuts ─────────────────
    const numKey = parseInt(e.key);
    const isStyleShortcut = (e.ctrlKey || e.metaKey) && (e.altKey || e.shiftKey) && !isNaN(numKey);
    if (isStyleShortcut) {
      e.preventDefault();
      const match = findBlockById(n.blocks, blockId);
      if (match) {
        const typeMap: Record<number, BlockType> = {
          0: 'paragraph',
          1: 'heading1',
          2: 'heading2',
          3: 'heading3',
          4: 'todo',
          5: 'bullet',
          6: 'numbered',
          7: 'toggle',
          8: 'code',
        };
        const targetType = typeMap[numKey];
        if (targetType) {
          match.block.type = targetType;
          if (targetType === 'todo') match.block.checked = false;
          if (targetType === 'code') match.block.language = 'plaintext';
          rerender(n);
          const newField = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
          if (newField) moveCaret(newField);
        } else if (numKey === 9) {
          // Turn line into page
          const parentN = ctx.st.notes.find(x => x.id === ctx.st.sel);
          if (parentN) {
            const title = match.block.content.trim() || 'Untitled Page';
            const newN: Note = {
              id: 'n' + Math.random().toString(36).slice(2, 7),
              title: title,
              body: '',
              blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
              nb: parentN.nb,
              tags: [],
              pinned: false,
              date: 'Just now',
              ord: --ctx.st.ordMin,
              parentId: parentN.id
            };
            ctx.st.notes.unshift(newN);
            match.block.type = 'paragraph';
            match.block.content = `[[${title}]]`;
            rerender(n);
            saveAndSync();
          }
        }
      }
      return;
    }

    // ── Ctrl/Cmd + Enter to open/close toggle ───────────────────────
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const match = findBlockById(n.blocks, blockId);
      if (match && isToggleType(match.block.type)) {
        e.preventDefault();
        match.block.collapsed = !match.block.collapsed;
        rerender(n);
        const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const match = findBlockById(n.blocks, blockId);
      if (!match) return;

      const { parentList, index, block: currentBlock } = match;
      const currentType = currentBlock.type;
      const listLikeTypes: BlockType[] = ['bullet', 'numbered', 'todo', 'quote'];
      const isListLike = listLikeTypes.includes(currentType);

      // ── Get caret position to split text ──────────────────────────
      const sel = window.getSelection();
      let caretOffset = (target.textContent || '').length;
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.selectNodeContents(target);
        preRange.setEnd(range.startContainer, range.startOffset);
        caretOffset = preRange.toString().length;
      }
      const fullText = currentBlock.content;
      const textBefore = fullText.slice(0, caretOffset);
      const textAfter = fullText.slice(caretOffset);

      // ── Shift+Enter: soft line break (inserts newline) ────────────────
      if (e.shiftKey) {
        insertTextAtCaret(target, '\n');
        return;
      }

      // ── Code block: Enter key should just insert a newline! ─────────
      if (currentType === 'code') {
        insertTextAtCaret(target, '\n');
        return;
      }

      // ── Toggle block: Enter creates a child inside the toggle ─────
      if (isToggleType(currentType)) {
        currentBlock.content = textBefore;
        if (currentBlock.collapsed) currentBlock.collapsed = false;
        if (!currentBlock.children) currentBlock.children = [];
        const newBlockId = genId();
        const newBlock: Block = { id: newBlockId, type: 'paragraph', content: textAfter, children: [] };
        currentBlock.children.unshift(newBlock);
        rerender(n);
        const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
        if (newField) newField.focus();
        return;
      }

      // ── Empty nested block inside toggle: Enter outdents it ─────
      if (parentList !== n.blocks && fullText.trim() === '') {
        let grandparentBlockMatch = null;
        for (const b of n.blocks) {
          if (b.children === parentList) {
            grandparentBlockMatch = { parentList: n.blocks, block: b };
            break;
          }
          const childMatch = findParentBlockOfList(b.children, parentList, b);
          if (childMatch) {
            grandparentBlockMatch = childMatch;
            break;
          }
        }
        if (grandparentBlockMatch) {
          const { parentList: grandparentList, block: parentBlock } = grandparentBlockMatch;
          const parentIndexInGrandparent = grandparentList.indexOf(parentBlock);
          parentList.splice(index, 1);
          grandparentList.splice(parentIndexInGrandparent + 1, 0, currentBlock);
          currentBlock.type = 'paragraph';
          rerender(n);
          const field = ctx.elements.edBody.querySelector(`[data-id="${currentBlock.id}"] .block-text-field`) as HTMLElement;
          if (field) field.focus();
          saveAndSyncContent();
          ctx.markSaving();
          return;
        }
      }

      // ── Empty list/quote block: convert back to paragraph ─────────
      if (isListLike && fullText.trim() === '') {
        currentBlock.type = 'paragraph';
        currentBlock.content = '';
        rerender(n);
        const field = ctx.elements.edBody.querySelector(`[data-id="${currentBlock.id}"] .block-text-field`) as HTMLElement;
        if (field) field.focus();
        return;
      }

      // ── Create new block, inheriting type for list-like blocks ─────
      currentBlock.content = textBefore;
      const newBlockId = genId();
      const newBlock: Block = {
        id: newBlockId,
        type: isListLike ? currentType : 'paragraph',
        content: textAfter,
        children: []
      };
      if (currentType === 'todo') {
        newBlock.checked = false;
      }
      parentList.splice(index + 1, 0, newBlock);

      rerender(n);
      const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
      if (newField) {
        newField.focus();
      }
      return;
    }
    
    if (e.key === 'Backspace') {
      if (isCaretAtStart(target)) {
        const match = findBlockById(n.blocks, blockId);
        if (match) {
          e.preventDefault();
          const flat = flattenVisibleBlocks(n.blocks);
          const flatIndex = flat.findIndex(b => b.id === blockId);
          
          if (flatIndex > 0) {
            const prevBlock = flat[flatIndex - 1];
            
            // If the previous block is a non-text block, delete it instead of merging!
            if (isNonTextFieldBlock(prevBlock.type)) {
              const prevBlockMatch = findBlockById(n.blocks, prevBlock.id);
              if (prevBlockMatch) {
                prevBlockMatch.parentList.splice(prevBlockMatch.index, 1);
                setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
                const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
                if (field) {
                  moveCaret(field, true);
                }
                saveAndSyncContent();
                ctx.markSaving();
              }
              return;
            }
            
            const originalLength = prevBlock.content.length;
            prevBlock.content += match.block.content;
            
            if (match.block.children && match.block.children.length > 0) {
              prevBlock.children = [...prevBlock.children, ...match.block.children];
            }
            
            const parentIndex = match.parentList.indexOf(match.block);
            if (parentIndex !== -1) {
              match.parentList.splice(parentIndex, 1);
            }
            
            setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
            const prevField = ctx.elements.edBody.querySelector(`[data-id="${prevBlock.id}"] .block-text-field`) as HTMLElement;
            if (prevField) {
              prevField.focus();
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = document.createRange();
                let textNode = prevField.firstChild;
                if (!textNode) {
                  textNode = prevField;
                }
                range.setStart(textNode, originalLength);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
            saveAndSyncContent();
            ctx.markSaving();
          }
        }
      }
      return;
    }
    
    if (e.key === 'ArrowUp') {
      const flat = flattenVisibleBlocks(n.blocks);
      const flatIndex = flat.findIndex(b => b.id === blockId);
      for (let i = flatIndex - 1; i >= 0; i--) {
        const prevBlock = flat[i];
        if (!isNonTextFieldBlock(prevBlock.type)) {
          e.preventDefault();
          const prevField = ctx.elements.edBody.querySelector(`[data-id="${prevBlock.id}"] .block-text-field`) as HTMLElement;
          if (prevField) {
            moveCaret(prevField, false);
            break;
          }
        }
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      const flat = flattenVisibleBlocks(n.blocks);
      const flatIndex = flat.findIndex(b => b.id === blockId);
      for (let i = flatIndex + 1; i < flat.length; i++) {
        const nextBlock = flat[i];
        if (!isNonTextFieldBlock(nextBlock.type)) {
          e.preventDefault();
          const nextField = ctx.elements.edBody.querySelector(`[data-id="${nextBlock.id}"] .block-text-field`) as HTMLElement;
          if (nextField) {
            moveCaret(nextField, true);
            break;
          }
        }
      }
      return;
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const match = findBlockById(n.blocks, blockId);
      if (match) {
        const { parentList, index } = match;
        const level = getBlockLevel(n.blocks, blockId);
        
        if (e.shiftKey) {
          if (level > 0) {
            let grandparentBlockMatch = null;
            for (const b of n.blocks) {
              if (b.children === parentList) {
                grandparentBlockMatch = { parentList: n.blocks, block: b };
                break;
              }
              const childMatch = findParentBlockOfList(b.children, parentList, b);
              if (childMatch) {
                grandparentBlockMatch = childMatch;
                break;
              }
            }
            
            if (grandparentBlockMatch) {
              const { parentList: grandparentList, block: parentBlock } = grandparentBlockMatch;
              const parentIndexInGrandparent = grandparentList.indexOf(parentBlock);
              parentList.splice(index, 1);
              grandparentList.splice(parentIndexInGrandparent + 1, 0, match.block);
              
              setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
              const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
              if (field) field.focus();
              saveAndSyncContent();
              ctx.markSaving();
            } else if (parentList !== n.blocks) {
              const rootParentIndex = n.blocks.findIndex(b => b.children === parentList);
              if (rootParentIndex !== -1) {
                parentList.splice(index, 1);
                n.blocks.splice(rootParentIndex + 1, 0, match.block);
                
                setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
                const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
                if (field) field.focus();
                saveAndSyncContent();
                ctx.markSaving();
              }
            }
          }
        } else {
          if (index > 0) {
            const precedingSibling = parentList[index - 1];
            parentList.splice(index, 1);
            if (!precedingSibling.children) precedingSibling.children = [];
            precedingSibling.children.push(match.block);
            if (isToggleType(precedingSibling.type) && precedingSibling.collapsed) {
              precedingSibling.collapsed = false;
            }
            
            setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
            const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
            if (field) field.focus();
            saveAndSyncContent();
            ctx.markSaving();
          }
        }
      }
      return;
    }
  });

  ctx.elements.edBody.addEventListener('paste', e => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const files = clipboardData.files;
    if (files && files.length > 0) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const blockEl = target.closest('.block-wrapper') as HTMLElement;
      if (!blockEl) return;
      const blockId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, blockId);
      if (!match) return;

      const { parentList, index, block: currentBlock } = match;

      let insertIndex = index;
      let isFirst = true;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let blockType: BlockType = 'file';
        if (file.type.startsWith('image/')) blockType = 'image';
        else if (file.type.startsWith('video/')) blockType = 'video';
        else if (file.type.startsWith('audio/')) blockType = 'audio';
        else if (file.type === 'application/pdf') blockType = 'pdf';

        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          const newBlock: Block = {
            id: genId(),
            type: blockType,
            url,
            content: file.name,
            fileName: file.name,
            children: []
          };

          // If the current block is an empty paragraph, we can replace it
          let blockToTrack = newBlock;
          if (isFirst && (currentBlock.type === 'paragraph' || currentBlock.type === 'bullet') && !currentBlock.content.trim()) {
            currentBlock.type = blockType;
            currentBlock.url = url;
            currentBlock.content = file.name;
            currentBlock.fileName = file.name;
            blockToTrack = currentBlock;
            isFirst = false;
          } else {
            parentList.splice(insertIndex + 1, 0, newBlock);
            insertIndex++;
          }

          // Ensure a follow-up paragraph block exists so the user can continue typing
          const targetIndex = parentList.indexOf(blockToTrack);
          if (targetIndex !== -1) {
            const nextBlock = parentList[targetIndex + 1];
            if (!nextBlock || isNonTextFieldBlock(nextBlock.type)) {
              parentList.splice(targetIndex + 1, 0, {
                id: genId(),
                type: 'paragraph',
                content: '',
                children: []
              });
            }
          }

          rerender(n);
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    const pastedText = clipboardData.getData('text');
    const isUrl = /^(https?:\/\/[^\s]+)$/i.test(pastedText.trim());
    if (isUrl) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        e.preventDefault();
        const range = selection.getRangeAt(0);
        const selectedHtml = range.toString();
        const linkHtml = `<a href="${pastedText.trim()}" target="_blank" style="color: var(--accent); text-decoration: underline;">${esc(selectedHtml)}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
        
        const target = e.target as HTMLElement;
        const blockEl = target.closest('.block-wrapper') as HTMLElement;
        if (blockEl) {
          const blockId = blockEl.dataset.id!;
          const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
          if (n) {
            const match = findBlockById(n.blocks, blockId);
            if (match) {
              const textEl = blockEl.querySelector('.block-text-field') as HTMLElement;
              match.block.content = textEl.innerHTML;
              saveAndSyncContent();
              ctx.markSaving();
            }
          }
        }
      }
    }
  });

  ctx.elements.edBody.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (!target.classList.contains('block-todo-checkbox')) return;
    
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;
    
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    
    const match = findBlockById(n.blocks, blockId);
    if (match) {
      match.block.checked = target.checked;
      blockEl.classList.toggle('checked', target.checked);
      saveAndSyncContent();
      ctx.markSaving();
    }
  });

  // Close menus on outside clicks
  document.addEventListener('mousedown', e => {
    const target = e.target as HTMLElement;
    const menu = ctx.root.querySelector('.slash-menu');
    if (menu && !menu.contains(e.target as Node) && !target.classList.contains('block-text-field')) {
      closeSlashMenu();
    }
    const picker = ctx.root.querySelector('.language-picker-popup');
    if (picker && !picker.contains(e.target as Node) && !target.closest('.code-lang-container')) {
      closeLanguagePicker();
    }

    // Clear block selection on outside click/focus
    if (ctx.st.selectedBlockIds && ctx.st.selectedBlockIds.size > 0) {
      const isDragHandle = target.closest('.block-drag-handle');
      const isFlyout = target.closest('#flyout') || target.closest('.fly-item') || target.closest('.url-popup-editor') || target.closest('.math-popup-editor');
      const isSelectionModifier = e.shiftKey || e.altKey || e.metaKey;
      
      if (!isDragHandle && !isFlyout && !isSelectionModifier) {
        ctx.st.selectedBlockIds.clear();
        rerenderSelectionStyles();
      }
    }
  });
  ctx.elements.edBody.addEventListener('click', e => {
    const target = e.target as HTMLElement;

    // ── Add block button click ──────────────────────────────────────────────
    const addBtn = target.closest('.block-add-btn') as HTMLElement;
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const blockEl = addBtn.closest('.block-wrapper') as HTMLElement;
      if (!blockEl) return;
      const bId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        const { parentList, index } = match;
        const newBlockId = genId();
        const newBlock: Block = {
          id: newBlockId,
          type: 'paragraph',
          content: '',
          children: []
        };
        parentList.splice(index + 1, 0, newBlock);
        
        rerender(n);
        const newField = ctx.elements.edBody.querySelector(`[data-id="${newBlockId}"] .block-text-field`) as HTMLElement;
        if (newField) {
          newField.focus();
        }
        saveAndSyncContent();
        ctx.markSaving();
      }
      return;
    }

    // ── Drag handle click ──────────────────────────────────────────────────
    const dragHandle = target.closest('.block-drag-handle') as HTMLElement;
    if (dragHandle) {
      e.preventDefault();
      e.stopPropagation();
      const blockEl = dragHandle.closest('.block-wrapper') as HTMLElement;
      if (!blockEl) return;
      const bId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        ctx.st.selectedBlockIds = new Set([bId]);
        rerenderSelectionStyles();
        
        const menuItems: FlyoutItem[] = [
          { label: 'Duplicate', icon: '⧉', action: () => {
            const clone = duplicateBlockWithNewIds(match.block);
            match.parentList.splice(match.index + 1, 0, clone);
            rerender(n);
          }},
          { label: 'Move to', icon: '↗', action: () => {
            const targets = ctx.st.notes.filter(x => x.id !== n.id);
            if (targets.length === 0) { ctx.toast('No other notes to move to', '', () => {}); return; }
            const picker = document.createElement('div');
            picker.className = 'slash-menu mention-picker';
            picker.innerHTML = targets.slice(0, 12).map((t, i) =>
              `<button class="slash-item" data-index="${i}"><span class="slash-item-icon">📄</span><span class="slash-item-label">${t.title || 'Untitled'}</span></button>`
            ).join('');
            const blockEl = ctx.elements.edBody.querySelector(`[data-id="${bId}"]`) as HTMLElement;
            const rect = blockEl?.getBoundingClientRect();
            const innerRect = ctx.elements.edInner.getBoundingClientRect();
            if (rect) {
              picker.style.left = (rect.left - innerRect.left) + 'px';
              picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
            }
            ctx.elements.edInner.appendChild(picker);
            picker.querySelectorAll('.slash-item').forEach((btn, i) => {
              btn.addEventListener('click', () => {
                const target = targets[i];
                const blockCopy = duplicateBlockWithNewIds(match.block);
                target.blocks.push(blockCopy);
                match.parentList.splice(match.index, 1);
                if (n.blocks.length === 0) n.blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
                rerender(n);
                picker.remove();
                ctx.toast(`Block moved to "${target.title || 'Untitled'}"`, '', () => {});
              });
            });
            setTimeout(() => {
              const close = (e: MouseEvent) => {
                if (!picker.contains(e.target as Node)) { picker.remove(); document.removeEventListener('click', close); }
              };
              document.addEventListener('click', close);
            }, 0);
          }},
          { label: 'Delete', icon: '🗑', danger: true, action: () => {
            match.parentList.splice(match.index, 1);
            if (n.blocks.length === 0) n.blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
            rerender(n);
          }},
          { sep: true },
          { head: 'Turn into' },
          { label: 'Text', icon: '¶', action: () => { match.block.type = 'paragraph'; rerender(n); } },
          { label: 'Heading 1', icon: 'H1', action: () => { match.block.type = 'heading1'; rerender(n); } },
          { label: 'Heading 2', icon: 'H2', action: () => { match.block.type = 'heading2'; rerender(n); } },
          { label: 'Heading 3', icon: 'H3', action: () => { match.block.type = 'heading3'; rerender(n); } },
          { label: 'Bullet list', icon: '•', action: () => { match.block.type = 'bullet'; rerender(n); } },
          { label: 'Numbered list', icon: '1.', action: () => { match.block.type = 'numbered'; rerender(n); } },
          { label: 'To-do list', icon: '☑', action: () => { match.block.type = 'todo'; match.block.checked = false; rerender(n); } },
          { label: 'Toggle list', icon: '▶', action: () => { match.block.type = 'toggle'; rerender(n); } },
          { label: 'Toggle heading 1', icon: '▶1', action: () => { match.block.type = 'toggle_h1'; rerender(n); } },
          { label: 'Toggle heading 2', icon: '▶2', action: () => { match.block.type = 'toggle_h2'; rerender(n); } },
          { label: 'Toggle heading 3', icon: '▶3', action: () => { match.block.type = 'toggle_h3'; rerender(n); } },
          { label: 'Quote', icon: '❝', action: () => { match.block.type = 'quote'; rerender(n); } },
          { label: 'Divider', icon: '—', action: () => { match.block.type = 'divider'; match.block.content = ''; rerender(n); } },
          { label: 'Callout', icon: '💡', action: () => { match.block.type = 'callout'; match.block.icon = '💡'; rerender(n); } },
          { label: 'Page', icon: '📄', action: () => { rerender(n); ctx.newSubNote(n.id); } },
          { label: 'Subfolder', icon: '📁', action: () => { rerender(n); ctx.newSubFolder(n.id); } },
          { label: 'Image', icon: '🖼', action: () => { rerender(n); openMediaFilePrompt('image', match.block, n); } },
          { label: 'Video', icon: '🎬', action: () => { rerender(n); openMediaFilePrompt('video', match.block, n); } },
          { label: 'Audio', icon: '🎵', action: () => { rerender(n); openMediaFilePrompt('audio', match.block, n); } },
           { label: 'PDF', icon: '📄', action: () => {
            const originalState: Partial<Block> = {
              type: match.block.type,
              content: match.block.content,
              url: match.block.url
            };
            match.block.type = 'pdf';
            rerender(n);
            const blockEl = ctx.elements.edBody.querySelector(`[data-id="${bId}"]`) as HTMLElement;
            if (blockEl) openUrlPopupEditor('pdf', match.block, n, blockEl, originalState);
          } },
          { label: 'Bookmark', icon: '🔖', action: () => {
            const originalState: Partial<Block> = {
              type: match.block.type,
              content: match.block.content,
              url: match.block.url,
              bookmarkTitle: match.block.bookmarkTitle,
              bookmarkDesc: match.block.bookmarkDesc,
              bookmarkImage: match.block.bookmarkImage,
              bookmarkIcon: match.block.bookmarkIcon
            };
            match.block.type = 'bookmark';
            rerender(n);
            const blockEl = ctx.elements.edBody.querySelector(`[data-id="${bId}"]`) as HTMLElement;
            if (blockEl) openUrlPopupEditor('bookmark', match.block, n, blockEl, originalState);
          } },
          { label: 'Code', icon: '</>', action: () => { match.block.type = 'code'; match.block.language = 'plaintext'; rerender(n); } },
          { label: 'File', icon: '📎', action: () => { rerender(n); openMediaFilePrompt('file', match.block, n); } },
          { label: 'Mention', icon: '@', action: () => { openMentionPicker(match.block, n, bId); } },
          { label: 'Date', icon: '📅', action: () => { openDatePicker(match.block, n); } },
          { label: 'Equation', icon: '∑', action: () => { openTexPrompt('equation', match.block, n); } },
          { label: 'Emoji', icon: '😊', action: () => { openEmojiPicker(match.block, n, bId); } },
          { label: 'Contents', icon: '≡', action: () => { match.block.type = 'toc'; match.block.content = ''; rerender(n); } },
          { label: 'Template', icon: '🔁', action: () => { match.block.type = 'template'; match.block.content = 'Template button'; rerender(n); } },
          { label: 'Breadcrumb', icon: '›', action: () => { match.block.type = 'breadcrumb'; match.block.content = ''; rerender(n); } },
          { label: 'Math Equation', icon: '∫', action: () => { match.block.type = 'math'; rerender(n); } }
        ];
        
        ctx.openFly(dragHandle, menuItems);
      }
      return;
    }

    // ── Date badge click to edit ───────────────────────────────────────────
    const dateBadge = target.closest('.date-badge') as HTMLElement;
    if (dateBadge) {
      e.preventDefault();
      const blockEl = dateBadge.closest('.block-wrapper') as HTMLElement;
      if (!blockEl) return;
      const bId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        const oldDate = dateBadge.dataset.date || '';
        openCalendarPicker(dateBadge, oldDate, (newDate) => {
          match.block.content = match.block.content.replace(oldDate, newDate.trim());
          rerender(n);
        });
      }
      return;
    }

    // ── Math badge click to edit ───────────────────────────────────────────
    const mathBadge = target.closest('.math-badge') as HTMLElement;
    if (mathBadge) {
      e.preventDefault();
      const blockEl = mathBadge.closest('.block-wrapper') as HTMLElement;
      if (!blockEl) return;
      const bId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        const oldTex = mathBadge.dataset.tex || '';
        const newTex = prompt('Edit TeX / LaTeX formula:', oldTex);
        if (newTex !== null) {
          const oldFull = `$$${oldTex}$$`;
          const newFull = `$$${newTex.trim()}$$`;
          match.block.content = match.block.content.replace(oldFull, newFull);
          rerender(n);
        }
      }
      return;
    }

    // ── Wiki link navigation ───────────────────────────────────────────────
    const link = target.closest('.wiki-link') as HTMLElement;
    if (link) {
      const ref = link.dataset.ref!;
      const nId = resolveNoteId(ref, ctx.st.notes);
      if (nId) {
        ctx.selectNote(nId);
      } else {
        ctx.toast(`Note "${ref}" not found. Create it?`, 'Create', () => {
          const newN: Note = {
            id: 'n' + Math.random().toString(36).slice(2, 7),
            title: ref,
            body: '',
            blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
            nb: ctx.st.nb !== 'all' ? ctx.st.nb : 'design',
            tags: ctx.st.tag ? [ctx.st.tag] : [],
            pinned: false,
            date: 'Just now',
            ord: --ctx.st.ordMin
          };
          ctx.st.notes.unshift(newN);
          saveAndSync();
          ctx.selectNote(newN.id);
        });
      }
      return;
    }

    // ── Toggle block collapse/expand ───────────────────────────────────────
    const toggleBtn = target.closest('.toggle-arrow-btn') as HTMLElement;
    if (toggleBtn) {
      const bId = toggleBtn.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        match.block.collapsed = !match.block.collapsed;
        const blockEl = toggleBtn.closest('.block-wrapper') as HTMLElement;
        if (blockEl) {
          blockEl.classList.toggle('collapsed', !!match.block.collapsed);
          const childrenContainer = blockEl.querySelector(':scope > .block-children-container') as HTMLElement;
          if (childrenContainer) {
            childrenContainer.style.display = match.block.collapsed ? 'none' : '';
          }
        }
        saveAndSyncContent();
        ctx.markSaving();
      }
      return;
    }

    // ── Code block copy button ─────────────────────────────────────────────
    const copyBtn = target.closest('.code-copy-btn, .code-copy-btn-premium') as HTMLElement;
    if (copyBtn) {
      const bId = copyBtn.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        navigator.clipboard.writeText(match.block.content).then(() => {
          const originalText = copyBtn.textContent || '';
          if (copyBtn.classList.contains('code-copy-btn-premium')) {
            const oldSvg = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success, #00a300)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => { copyBtn.innerHTML = oldSvg; }, 1500);
          } else {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
          }
        });
      }
      return;
    }

    // ── Code block more options button ──────────────────────────────────────
    const moreBtn = target.closest('.code-more-btn-premium') as HTMLElement;
    if (moreBtn) {
      e.preventDefault();
      const bId = moreBtn.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        const menuItems: FlyoutItem[] = [
          { 
            label: match.block.codeWrap ? 'Unwrap lines' : 'Wrap lines', 
            icon: '↩', 
            action: () => { 
              match.block.codeWrap = !match.block.codeWrap; 
              rerender(n); 
            } 
          },
          { 
            label: match.block.codeFullWidth ? 'Standard width' : 'Full width', 
            icon: '↔', 
            action: () => { 
              match.block.codeFullWidth = !match.block.codeFullWidth; 
              rerender(n); 
            } 
          }
        ];
        ctx.openFly(moreBtn, menuItems);
      }
      return;
    }

    // ── Callout icon button click to edit icon ────────────────────────────
    const calloutIconBtn = target.closest('.callout-icon-btn') as HTMLElement;
    if (calloutIconBtn) {
      e.preventDefault();
      const blockEl = calloutIconBtn.closest('.block-wrapper') as HTMLElement;
      if (!blockEl) return;
      const bId = blockEl.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        openCalloutEmojiPicker(match.block, n, calloutIconBtn);
      }
      return;
    }

    // ── Template trigger button ───────────────────────────────────────────
    const templateBtn = target.closest('.template-trigger-btn') as HTMLElement;
    if (templateBtn) {
      const bId = templateBtn.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match && match.block.children && match.block.children.length > 0) {
        const copies = duplicateBlocksWithNewIds(match.block.children);
        match.parentList.splice(match.index + 1, 0, ...copies);
        rerender(n);
      } else {
        ctx.toast('Template is empty. Add blocks inside it first!', '', () => {});
      }
      return;
    }

    // ── Code language label click ──────────────────────────────────────────
    const langLabel = target.closest('.code-lang-label') as HTMLElement;
    if (langLabel) {
      const blockEl = langLabel.closest('.block-wrapper') as HTMLElement;
      const bId = blockEl?.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        const newLang = prompt('Enter code language:', match.block.language || 'plaintext');
        if (newLang !== null) {
          match.block.language = newLang.trim() || 'plaintext';
          rerender(n);
        }
      }
      return;
    }

    // ── Math block click to edit ───────────────────────────────────────────
    const mathBlock = target.closest('.block-math') as HTMLElement;
    if (mathBlock && !target.closest('.block-media-placeholder')) {
      if (ctx.root.querySelector('.math-popup-editor')) return; // already editing
      const bId = mathBlock.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        openMathPopupEditor(match.block, n, mathBlock);
      }
      return;
    }

    // ── Bookmark click prevention: require Ctrl/Cmd + click to navigate ────
    const bookmarkLink = target.closest('.block-bookmark-link, .block-bookmark-link-premium, .bookmark-link') as HTMLAnchorElement;
    if (bookmarkLink) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        let url = bookmarkLink.getAttribute('href');
        if (url) {
          if (!/^(https?:\/\/|file:\/\/|mailto:|tel:)/i.test(url)) {
            url = 'https://' + url;
          }
          if (window.electronAPI && window.electronAPI.openExternalUrl) {
            window.electronAPI.openExternalUrl(url);
          }
        }
      }
      return;
    }

    // ── Media placeholder: click to upload/enter URL ───────────────────────
    const placeholder = target.closest('.block-media-placeholder') as HTMLElement;
    if (placeholder) {
      const prompt_type = placeholder.dataset.prompt!;
      const bId = placeholder.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (!match) return;
      if (['image','video','audio','file'].includes(prompt_type)) {
        openMediaFilePrompt(prompt_type, match.block, n);
      } else if (['pdf','bookmark'].includes(prompt_type)) {
        openUrlPopupEditor(prompt_type, match.block, n, placeholder);
      } else if (prompt_type === 'math') {
        openMathPopupEditor(match.block, n, placeholder);
      }
      return;
    }

    // ── TOC link: jump to heading block ───────────────────────────────────
    const tocLink = target.closest('.toc-link') as HTMLElement;
    if (tocLink) {
      e.preventDefault();
      const bId = tocLink.dataset.blockid!;
      const el = ctx.elements.edBody.querySelector(`[data-id="${bId}"] .block-text-field`) as HTMLElement;
      if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }

    // ── Breadcrumb link ────────────────────────────────────────────────────
    const bcLink = target.closest('.bc-link') as HTMLElement;
    if (bcLink) {
      e.preventDefault();
      const noteId = bcLink.dataset.noteid!;
      if (noteId) ctx.selectNote(noteId);
      return;
    }
  });

  // ── Document keydown handler for block selection mode and autocompletes ───────────────────────
  document.addEventListener('keydown', e => {
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;

    const selectedIds = ctx.st.selectedBlockIds;
    if (selectedIds && selectedIds.size > 0) {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.classList.contains('block-text-field') || activeEl.tagName === 'INPUT')) {
        return;
      }

      const selected = Array.from(selectedIds);
      const firstId = selected[0];

      // Escape: Clear selection and focus active block
      if (e.key === 'Escape') {
        e.preventDefault();
        selectedIds.clear();
        rerenderSelectionStyles();
        const field = ctx.elements.edBody.querySelector(`[data-id="${firstId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field);
        return;
      }

      // Enter: Edit text inside selected block
      if (e.key === 'Enter') {
        e.preventDefault();
        selectedIds.clear();
        rerenderSelectionStyles();
        const field = ctx.elements.edBody.querySelector(`[data-id="${firstId}"] .block-text-field`) as HTMLElement;
        if (field) moveCaret(field);
        return;
      }

      // ArrowUp / ArrowDown selection navigation
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const flat = flattenVisibleBlocks(n.blocks);
        const lastId = selected[selected.length - 1];
        const idx = flat.findIndex(b => b.id === lastId);
        let nextIdx = idx;
        if (e.key === 'ArrowUp') {
          if (idx > 0) nextIdx = idx - 1;
        } else {
          if (idx < flat.length - 1) nextIdx = idx + 1;
        }

        const targetId = flat[nextIdx].id;
        if (e.shiftKey) {
          if (selectedIds.has(targetId)) {
            selectedIds.delete(lastId);
          } else {
            selectedIds.add(targetId);
          }
        } else {
          selectedIds.clear();
          selectedIds.add(targetId);
        }
        rerenderSelectionStyles();
        const blockEl = ctx.elements.edBody.querySelector(`[data-id="${targetId}"]`) as HTMLElement;
        if (blockEl) blockEl.scrollIntoView({ block: 'nearest' });
        return;
      }

      // Backspace / Delete: Delete selected blocks
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        for (const bId of selected) {
          const match = findBlockById(n.blocks, bId);
          if (match) {
            const idx = match.parentList.indexOf(match.block);
            if (idx !== -1) match.parentList.splice(idx, 1);
          }
        }
        selectedIds.clear();
        rerender(n);
        saveAndSyncContent();
        ctx.markSaving();
        return;
      }

      // Ctrl+D: Duplicate selected blocks
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const copies: string[] = [];
        const flat = flattenVisibleBlocks(n.blocks);
        selected.sort((a, b) => flat.findIndex(x => x.id === a) - flat.findIndex(x => x.id === b));

        for (const bId of selected) {
          const match = findBlockById(n.blocks, bId);
          if (match) {
            const copy = duplicateBlockWithNewIds(match.block);
            match.parentList.splice(match.index + 1, 0, copy);
            copies.push(copy.id);
          }
        }
        ctx.st.selectedBlockIds = new Set(copies);
        rerender(n);
        rerenderSelectionStyles();
        return;
      }

      // Ctrl+Shift+ArrowUp / Ctrl+Shift+ArrowDown: Move selected block around
      const isMoveUp = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowUp';
      const isMoveDown = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowDown';
      if (isMoveUp || isMoveDown) {
        e.preventDefault();
        const flat = flattenVisibleBlocks(n.blocks);
        selected.sort((a, b) => flat.findIndex(x => x.id === a) - flat.findIndex(x => x.id === b));

        if (isMoveUp) {
          for (const bId of selected) {
            const match = findBlockById(n.blocks, bId);
            if (match && match.index > 0) {
              match.parentList.splice(match.index, 1);
              match.parentList.splice(match.index - 1, 0, match.block);
            }
          }
        } else {
          for (let i = selected.length - 1; i >= 0; i--) {
            const bId = selected[i];
            const match = findBlockById(n.blocks, bId);
            if (match && match.index < match.parentList.length - 1) {
              match.parentList.splice(match.index, 1);
              match.parentList.splice(match.index + 1, 0, match.block);
            }
          }
        }
        rerender(n);
        rerenderSelectionStyles();
        return;
      }

      // Ctrl+Shift+H: Apply last color to selected blocks
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        for (const bId of selected) {
          const match = findBlockById(n.blocks, bId);
          if (match) {
            if (ctx.st.lastUsedColor !== undefined) match.block.textColor = ctx.st.lastUsedColor;
            if (ctx.st.lastUsedBgColor !== undefined) match.block.bgColor = ctx.st.lastUsedBgColor;
          }
        }
        rerender(n);
        rerenderSelectionStyles();
        saveAndSyncContent();
        ctx.markSaving();
        return;
      }

      // Ctrl+Shift+M: Comment on selected blocks
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const firstMatch = findBlockById(n.blocks, firstId);
        const commentVal = prompt('Enter comment for selected block(s):', firstMatch?.block.comment || '');
        if (commentVal !== null) {
          const val = commentVal.trim() || undefined;
          for (const bId of selected) {
            const match = findBlockById(n.blocks, bId);
            if (match) match.block.comment = val;
          }
          rerender(n);
          rerenderSelectionStyles();
          saveAndSyncContent();
          ctx.markSaving();
        }
        return;
      }

      // Ctrl+Alt+T: Toggle all toggle lists
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        
        let hasAnyExpanded = false;
        const findExpanded = (list: Block[]) => {
          for (const b of list) {
            if (isToggleType(b.type) && !b.collapsed) {
              hasAnyExpanded = true;
              return;
            }
            if (b.children) findExpanded(b.children);
          }
        };
        findExpanded(n.blocks);

        const targetCollapse = hasAnyExpanded;
        const setCollapse = (list: Block[]) => {
          for (const b of list) {
            if (isToggleType(b.type)) {
              b.collapsed = targetCollapse;
            }
            if (b.children) setCollapse(b.children);
          }
        };
        setCollapse(n.blocks);

        rerender(n);
        rerenderSelectionStyles();
        saveAndSyncContent();
        ctx.markSaving();
        return;
      }

      // Ctrl+/: Open action picker for selected block
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const blockEl = ctx.elements.edBody.querySelector(`[data-id="${firstId}"]`) as HTMLElement;
        const textField = blockEl?.querySelector('.block-text-field') as HTMLElement;
        if (blockEl && textField) {
          activeSlashBlockId = firstId;
          showSlashMenu(blockEl, textField);
        }
        return;
      }

      // Space: Fullscreen media lightbox
      if (e.key === ' ') {
        e.preventDefault();
        if (selected.length === 1) {
          const match = findBlockById(n.blocks, firstId);
          if (match && (match.block.type === 'image' || match.block.type === 'video')) {
            let lightbox = ctx.root.querySelector('.fullscreen-media-lightbox') as HTMLElement;
            if (lightbox) {
              lightbox.remove();
            } else {
              lightbox = document.createElement('div');
              lightbox.className = 'fullscreen-media-lightbox';
              lightbox.innerHTML = match.block.type === 'image'
                ? `<img src="${match.block.url}" />`
                : `<video src="${match.block.url}" controls autoplay></video>`;
              lightbox.addEventListener('click', () => lightbox.remove());
              ctx.root.appendChild(lightbox);
            }
          }
        }
        return;
      }

      // Ctrl+Enter: Modify block actions
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const match = findBlockById(n.blocks, firstId);
        if (match) {
          const matchWiki = match.block.content.match(/\[\[(.*?)\]\]/);
          if (matchWiki) {
            const ref = matchWiki[1].trim();
            const noteId = resolveNoteId(ref, ctx.st.notes);
            if (noteId) {
              ctx.selectNote(noteId);
              return;
            }
          } else if (match.block.type === 'todo') {
            match.block.checked = !match.block.checked;
            rerender(n);
            rerenderSelectionStyles();
          } else if (isToggleType(match.block.type)) {
            match.block.collapsed = !match.block.collapsed;
            rerender(n);
            rerenderSelectionStyles();
          } else if (match.block.type === 'image' || match.block.type === 'video') {
            let lightbox = ctx.root.querySelector('.fullscreen-media-lightbox') as HTMLElement;
            if (lightbox) {
              lightbox.remove();
            } else {
              lightbox = document.createElement('div');
              lightbox.className = 'fullscreen-media-lightbox';
              lightbox.innerHTML = match.block.type === 'image'
                ? `<img src="${match.block.url}" />`
                : `<video src="${match.block.url}" controls autoplay></video>`;
              lightbox.addEventListener('click', () => lightbox.remove());
              ctx.root.appendChild(lightbox);
            }
          }
        }
        return;
      }
    }
  });

  // Alt+Shift+Click (Option+Shift+Click on Mac) to select/de-select entire block
  ctx.elements.edBody.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const blockId = blockEl.dataset.id!;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isToggleSelect = e.shiftKey && (isMac ? e.metaKey : e.altKey);

    if (isToggleSelect) {
      e.preventDefault();
      e.stopPropagation();
      if (!ctx.st.selectedBlockIds) ctx.st.selectedBlockIds = new Set<string>();
      if (ctx.st.selectedBlockIds.has(blockId)) {
        ctx.st.selectedBlockIds.delete(blockId);
      } else {
        ctx.st.selectedBlockIds.add(blockId);
      }
      rerenderSelectionStyles();
      return;
    }

    // Shift + Click to select range of blocks
    if (e.shiftKey && !isToggleSelect) {
      const selected = Array.from(ctx.st.selectedBlockIds || []);
      if (selected.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const flat = flattenVisibleBlocks(n.blocks);
          const firstIdx = flat.findIndex(b => b.id === selected[0]);
          const thisIdx = flat.findIndex(b => b.id === blockId);
          if (firstIdx !== -1 && thisIdx !== -1) {
            const start = Math.min(firstIdx, thisIdx);
            const end = Math.max(firstIdx, thisIdx);
            ctx.st.selectedBlockIds = new Set(flat.slice(start, end + 1).map(b => b.id));
            rerenderSelectionStyles();
          }
        }
      }
    }
  });

  // ── Code block controls event listeners ─────────────────────────────────
  ctx.elements.edBody.addEventListener('click', e => {
    const target = e.target as HTMLElement;

    // Code language dropdown trigger click
    const langTrigger = target.closest('.code-lang-container') as HTMLElement;
    if (langTrigger) {
      e.preventDefault();
      e.stopPropagation();
      const bId = langTrigger.dataset.id!;
      openLanguagePicker(langTrigger, bId);
      return;
    }
    
    // Wrap button click
    const wrapBtn = target.closest('.code-wrap-btn') as HTMLElement;
    if (wrapBtn) {
      e.preventDefault();
      const bId = wrapBtn.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        match.block.codeWrap = !match.block.codeWrap;
        rerender(n);
      }
      return;
    }

    // Fullwidth button click
    const fullWidthBtn = target.closest('.code-fullwidth-btn') as HTMLElement;
    if (fullWidthBtn) {
      e.preventDefault();
      const bId = fullWidthBtn.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        match.block.codeFullWidth = !match.block.codeFullWidth;
        rerender(n);
      }
      return;
    }
  });

  // Focus transition: strip tags to plaintext
  ctx.elements.edBody.addEventListener('focusin', e => {
    const target = e.target as HTMLElement;
    
    // Clear selection when focusing any editable block field
    if (target.classList.contains('block-text-field') || target.classList.contains('block-code-field')) {
      if (ctx.st.selectedBlockIds && ctx.st.selectedBlockIds.size > 0) {
        ctx.st.selectedBlockIds.clear();
        rerenderSelectionStyles();
      }
    }

    if (!target.classList.contains('block-code-field')) return;
    
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const bId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      target.textContent = match.block.content || '';
    }
  });

  // Blur transition: apply Prism syntax highlighting
  ctx.elements.edBody.addEventListener('focusout', e => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('block-code-field')) return;
    
    const blockEl = target.closest('.block-wrapper') as HTMLElement;
    if (!blockEl) return;
    const bId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, bId);
    if (match) {
      const rawText = target.textContent || '';
      match.block.content = rawText;
      
      const lang = match.block.language || 'plaintext';
      const hasPrism = (window as any).Prism;
      if (hasPrism && lang !== 'plaintext') {
        try {
          const grammar = (window as any).Prism.languages[lang];
          if (grammar) {
            target.innerHTML = (window as any).Prism.highlight(rawText, grammar, lang);
          } else {
            target.innerHTML = esc(rawText);
          }
        } catch (err) {
          target.innerHTML = esc(rawText);
        }
      } else {
        target.innerHTML = esc(rawText);
      }
      
      saveAndSyncContent();
      ctx.markSaving();
    }
  });
}
