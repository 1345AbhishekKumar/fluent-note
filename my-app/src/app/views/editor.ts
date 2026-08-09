import type { AppContext } from '../context';
import type { Block, Note } from '../../types';
import { esc, strip, htmlToBlocks, renderBlockTree, setEdBodyHtml, findBlockById } from '../../utils';
import { saveAndSyncContent, saveAndSync } from '../../store';
import { styleItems, noteItems, nbItems, tagItems } from '../components/flyout';
import { initEditorDragDrop } from './editorDragDrop';
import { initEditorKeyEvents } from './editorEvents';
import { triggerUndo, triggerRedo } from './editorEvents/editorHistory';
import { IC } from '../../constants';


export function renderSubItems(ctx: AppContext, n: Note) {
  const panel = ctx.root.querySelector('.sub-items-panel') as HTMLElement;
  const list = ctx.root.querySelector('.sub-items-list') as HTMLElement;
  if (!panel || !list) return;

  const childFolders = ctx.st.folders.filter(f => f.parentId === n.id);
  const childNotes = ctx.st.notes.filter(x => x.parentId === n.id);

  panel.style.display = 'block';

  if (childFolders.length === 0 && childNotes.length === 0) {
    list.innerHTML = `<div class="sub-items-empty text-[12.5px] text-text3 italic col-span-full mt-1">No subfolders or subpages. Click the + button to add one.</div>`;
    return;
  }

  const foldersHtml = childFolders.map(f => `
    <button class="sub-item-btn folder-item flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] font-medium text-text2 bg-nav-h hover:bg-card-h hover:text-text1 transition-colors duration-quick ease-smooth-out" data-id="${f.id}" data-type="folder">
      <span class="ic" style="color:${f.color || '#cccccc'}">${IC.folder}</span>
      <span class="sub-item-title">${esc(f.name)}</span>
    </button>
  `).join('');

  const notesHtml = childNotes.map(lnk => `
    <button class="sub-item-btn note-item flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] font-medium text-text2 bg-nav-h hover:bg-card-h hover:text-text1 transition-colors duration-quick ease-smooth-out" data-id="${lnk.id}" data-type="note">
      <span class="ic" style="color:#23b8b8">${IC.note}</span>
      <span class="sub-item-title">${esc(lnk.title) || 'Untitled'}</span>
    </button>
  `).join('');

  list.innerHTML = foldersHtml + notesHtml;

  list.querySelectorAll('.sub-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      const type = (btn as HTMLElement).dataset.type!;
      if (type === 'note') {
        ctx.selectNote(id);
      } else {
        ctx.st.folder = id;
        ctx.st.nb = 'all';
        ctx.st.quick = 'all';
        ctx.st.tag = null;
        ctx.st.expandedFolders.add(id);
        ctx.renderSidebar();
        ctx.renderList();
      }
    });
  });
}

export function renderAcademicAndBacklinks(ctx: AppContext, n: Note) {
  const authIn = ctx.root.querySelector('.ac-authors') as HTMLInputElement;
  const jourIn = ctx.root.querySelector('.ac-journal') as HTMLInputElement;
  const yrIn = ctx.root.querySelector('.ac-year') as HTMLInputElement;
  if (authIn) authIn.value = n.authors || '';
  if (jourIn) jourIn.value = n.journal || '';
  if (yrIn) yrIn.value = n.year || '';

  const backPane = ctx.root.querySelector('.backlinks-panel') as HTMLElement;
  const backList = ctx.root.querySelector('.backlinks-list') as HTMLElement;
  if (backPane && backList) {
    const links = ctx.st.notes.filter(x => {
      if (x.id === n.id) return false;
      const refs = getReferencedNoteIds(x, ctx.st.notes);
      return refs.has(n.id);
    });
    
    if (links.length === 0) {
      backList.innerHTML = `<div class="text-xs text-text3 italic">No backlinks found</div>`;
    } else {
      backList.innerHTML = links.map(lnk => `
        <button class="backlink-item text-left w-full p-2 rounded-md bg-nav-h hover:bg-card-h transition-colors duration-quick ease-smooth-out" data-id="${lnk.id}">
          <div class="font-semibold text-xs mb-0.5 text-text1">${esc(lnk.title) || 'Untitled'}</div>
          <div class="text-[11px] text-text2 truncate">${esc(strip(lnk.body)) || 'No preview available'}</div>
        </button>
      `).join('');

      backList.querySelectorAll('.backlink-item').forEach(item => {
        item.addEventListener('click', () => {
          ctx.selectNote((item as HTMLElement).dataset.id!);
        });
      });
    }
  }
}

