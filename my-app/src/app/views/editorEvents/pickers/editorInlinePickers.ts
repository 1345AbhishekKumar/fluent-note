import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { moveCaret } from '../../../../utils';
import { rerenderNote } from './editorPopupUtils';

export const EMOJI_LIST = [
  '😀','😂','🥰','😎','🤔','😢','🎉','🔥','💡','✅','❌','⭐','🚀','🌿','🎵','📚',
  '💻','🔗','📝','🗑','⚡','🌈','🎨','🏆','📌','🔒','🌍','⚙️','🧠','💬','❤️','👍',
  '👎','🙌','👏','🙏','💪','✨','🎯','🔮','💎','🧿','📍','🚩','🔔','🎁','🎈','🛒',
  '☕','🍕','🍔','🍟','🍉','🍎','🍓','🎂','🍻','🥂','⚽','🏀','🎮','🎲','♟️','✈️',
  '🚗','🛵','🏠','🏖️','⛰️','🌙','☀️','☁️','☔','❄️','🔍','🔑','📁','📂','📊','📈'
];

export function openEmojiPicker(ctx: AppContext, block: Block, n: Note, blockId: string) {
  ctx.root.querySelector('.emoji-picker')?.remove();
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  let selectedIndex = 0;

  picker.innerHTML = EMOJI_LIST.map((e, idx) =>
    `<button class="emoji-btn ${idx === 0 ? 'selected' : ''}" data-emoji="${e}" data-index="${idx}">${e}</button>`
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
    const btns = picker.querySelectorAll('.emoji-btn');
    btns.forEach((btn, idx) => {
      btn.classList.toggle('selected', idx === selectedIndex);
    });
    const sel = picker.querySelector('.emoji-btn.selected') as HTMLElement;
    if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
  };

  const selectEmoji = (emoji: string) => {
    block.content = (block.content || '') + emoji;
    block.type = 'paragraph';
    rerenderNote(ctx, n);
    const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
    if (field) moveCaret(field);
    cleanup();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    const cols = 8;
    const total = EMOJI_LIST.length;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % total;
      updateSelection();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + total) % total;
      updateSelection();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + cols) % total;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - cols + total) % total;
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectEmoji(EMOJI_LIST[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
    }
  };

  const closePicker = (e: MouseEvent) => {
    if (!picker.contains(e.target as Node)) {
      cleanup();
    }
  };

  const cleanup = () => {
    picker.remove();
    document.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('click', closePicker);
  };

  picker.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const emoji = (btn as HTMLElement).dataset.emoji!;
      selectEmoji(emoji);
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  document.addEventListener('keydown', handleKeydown, true);
  setTimeout(() => {
    document.addEventListener('click', closePicker);
  }, 0);
}

export function openCalendarPicker(ctx: AppContext, anchorEl: HTMLElement, currentDate: string, onSelect: (newDate: string) => void) {
  const input = document.createElement('input');
  input.type = 'date';
  const match = currentDate.match(/\d{4}-\d{2}-\d{2}/);
  input.value = match ? match[0] : new Date().toISOString().slice(0, 10);
  input.style.position = 'fixed';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';
  input.style.zIndex = '99999';
  
  const sel = window.getSelection();
  let rect: DOMRect | null = null;
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects && rects.length > 0) {
      rect = rects[0] as DOMRect;
    }
  }
  if (!rect) {
    rect = anchorEl.getBoundingClientRect();
  }
  
  input.style.left = `${rect.left}px`;
  input.style.top = `${rect.bottom}px`;
  
  document.body.appendChild(input);
  
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

export function openDatePicker(ctx: AppContext, block: Block, n: Note) {
  const today = new Date().toISOString().slice(0, 10);
  const field = ctx.elements.edBody.querySelector(`[data-id="${block.id}"] .block-text-field`) as HTMLElement;
  if (!field) return;
  
  openCalendarPicker(ctx, field, today, (newDate) => {
    block.content = (block.content || '') + `📅 ${newDate}`;
    block.type = 'paragraph';
    rerenderNote(ctx, n);
    const newField = ctx.elements.edBody.querySelector(`[data-id="${block.id}"] .block-text-field`) as HTMLElement;
    if (newField) moveCaret(newField);
  });
}

