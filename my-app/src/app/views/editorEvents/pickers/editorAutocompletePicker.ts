import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { findBlockById, genId, cleanBadgeHtml, resolveNoteId } from '../../../../utils';
import { saveAndSyncContent, saveAndSync } from '../../../../store';
import { formatWikilink, generateBlockIdentifier, extractBlockIdTag } from '../../../../utils/linkParser';

let activePickerEl: HTMLElement | null = null;
let activePickerBlockId: string | null = null;
let activePickerSymbol: string | null = null;
let activeTextField: HTMLElement | null = null;
let activePickerQuery = '';
let selectedPickerIndex = 0;
let visiblePickerItems: any[] = [];

export function getActivePickerEl() { return activePickerEl; }
export function getSelectedPickerIndex() { return selectedPickerIndex; }
export function setSelectedPickerIndex(idx: number) { selectedPickerIndex = idx; }
export function getVisiblePickerItems() { return visiblePickerItems; }

function getNextWednesday() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilWednesday = (3 - day + 7) % 7 || 7;
  const nextWed = new Date(today.getTime() + daysUntilWednesday * 86400000);
  return nextWed.toISOString().slice(0, 10);
}

function deleteTriggerAndQueryAtCaret(textField: HTMLElement, symbol: string, query: string) {
  const totalOffset = symbol.length + query.length;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const startOffset = Math.max(0, range.startOffset - totalOffset);
      range.setStart(range.startContainer, startOffset);
      range.deleteContents();
      return;
    }
  }
  const text = textField.textContent || '';
  const token = symbol + query;
  const lastIdx = text.lastIndexOf(token);
  if (lastIdx !== -1) {
    textField.textContent = text.slice(0, lastIdx) + text.slice(lastIdx + token.length);
  }
}

function insertTextAtCaret(ctx: AppContext, el: HTMLElement, val: string) {
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

  const blockEl = el.closest('.block-wrapper') as HTMLElement;
  if (blockEl) {
    const blockId = blockEl.dataset.id!;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) {
      const match = findBlockById(n.blocks, blockId);
      if (match) {
        match.block.content = cleanBadgeHtml(el);
      }
    }
  }
}

function getNoteHeadings(note: Note): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  function walk(blocks: Block[]) {
    for (const b of blocks) {
      if (b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3') {
        const lvl = b.type === 'heading1' ? 1 : b.type === 'heading2' ? 2 : 3;
        const text = (b.content || '').replace(/<[^>]+>/g, '').trim();
        if (text) headings.push({ level: lvl, text });
      }
      if (b.children && b.children.length > 0) walk(b.children);
    }
  }
  if (note.blocks && note.blocks.length > 0) walk(note.blocks);
  return headings;
}

function getNoteBlocks(note: Note): { block: Block; text: string; id: string }[] {
  const items: { block: Block; text: string; id: string }[] = [];
  function walk(blocks: Block[]) {
    for (const b of blocks) {
      const rawText = (b.content || '').replace(/<[^>]+>/g, '').trim();
      if (rawText && b.type !== 'divider' && b.type !== 'toc' && b.type !== 'breadcrumb') {
        const { text, blockId } = extractBlockIdTag(rawText);
        items.push({ block: b, text: text || rawText, id: blockId || b.id });
      }
      if (b.children && b.children.length > 0) walk(b.children);
    }
  }
  if (note.blocks && note.blocks.length > 0) walk(note.blocks);
  return items;
}

