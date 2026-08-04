import type { AppContext } from '../context';
import type { Block, BlockType, Note } from '../../types';
import { 
  findBlockById, getBlockLevel, flattenBlocks, flattenVisibleBlocks,
  isCaretAtStart, moveCaret, resolveNoteId, genId, renderBlockTree
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
    { type: 'toggle',     label: 'Toggle',     desc: 'Collapsible section',     icon: '▶',   aliases: ['toggle','collapse'] },
    { type: 'quote',      label: 'Quote',      desc: 'Block quote',             icon: '❝',   aliases: ['quote','blockquote'] },
    { type: 'divider',    label: 'Divider',    desc: 'Horizontal rule',         icon: '—',   aliases: ['div','divider','hr','separator'] },
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
  ];

  // ── Emoji set (simple grid) ───────────────────────────────────────────────
  const EMOJI_LIST = ['😀','😂','🥰','😎','🤔','😢','🎉','🔥','💡','✅','❌','⭐','🚀','🌿','🎵','📚','💻','🔗','📝','🗑','⚡','🌈','🎨','🏆','📌','🔒','🌍','⚙️','🧠','💬'];

  function filterSlashItems(query: string): SlashItem[] {
    if (!query) return allSlashItems;
    const q = query.toLowerCase();
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

  function updateSlashMenuSelection(menu: HTMLElement) {
    menu.querySelectorAll('.slash-item').forEach((btn, i) => {
      btn.classList.toggle('selected', i === selectedSlashItemIndex);
    });
    // Ensure selected item is in view
    const sel = menu.querySelector('.slash-item.selected') as HTMLElement;
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  // ── Helpers for inline / advanced commands ────────────────────────────────
  function openUrlPrompt(cmdType: string, block: Block, n: Note) {
    const url = prompt(`Enter URL for ${cmdType}:`, block.url || '');
    if (url === null) return;
    block.type = cmdType as BlockType;
    block.url = url;
    block.content = url;
    rerender(n);
    const match = findBlockById(n.blocks, block.id);
    if (match) {
      focusNextBlockOrNew(n, match.index, match.parentList);
    }
  }

  function openMediaFilePrompt(cmdType: string, block: Block, n: Note) {
    const input = document.createElement('input');
    input.type = 'file';
    if (cmdType === 'image') input.accept = 'image/*';
    else if (cmdType === 'video') input.accept = 'video/*';
    else if (cmdType === 'audio') input.accept = 'audio/*';
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

  function openDatePicker(block: Block, n: Note) {
    const today = new Date().toISOString().slice(0, 10);
    const val = prompt('Enter date (YYYY-MM-DD):', today);
    if (!val) return;
    block.content = (block.content || '') + `📅 ${val}`;
    block.type = 'paragraph';
    rerender(n);
    const field = ctx.elements.edBody.querySelector(`[data-id="${block.id}"] .block-text-field`) as HTMLElement;
    if (field) moveCaret(field);
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

  function rerender(n: Note) {
    ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
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
      case 'heading1': case 'heading2': case 'heading3':
      case 'bullet': case 'numbered':
      case 'quote': case 'toggle':
        match.block.type = cmdType as BlockType;
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
      case 'pdf': case 'bookmark':
        openUrlPrompt(cmdType, match.block, n);
        return;

      // ── inline: emoji ─────────────────────────────────────────────────
      case 'emoji':
        openEmojiPicker(match.block, n, blockId);
        return;

      // ── inline: date ──────────────────────────────────────────────────
      case 'date':
        openDatePicker(match.block, n);
        return;

      // ── inline: equation / math ───────────────────────────────────────
      case 'equation': case 'math':
        openTexPrompt(cmdType, match.block, n);
        return;

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
          { prefix: '> ',   type: 'quote',     strip: 2 },
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

      // ── Toggle block: Enter creates a child inside the toggle ─────
      if (currentType === 'toggle') {
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
            const originalLength = prevBlock.content.length;
            prevBlock.content += match.block.content;
            
            if (match.block.children && match.block.children.length > 0) {
              prevBlock.children = [...prevBlock.children, ...match.block.children];
            }
            
            const parentIndex = match.parentList.indexOf(match.block);
            if (parentIndex !== -1) {
              match.parentList.splice(parentIndex, 1);
            }
            
            ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
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
      if (flatIndex > 0) {
        e.preventDefault();
        const prevField = ctx.elements.edBody.querySelector(`[data-id="${flat[flatIndex - 1].id}"] .block-text-field`) as HTMLElement;
        if (prevField) {
          moveCaret(prevField, false);
        }
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      const flat = flattenVisibleBlocks(n.blocks);
      const flatIndex = flat.findIndex(b => b.id === blockId);
      if (flatIndex < flat.length - 1) {
        e.preventDefault();
        const nextField = ctx.elements.edBody.querySelector(`[data-id="${flat[flatIndex + 1].id}"] .block-text-field`) as HTMLElement;
        if (nextField) {
          moveCaret(nextField, true);
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
              
              ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
              const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
              if (field) field.focus();
              saveAndSyncContent();
              ctx.markSaving();
            } else if (parentList !== n.blocks) {
              const rootParentIndex = n.blocks.findIndex(b => b.children === parentList);
              if (rootParentIndex !== -1) {
                parentList.splice(index, 1);
                n.blocks.splice(rootParentIndex + 1, 0, match.block);
                
                ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
                const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
                if (field) field.focus();
                saveAndSyncContent();
                ctx.markSaving();
              }
            }
          }
        } else {
          if (index > 0 && level < 2) {
            const precedingSibling = parentList[index - 1];
            parentList.splice(index, 1);
            if (!precedingSibling.children) precedingSibling.children = [];
            precedingSibling.children.push(match.block);
            
            ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
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

  // Close slash menu on outside clicks
  document.addEventListener('mousedown', e => {
    const menu = ctx.root.querySelector('.slash-menu');
    if (menu && !menu.contains(e.target as Node) && !(e.target as HTMLElement).classList.contains('block-text-field')) {
      closeSlashMenu();
    }
  });

  ctx.elements.edBody.addEventListener('click', e => {
    const target = e.target as HTMLElement;

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
        ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
        saveAndSyncContent();
        ctx.markSaving();
      }
      return;
    }

    // ── Code block copy button ─────────────────────────────────────────────
    const copyBtn = target.closest('.code-copy-btn') as HTMLElement;
    if (copyBtn) {
      const bId = copyBtn.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        navigator.clipboard.writeText(match.block.content).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
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
      const bId = mathBlock.dataset.id!;
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (!n) return;
      const match = findBlockById(n.blocks, bId);
      if (match) {
        openTexPrompt(match.block.type, match.block, n);
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
        openUrlPrompt(prompt_type, match.block, n);
      } else if (prompt_type === 'math') {
        openTexPrompt('math', match.block, n);
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
}
