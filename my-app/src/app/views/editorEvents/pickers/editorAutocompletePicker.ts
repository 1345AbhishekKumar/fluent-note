import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { findBlockById, moveCaret, genId, cleanBadgeHtml } from '../../../../utils';
import { saveAndSyncContent, saveAndSync } from '../../../../store';
import { rerenderNote } from './editorPopups';

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
        match.block.content = el.textContent || '';
      }
    }
  }
}

export function showAutocompletePicker(ctx: AppContext, block: Block, textField: HTMLElement, symbol: string, query = '') {
  closeAutocompletePicker();
  selectedPickerIndex = 0;
  activePickerSymbol = symbol;
  activePickerBlockId = block.id;
  activeTextField = textField;
  activePickerQuery = query;

  const picker = document.createElement('div');
  picker.className = 'slash-menu autocomplete-picker absolute z-[1000] bg-card dark:bg-[#202020] border border-border rounded-xl shadow-xl max-h-[280px] min-w-[250px] overflow-y-auto py-1.5 flex flex-col';

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
  } else if (symbol === '[[' || symbol === '+') {
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
            insertTextAtCaret(ctx, textField, `[[${title}]]`);
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
              insertTextAtCaret(ctx, textField, `[[${title}]]`);
            }
          });
        }
      });
    }
  }

  if (items.length === 0) return;
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

  const pickerHeight = picker.offsetHeight || 280;
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
    });
    btn.addEventListener('click', () => {
      const index = parseInt((btn as HTMLElement).dataset.index!);
      executePickerCommand(ctx, index);
    });
  });
}

export function updatePickerSelection(menu: HTMLElement) {
  menu.querySelectorAll('.slash-item').forEach((btn, i) => {
    btn.classList.toggle('selected', i === selectedPickerIndex);
  });
  const sel = menu.querySelector('.slash-item.selected') as HTMLElement;
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

export function executePickerCommand(ctx: AppContext, index: number) {
  if (index >= 0 && index < visiblePickerItems.length) {
    const item = visiblePickerItems[index];
    const textField = activeTextField || (document.activeElement as HTMLElement);
    const blockId = activePickerBlockId;
    
    if (textField && textField.classList.contains('block-text-field')) {
      textField.focus();
      const text = textField.textContent || '';
      const symbol = activePickerSymbol || '';
      const query = activePickerQuery || '';
      const totalOffset = symbol.length + query.length;
      
      const lastIdx = text.lastIndexOf(symbol);
      if (lastIdx !== -1) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const startOffset = Math.max(0, range.startOffset - totalOffset);
            range.setStart(range.startContainer, startOffset);
            range.deleteContents();
          } else {
            textField.textContent = text.slice(0, lastIdx);
          }
        } else {
          textField.textContent = text.slice(0, lastIdx);
        }
        
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
    }
    
    item.action();
    
    if (blockId) {
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (n) {
        const match = findBlockById(n.blocks, blockId);
        if (match && textField) {
          match.block.content = cleanBadgeHtml(textField);
          rerenderNote(ctx, n);
          const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
          if (field) moveCaret(field);
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