export function showAutocompletePicker(ctx: AppContext, block: Block, textField: HTMLElement, symbol: string, query = '') {
  closeAutocompletePicker();
  selectedPickerIndex = 0;
  activePickerSymbol = symbol;
  activePickerBlockId = block.id;
  activeTextField = textField;
  activePickerQuery = query;

  const isEmbed = symbol === '![[';
  const picker = document.createElement('div');
  picker.className = 'slash-menu autocomplete-picker absolute z-[1000] bg-card dark:bg-[#202020] border border-border rounded-xl shadow-xl max-h-[300px] min-w-[280px] overflow-y-auto py-1.5 flex flex-col';

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
            insertTextAtCaret(ctx, textField, `@${m.name}`);
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
            insertTextAtCaret(ctx, textField, `[[${x.title || 'Untitled'}]]`);
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
            insertTextAtCaret(ctx, textField, `📅 ${d.val}`);
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
            insertTextAtCaret(ctx, textField, `⏰ Reminder: ${time}`);
            ctx.toast(`Reminder set for ${time}`);
            saveAndSyncContent();
          }
        }
      });
    }
  } else if (symbol === '[[' || symbol === '![[' || symbol === '+') {
    const currentNote = ctx.st.notes.find(x => x.id === ctx.st.sel);

    // 1. Alias Mode: "Note#Heading|alias"
    if (query.includes('|')) {
      const [targetPart, aliasPart] = query.split('|');
      const aliasClean = aliasPart.trim();
      items.push({
        label: aliasClean ? `Set alias: "${aliasClean}"` : 'Type custom display text...',
        desc: `Links to ${targetPart || 'Note'}`,
        icon: '🏷',
        action: () => {
          const linkStr = formatWikilink(targetPart, undefined, undefined, aliasClean || undefined, isEmbed);
          insertTextAtCaret(ctx, textField, linkStr);
          saveAndSyncContent();
        }
      });
    }
    // 2. Vault-Wide Heading Search: "##heading"
    else if (query.startsWith('##')) {
      const headingQuery = query.slice(2).trim().toLowerCase();
      for (const note of ctx.st.notes) {
        const headings = getNoteHeadings(note);
        for (const h of headings) {
          if (!headingQuery || h.text.toLowerCase().includes(headingQuery)) {
            items.push({
              label: h.text,
              desc: `${note.title || 'Untitled'} (H${h.level})`,
              icon: '⚓',
              action: () => {
                const targetTitle = note.id === ctx.st.sel ? '' : (note.title || 'Untitled');
                const linkStr = formatWikilink(targetTitle, h.text, undefined, undefined, isEmbed);
                insertTextAtCaret(ctx, textField, linkStr);
                saveAndSyncContent();
              }
            });
            if (items.length >= 25) break;
          }
        }
        if (items.length >= 25) break;
      }
    }
    // 3. Vault-Wide Block Search: "^^block"
    else if (query.startsWith('^^')) {
      const blockQuery = query.slice(2).trim().toLowerCase();
      for (const note of ctx.st.notes) {
        const blocks = getNoteBlocks(note);
        for (const item of blocks) {
          if (!blockQuery || item.text.toLowerCase().includes(blockQuery)) {
            items.push({
              label: item.text.length > 50 ? item.text.substring(0, 48) + '...' : item.text,
              desc: `${note.title || 'Untitled'} (Block)`,
              icon: '⚑',
              action: () => {
                let targetId = item.id;
                if (!item.block.content.includes(` ^`)) {
                  const newId = generateBlockIdentifier();
                  item.block.content += ` ^${newId}`;
                  targetId = newId;
                }
                const targetTitle = note.id === ctx.st.sel ? '' : (note.title || 'Untitled');
                const linkStr = formatWikilink(targetTitle, undefined, targetId, undefined, isEmbed);
                insertTextAtCaret(ctx, textField, linkStr);
                saveAndSyncContent();
              }
            });
            if (items.length >= 25) break;
          }
        }
        if (items.length >= 25) break;
      }
    }
    // 4. Note-Specific Block Search: "Note#^block" or "#^block"
    else if (query.includes('#^')) {
      const [notePart, blockPart] = query.split('#^');
      const targetNote = notePart.trim()
        ? ctx.st.notes.find(n => (n.title || '').toLowerCase().trim() === notePart.toLowerCase().trim() || n.id === resolveNoteId(notePart, ctx.st.notes))
        : currentNote;

      if (targetNote) {
        const blocks = getNoteBlocks(targetNote);
        const bQuery = blockPart.trim().toLowerCase();
        for (const item of blocks) {
          if (!bQuery || item.text.toLowerCase().includes(bQuery)) {
            items.push({
              label: item.text.length > 50 ? item.text.substring(0, 48) + '...' : item.text,
              desc: `${targetNote.title || 'Untitled'} (Block ref)`,
              icon: '⚑',
              action: () => {
                let targetId = item.id;
                if (!item.block.content.includes(` ^`)) {
                  const newId = generateBlockIdentifier();
                  item.block.content += ` ^${newId}`;
                  targetId = newId;
                }
                const targetTitle = targetNote.id === ctx.st.sel ? '' : (targetNote.title || 'Untitled');
                const linkStr = formatWikilink(targetTitle, undefined, targetId, undefined, isEmbed);
                insertTextAtCaret(ctx, textField, linkStr);
                saveAndSyncContent();
              }
            });
            if (items.length >= 25) break;
          }
        }
      }
    }
    // 5. Note-Specific Heading Search: "Note#heading" or "#heading"
    else if (query.includes('#')) {
      const [notePart, headingPart] = query.split('#');
      const targetNote = notePart.trim()
        ? ctx.st.notes.find(n => (n.title || '').toLowerCase().trim() === notePart.toLowerCase().trim() || n.id === resolveNoteId(notePart, ctx.st.notes))
        : currentNote;

      if (targetNote) {
        const headings = getNoteHeadings(targetNote);
        const hQuery = headingPart.trim().toLowerCase();
        for (const h of headings) {
          if (!hQuery || h.text.toLowerCase().includes(hQuery)) {
            items.push({
              label: h.text,
              desc: `${targetNote.title || 'Untitled'} (H${h.level})`,
              icon: '⚓',
              action: () => {
                const targetTitle = targetNote.id === ctx.st.sel ? '' : (targetNote.title || 'Untitled');
                const linkStr = formatWikilink(targetTitle, h.text, undefined, undefined, isEmbed);
                insertTextAtCaret(ctx, textField, linkStr);
                saveAndSyncContent();
              }
            });
          }
        }
      }
    }
    // 6. Default Note Search
    else {
      // Suggest headings and blocks inside current note if query is empty
      if (!query && currentNote) {
        items.push({
          label: '# Heading in this note...',
          desc: 'Link to a section in current page',
          icon: '⚓',
          action: () => {
            showAutocompletePicker(ctx, block, textField, symbol, '#');
          }
        });
        items.push({
          label: '#^ Block in this note...',
          desc: 'Link to a paragraph or block in current page',
          icon: '⚑',
          action: () => {
            showAutocompletePicker(ctx, block, textField, symbol, '#^');
          }
        });
      }

      ctx.st.notes.forEach(x => {
        if ((x.title || '').toLowerCase().includes(query.toLowerCase())) {
          items.push({
            label: x.title || 'Untitled',
            desc: x.id === ctx.st.sel ? 'Current note' : 'Link to note',
            icon: '📄',
            action: () => {
              const linkStr = formatWikilink(x.title || 'Untitled', undefined, undefined, undefined, isEmbed);
              insertTextAtCaret(ctx, textField, linkStr);
              saveAndSyncContent();
            }
          });
        }
      });

      if (query && !items.some(i => i.label.toLowerCase() === query.toLowerCase())) {
        items.push({
          label: `Create new note: "${query}"`,
          desc: 'Creates a new page in current folder',
          icon: '✨',
          action: () => {
            const parentN = ctx.st.notes.find(x => x.id === ctx.st.sel);
            const newN: Note = {
              id: 'n' + Math.random().toString(36).slice(2, 7),
              title: query,
              body: '',
              blocks: [{ id: genId(), type: 'paragraph', content: '', children: [] }],
              nb: parentN ? parentN.nb : 'design',
              tags: [],
              pinned: false,
              date: 'Just now',
              ord: --ctx.st.ordMin,
              parentId: parentN ? parentN.parentId : undefined
            };
            ctx.st.notes.unshift(newN);
            saveAndSync();
            const linkStr = formatWikilink(query, undefined, undefined, undefined, isEmbed);
            insertTextAtCaret(ctx, textField, linkStr);
          }
        });
      }

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
              const linkStr = formatWikilink(title, undefined, undefined, undefined, isEmbed);
              insertTextAtCaret(ctx, textField, linkStr);
            }
          }
        });
      }
    }
  }

  if (items.length === 0) {
    closeAutocompletePicker();
    return;
  }
  visiblePickerItems = items;

  picker.innerHTML = items.map((item, idx) => `
    <button class="slash-item flex items-center gap-2 px-3 py-2 text-[13px] text-text1 bg-transparent border-none text-left cursor-pointer w-full hover:bg-bg2 dark:hover:bg-white/10 [&.selected]:bg-bg2 dark:[&.selected]:bg-white/10 ${idx === selectedPickerIndex ? 'selected' : ''}" data-index="${idx}">
      <span class="slash-item-icon text-[14px] opacity-85 min-w-[18px] text-center font-mono">${item.icon}</span>
      <div class="slash-item-info flex flex-col gap-[1px]">
        <span class="slash-item-label text-[13px] font-medium leading-[1.3]">${item.label}</span>
        <span class="slash-item-desc text-[11px] text-text3 leading-[1.2]">${item.desc || ''}</span>
      </div>
    </button>
  `).join('');

  const rect = textField.getBoundingClientRect();
  const innerRect = ctx.elements.edInner.getBoundingClientRect();
  picker.style.left = (rect.left - innerRect.left) + 'px';

  ctx.elements.edInner.appendChild(picker);
  activePickerEl = picker;

  const pickerHeight = picker.offsetHeight || 300;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow < pickerHeight && spaceAbove > spaceBelow) {
    picker.style.top = (rect.top - innerRect.top - pickerHeight - 4) + 'px';
  } else {
    picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
  }

  picker.querySelectorAll('.slash-item').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const index = parseInt((btn as HTMLElement).dataset.index!);
      executePickerCommand(ctx, index);
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });
}