function getReferencedNoteIds(n: Note, notes: Note[]): Set<string> {
  const refs = new Set<string>();
  const flat = flattenBlocks(n.blocks);
  for (const block of flat) {
    const matches = block.content.matchAll(/\[\[(.*?)\]\]/g);
    for (const match of matches) {
      const title = match[1].trim();
      const ref = notes.find(x => x.title.toLowerCase() === title.toLowerCase());
      if (ref) refs.add(ref.id);
    }
  }
  return refs;
}

function flattenBlocks(blocks: Block[]): Block[] {
  let flat: Block[] = [];
  for (const b of blocks) {
    flat.push(b);
    if (b.children) {
      flat = [...flat, ...flattenBlocks(b.children)];
    }
  }
  return flat;
}

export function renderEditor(ctx: AppContext) {
  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  ctx.elements.edEmpty.style.display = n ? 'none' : 'flex';
  ctx.elements.edTitle.style.display = n ? '' : 'none';
  const edMetaEl = ctx.root.querySelector('.ed-meta') as HTMLElement;
  if (edMetaEl) edMetaEl.style.display = n ? '' : 'none';
  ctx.elements.edBody.style.display = n ? '' : 'none';
  
  const acadMeta = ctx.root.querySelector('.academic-metadata') as HTMLElement;
  const backPane = ctx.root.querySelector('.backlinks-panel') as HTMLElement;
  if (acadMeta) acadMeta.style.display = (n && ctx.st.lens === 'academic') ? 'grid' : 'none';
  if (backPane) backPane.style.display = (n && ctx.st.lens === 'academic') ? 'block' : 'none';

  if (!n) return;
  ctx.elements.edTitle.textContent = n.title;
  if (!n.blocks || n.blocks.length === 0) {
    n.blocks = htmlToBlocks(n.body || '');
  }
  setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.st.notes }));
  ctx.renderMeta();
  renderSubItems(ctx, n);
  
  // Update status
  const words = getBlocksWordCount(n.blocks);
  ctx.elements.wcEl.textContent = words + ' words';

  if (ctx.st.lens === 'academic') {
    renderAcademicAndBacklinks(ctx, n);
  }
}

function getBlocksWordCount(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) {
    count += block.content.split(/\s+/).filter(Boolean).length;
    if (block.children) {
      count += getBlocksWordCount(block.children);
    }
  }
  return count;
}