export function openMentionPicker(ctx: AppContext, block: Block, n: Note, blockId: string) {
  const titles = ctx.st.notes.filter(x => x.id !== n.id).map(x => x.title || 'Untitled');
  if (titles.length === 0) { ctx.toast('No other notes to mention', '', () => {}); return; }
  
  ctx.root.querySelector('.mention-picker')?.remove();
  const picker = document.createElement('div');
  picker.className = 'slash-menu mention-picker';
  let selectedIndex = 0;
  const visibleTitles = titles.slice(0, 12);

  picker.innerHTML = visibleTitles.map((t, i) =>
    `<button class="slash-item ${i === 0 ? 'selected' : ''}" data-index="${i}"><span class="slash-item-icon">📄</span><span class="slash-item-label">${t}</span></button>`
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
    const btns = picker.querySelectorAll('.slash-item');
    btns.forEach((btn, idx) => {
      btn.classList.toggle('selected', idx === selectedIndex);
    });
    const sel = picker.querySelector('.slash-item.selected') as HTMLElement;
    if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
  };

  const selectMention = (title: string) => {
    block.content = (block.content || '') + `[[${title}]]`;
    block.type = 'paragraph';
    rerenderNote(ctx, n);
    const field = ctx.elements.edBody.querySelector(`[data-id="${blockId}"] .block-text-field`) as HTMLElement;
    if (field) moveCaret(field);
    cleanup();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % visibleTitles.length;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + visibleTitles.length) % visibleTitles.length;
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectMention(visibleTitles[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
    }
  };

  const closePicker = (e: MouseEvent) => {
    if (!picker.contains(e.target as Node)) {
      cleanup();
    }
  };

  const cleanup = () => {
    picker.remove();
    document.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('click', closePicker);
  };

  picker.querySelectorAll('.slash-item').forEach((btn, i) => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectMention(visibleTitles[i]);
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  document.addEventListener('keydown', handleKeydown, true);
  setTimeout(() => {
    document.addEventListener('click', closePicker);
  }, 0);
}

export function openCalloutEmojiPicker(ctx: AppContext, block: Block, n: Note, anchorEl: HTMLElement) {
  ctx.root.querySelector('.emoji-picker')?.remove();
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  let selectedIndex = 0;

  picker.innerHTML = EMOJI_LIST.map((e, idx) =>
    `<button class="emoji-btn ${idx === 0 ? 'selected' : ''}" data-emoji="${e}" data-index="${idx}">${e}</button>`
  ).join('');
  
  const rect = anchorEl.getBoundingClientRect();
  const innerRect = ctx.elements.edInner.getBoundingClientRect();
  picker.style.left = (rect.left - innerRect.left) + 'px';
  picker.style.top = (rect.bottom - innerRect.top + 4) + 'px';
  
  ctx.elements.edInner.appendChild(picker);

  const updateSelection = () => {
    const btns = picker.querySelectorAll('.emoji-btn');
    btns.forEach((btn, idx) => {
      btn.classList.toggle('selected', idx === selectedIndex);
    });
    const sel = picker.querySelector('.emoji-btn.selected') as HTMLElement;
    if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
  };

  const selectEmoji = (emoji: string) => {
    block.icon = emoji;
    rerenderNote(ctx, n);
    cleanup();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    const cols = 8;
    const total = EMOJI_LIST.length;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % total;
      updateSelection();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + total) % total;
      updateSelection();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + cols) % total;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - cols + total) % total;
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectEmoji(EMOJI_LIST[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
    }
  };

  const closePicker = (e: MouseEvent) => {
    if (!picker.contains(e.target as Node)) {
      cleanup();
    }
  };

  const cleanup = () => {
    picker.remove();
    document.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('click', closePicker);
  };

  picker.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const emoji = (btn as HTMLElement).dataset.emoji!;
      selectEmoji(emoji);
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  document.addEventListener('keydown', handleKeydown, true);
  setTimeout(() => {
    document.addEventListener('click', closePicker);
  }, 0);
}