export function updatePickerSelection(menu: HTMLElement) {
  menu.querySelectorAll('.slash-item').forEach((btn, i) => {
    btn.classList.toggle('selected', i === selectedPickerIndex);
  });
  const sel = menu.querySelector('.slash-item.selected') as HTMLElement;
  if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
}

export function executePickerCommand(ctx: AppContext, index: number) {
  if (index >= 0 && index < visiblePickerItems.length) {
    const item = visiblePickerItems[index];
    const textField = activeTextField || (document.activeElement as HTMLElement);
    const blockId = activePickerBlockId;
    const symbol = activePickerSymbol || '';
    const query = activePickerQuery || '';

    if (textField && textField.classList.contains('block-text-field')) {
      textField.focus();
      deleteTriggerAndQueryAtCaret(textField, symbol, query);

      if (blockId) {
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, blockId);
          if (match) {
            match.block.content = cleanBadgeHtml(textField);
          }
        }
      }
    }

    item.action();

    if (blockId) {
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (n) {
        const match = findBlockById(n.blocks, blockId);
        if (match && textField) {
          match.block.content = cleanBadgeHtml(textField);
          saveAndSyncContent();
          ctx.markSaving();
        }
      }
    }
  }
  closeAutocompletePicker();
}

export function closeAutocompletePicker() {
  if (activePickerEl) {
    activePickerEl.remove();
    activePickerEl = null;
  }
  activePickerBlockId = null;
  activePickerSymbol = null;
  activeTextField = null;
  activePickerQuery = '';
  selectedPickerIndex = 0;
  visiblePickerItems = [];
}