export function initEditorEvents(ctx: AppContext) {
  ctx.elements.edBack.addEventListener('click', () => ctx.root.classList.remove('show-editor'));
  
  ctx.elements.tools.addEventListener('mousedown', e => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) e.preventDefault();
  });
  
  ctx.elements.tools.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const b = target.closest('button') as HTMLButtonElement;
    if (!b) return;
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    
    if (b === ctx.elements.styleBtn) {
      ctx.openFly(ctx.elements.styleBtn, styleItems(ctx));
      return;
    }
    if (b === ctx.elements.edMore) {
      ctx.openFly(ctx.elements.edMore, noteItems(ctx, n));
      return;
    }
    if (b === ctx.elements.pinBtn) {
      n.pinned = !n.pinned;
      ctx.st.notes = [...ctx.st.notes];
      saveAndSync();
      return;
    }
    
    const cmd = b.dataset.cmd;
    if (!cmd) return;
    ctx.elements.edBody.focus();
    try {
      if (cmd === 'undo') {
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) triggerUndo(ctx, n);
      } else if (cmd === 'redo') {
        const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
        if (n) triggerRedo(ctx, n);
      } else if (cmd === 'quote') {
        let cur = 'p';
        try {
          cur = (document.queryCommandValue('formatBlock') || '').toLowerCase();
        } catch (e2) {}
        document.execCommand('formatBlock', false, cur === 'blockquote' ? '<p>' : '<blockquote>');
      } else if (cmd === 'hiliteColor') {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('hiliteColor', false, ctx.api.theme === 'dark' ? 'rgba(255,210,63,.32)' : '#ffe9a0');
      } else if (cmd === 'link') {
        const sel = window.getSelection();
        const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        ctx.showPrompt('Link URL', 'https://...', 'https://', u => {
          if (u) {
            ctx.elements.edBody.focus();
            if (range) {
              const s = window.getSelection();
              s?.removeAllRanges();
              s?.addRange(range);
            }
            document.execCommand('createLink', false, u);
            saveAndSyncContent();
            ctx.markSaving();
          }
        });
      } else if (cmd === 'math') {
        const sel = window.getSelection();
        const selectionText = sel?.toString() || '';
        const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        const val = prompt('Enter TeX / LaTeX formula:', selectionText);
        if (val !== null) {
          ctx.elements.edBody.focus();
          if (range) {
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(range);
          }
          const texHtml = `$$${val.trim()}$$`;
          document.execCommand('insertHTML', false, texHtml);
          saveAndSyncContent();
          ctx.markSaving();
          
          const activeEl = document.activeElement as HTMLElement;
          const blockEl = activeEl?.closest('.block-wrapper') as HTMLElement;
          const blockId = blockEl?.dataset.id;
          if (blockEl && blockId) {
            const match = findBlockById(n.blocks, blockId);
            if (match) {
              match.block.content = activeEl.textContent || '';
            }
          }
          ctx.renderEditor();
        }
      } else {
        document.execCommand(cmd, false, undefined);
      }
    } catch (err) {}
    
    ctx.syncToolbar();
    saveAndSyncContent();
    ctx.markSaving();
  });

  ctx.elements.metaNb.addEventListener('click', () => {
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) ctx.openFly(ctx.elements.metaNb, nbItems(ctx, n));
  });

  ctx.elements.metaTags.addEventListener('click', () => {
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) ctx.openFly(ctx.elements.metaTags, tagItems(ctx, n));
  });

  ctx.elements.edTitle.addEventListener('input', () => {
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (n) {
      const activeId = n.id;
      const newTitle = ctx.elements.edTitle.textContent || '';
      n.title = newTitle;
      ctx.st.notes.forEach(otherNote => {
        function updateSubpages(blocks: any[]) {
          for (const b of blocks) {
            if (b.type === 'subpage' && b.url === activeId) {
              b.content = newTitle;
            }
            if (b.children?.length) updateSubpages(b.children);
          }
        }
        updateSubpages(otherNote.blocks);
      });
      document.querySelectorAll(`.block-subpage-card[data-subpageid="${activeId}"] .subpage-card-title`).forEach(el => {
        el.textContent = newTitle || 'Untitled';
      });
      saveAndSyncContent();
      ctx.markSaving();
    }
  });

  const subItemsAddBtn = ctx.root.querySelector('.sub-items-add-btn') as HTMLElement;
  if (subItemsAddBtn) {
    subItemsAddBtn.addEventListener('click', () => {
      const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
      if (n) {
        ctx.openFly(subItemsAddBtn, [
          { label: 'New subpage', icon: IC.plus, action: () => ctx.newSubNote(n.id) },
          { label: 'New subfolder', icon: IC.plus, action: () => ctx.newSubFolder(n.id) }
        ]);
      }
    });
  }

  // Init Key, Input, Tab, Slash, Checkbox events
  initEditorKeyEvents(ctx);

  // Init Drag and Drop events
  initEditorDragDrop(ctx);
}
