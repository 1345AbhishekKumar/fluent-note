import type { AppContext } from '../context';
import type { FlyoutItem, Note, BlockType } from '../../types';
import { IC, TAGS } from '../../constants';
import { sharedNotebooks as NBS } from '../../store';
import { findBlockById, moveCaret, renderBlockTree } from '../../utils';
import { saveAndSyncContent, saveAndSync } from '../../store';

export function initFlyout(ctx: AppContext) {
  let flyItems: FlyoutItem[] = [];
  let flyAnchor: HTMLElement | null = null;

  function buildFly(items: FlyoutItem[]) {
    flyItems = items;
    ctx.elements.fly.innerHTML = items.map((it, i) => {
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
    const wr = ctx.root.getBoundingClientRect();
    ctx.elements.fly.style.left = '-9999px';
    ctx.elements.fly.style.top = '-9999px';
    ctx.elements.fly.classList.add('open');
    const fw = ctx.elements.fly.offsetWidth;
    const fh = ctx.elements.fly.offsetHeight;
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
    ctx.elements.fly.style.setProperty('--fo', `${ox} ${oy}`);
    ctx.elements.fly.style.left = x + 'px';
    ctx.elements.fly.style.top = y + 'px';
  }

  function openFly(anchor: HTMLElement, items: FlyoutItem[]) {
    buildFly(items);
    const wr = ctx.root.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    placeFly(ar.left - wr.left, ar.bottom - wr.top + 6, anchor);
  }

  function openFlyAt(cx: number, cy: number, items: FlyoutItem[]) {
    buildFly(items);
    const wr = ctx.root.getBoundingClientRect();
    placeFly(cx - wr.left, cy - wr.top + 4, null);
  }

  function closeFly() {
    ctx.elements.fly.classList.remove('open');
    flyAnchor = null;
  }

  ctx.elements.fly.addEventListener('click', e => {
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

  ctx.root.addEventListener('pointerdown', e => {
    const target = e.target as HTMLElement;
    if (ctx.elements.fly.classList.contains('open') && !ctx.elements.fly.contains(target) && !(flyAnchor && flyAnchor.contains(target))) {
      closeFly();
    }
  }, true);

  [ctx.elements.lpScroll, ctx.elements.edScroll, ctx.elements.sbScroll].forEach(el => {
    el.addEventListener('scroll', closeFly, { passive: true });
  });

  // Assign to context
  ctx.openFly = openFly;
  ctx.openFlyAt = openFlyAt;
  ctx.hideFlyout = closeFly; // alias for closing

  // Item builders
  ctx.root.addEventListener('sortItems' as any, () => {}); // placeholder / namespace
}

export const sortItems = (ctx: AppContext) => [
  { head: 'Sort by' },
  { label: 'Last edited', icon: IC.clock, checked: ctx.st.sort === 'date', action: () => { ctx.st.sort = 'date'; ctx.renderList(); } },
  { label: 'Title A–Z', icon: IC.sortIc, checked: ctx.st.sort === 'title', action: () => { ctx.st.sort = 'title'; ctx.renderList(); } },
  { sep: true },
  { label: 'Show snippets', icon: IC.ul, checked: ctx.st.snippets, action: () => { ctx.st.snippets = !ctx.st.snippets; ctx.root.classList.toggle('no-snip', !ctx.st.snippets); } },
  { sep: true },
  { label: 'New note', icon: IC.plus, action: () => ctx.newNote() }
];

export const filterItems = (ctx: AppContext) => [
  { head: 'Filter by tag' },
  { label: 'All tags', icon: IC.tag, checked: !ctx.st.tag, action: () => { ctx.st.tag = null; ctx.renderSidebar(); ctx.renderList(); } },
  ...TAGS.map(t => ({
    label: t.name,
    dot: t.color,
    checked: ctx.st.tag === t.id,
    action: () => {
      ctx.st.tag = ctx.st.tag === t.id ? null : t.id;
      ctx.renderSidebar();
      ctx.renderList();
    }
  }))
];

export const styleItems = (ctx: AppContext) => {
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  let curType = 'paragraph';
  let activeMatch: any = null;
  if (n) {
    const activeField = document.activeElement as HTMLElement;
    if (activeField && activeField.classList.contains('block-text-field')) {
      const blockEl = activeField.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        activeMatch = findBlockById(n.blocks, blockEl.dataset.id!);
        if (activeMatch) curType = activeMatch.block.type;
      }
    }
  }
  return [
    ['paragraph', 'Paragraph'],
    ['heading1', 'Heading 1'],
    ['heading2', 'Heading 2'],
    ['todo', 'To-do']
  ].map(([b, l]) => ({
    label: l,
    checked: curType === b,
    action: () => {
      if (n && activeMatch) {
        activeMatch.block.type = b as BlockType;
        if (b === 'todo') activeMatch.block.checked = false;
        ctx.elements.edBody.innerHTML = renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes });
        const field = ctx.elements.edBody.querySelector(`[data-id="${activeMatch.block.id}"] .block-text-field`) as HTMLElement;
        if (field) {
          moveCaret(field);
        }
        ctx.st.notes = [...ctx.st.notes]; // Trigger sync
        saveAndSyncContent();
        ctx.markSaving();
      }
    }
  }));
};

export const nbItems = (ctx: AppContext, n: Note) => NBS.map(nb => ({
  label: nb.name,
  dot: nb.color,
  checked: n.nb === nb.id,
  action: () => {
    n.nb = nb.id;
    ctx.st.notes = [...ctx.st.notes];
    saveAndSync();
  }
}));

export const tagItems = (ctx: AppContext, n: Note) => TAGS.map(t => ({
  label: t.name,
  dot: t.color,
  checked: n.tags.includes(t.id),
  keep: true,
  action: () => {
    n.tags = n.tags.includes(t.id) ? n.tags.filter(x => x !== t.id) : [...n.tags, t.id];
    ctx.st.notes = [...ctx.st.notes];
    saveAndSync();
  }
}));

export const noteItems = (ctx: AppContext, n: Note) => [
  {
    label: 'New subpage',
    icon: IC.plus,
    action: () => ctx.newSubNote(n.id)
  },
  {
    label: 'New subfolder',
    icon: IC.plus,
    action: () => ctx.newSubFolder(n.id)
  },
  { sep: true },
  {
    label: 'Share via P2P',
    icon: IC.share,
    action: () => ctx.startP2PShare(n)
  },
  {
    label: n.pinned ? 'Unpin note' : 'Pin note',
    icon: IC.pin,
    action: () => {
      n.pinned = !n.pinned;
      ctx.st.notes = [...ctx.st.notes];
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
        blocks: JSON.parse(JSON.stringify(n.blocks)),
        ord: n.ord - .5,
        date: 'Just now'
      };
      ctx.st.notes.push(c);
      ctx.selectNote(c.id);
      saveAndSync();
      ctx.toast('Note duplicated');
    }
  },
  { label: 'Copy link', icon: IC.link, kbd: 'Ctrl C', action: () => ctx.toast('Link copied to clipboard (demo)') },
  { sep: true },
  {
    label: 'Delete note',
    icon: IC.trash,
    danger: true,
    action: () => ctx.deleteNote(n)
  }
];
