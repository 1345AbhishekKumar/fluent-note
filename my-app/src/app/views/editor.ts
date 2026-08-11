import type { AppContext } from '../context';
import type { Block, Note } from '../../types';
import { esc, strip, htmlToBlocks, renderBlockTree, setEdBodyHtml, findBlockById, cleanBadgeHtml } from '../../utils';
import { saveAndSyncContent, saveAndSync } from '../../store';
import { styleItems, noteItems, nbItems, tagItems } from '../components/flyout';
import { initEditorDragDrop } from './editorDragDrop';
import { initEditorKeyEvents } from './editorEvents';
import { initEditorHoverCard } from './editorEvents/editorHoverCard';
import { triggerUndo, triggerRedo, commitTypingSession } from './editorEvents/editorHistory';
import { IC } from '../../constants';
import { renderMermaidDiagramsInContainer } from '../../utils/mermaidRenderer';

export function syncFocusedBlockContent(ctx: AppContext) {
  const activeEl = document.activeElement as HTMLElement;
  if (!activeEl || !activeEl.classList.contains('block-text-field')) return;
  const blockEl = activeEl.closest('.block-wrapper') as HTMLElement;
  if (!blockEl) return;
  const blockId = blockEl.dataset.id;
  if (!blockId) return;

  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;

  const match = findBlockById(n.blocks, blockId);
  if (match) {
    match.block.content = cleanBadgeHtml(activeEl);
  }
}

export function renderSubItems(ctx: AppContext, n: Note) {
  // Legacy stub - subpages/subfolders are now rendered as inline blocks in the editor body
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

export function toggleEditorEmptyState(ctx: AppContext, n: Note | undefined) {
  ctx.elements.edEmpty.style.display = n ? 'none' : 'flex';
  ctx.elements.edTitle.style.display = n ? '' : 'none';
  const edMetaEl = ctx.root.querySelector('.ed-meta') as HTMLElement;
  if (edMetaEl) edMetaEl.style.display = n ? '' : 'none';
  ctx.elements.edBody.style.display = n ? '' : 'none';
  
  const acadMeta = ctx.root.querySelector('.academic-metadata') as HTMLElement;
  const backPane = ctx.root.querySelector('.backlinks-panel') as HTMLElement;
  if (acadMeta) acadMeta.style.display = (n && ctx.state.lens === 'academic') ? 'grid' : 'none';
  if (backPane) backPane.style.display = (n && ctx.state.lens === 'academic') ? 'block' : 'none';
}

export function updateWordCount(ctx: AppContext, blocks: Block[]) {
  const words = getBlocksWordCount(blocks);
  ctx.elements.wcEl.textContent = words + ' words';
}

export function renderEditor(ctx: AppContext) {
  commitTypingSession();
  const n = ctx.state.notes.find(x => x.id === ctx.state.sel);
  toggleEditorEmptyState(ctx, n);
  if (!n) return;
  
  ctx.elements.edTitle.textContent = n.title;
  if (!n.blocks || n.blocks.length === 0) {
    n.blocks = htmlToBlocks(n.body || '');
  }
  setEdBodyHtml(ctx.elements.edBody, renderBlockTree(n.blocks, 0, undefined, { note: n, allNotes: ctx.state.notes }));
  renderMermaidDiagramsInContainer(ctx.elements.edBody, ctx.api.theme);
  ctx.renderMeta();
  renderSubItems(ctx, n);
  
  updateWordCount(ctx, n.blocks);

  if (ctx.state.lens === 'academic') {
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

    const activeElBefore = document.activeElement as HTMLElement;
    const isEditing = activeElBefore && activeElBefore.classList.contains('block-text-field');
    if (!isEditing) {
      const firstField = ctx.elements.edBody.querySelector('.block-text-field') as HTMLElement;
      if (firstField) firstField.focus();
    }

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
            if (activeElBefore) activeElBefore.focus();
            if (range) {
              const s = window.getSelection();
              s?.removeAllRanges();
              s?.addRange(range);
            }
            document.execCommand('createLink', false, u);
            syncFocusedBlockContent(ctx);
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
          if (activeElBefore) activeElBefore.focus();
          if (range) {
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(range);
          }
          const texHtml = `$$${val.trim()}$$`;
          document.execCommand('insertHTML', false, texHtml);
          syncFocusedBlockContent(ctx);
          saveAndSyncContent();
          ctx.markSaving();
          ctx.renderEditor();
        }
      } else {
        document.execCommand(cmd, false, undefined);
      }
    } catch (err) {}
    
    if (cmd !== 'link' && cmd !== 'math' && cmd !== 'undo' && cmd !== 'redo') {
      syncFocusedBlockContent(ctx);
    }

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
 
  // Init Hover Card Popover events
  initEditorHoverCard(ctx);
 
  // Init Drag and Drop events
  initEditorDragDrop(ctx);

  // Initialize floating selection formatting toolbar bubble
  let bubble = ctx.elements.edInner.querySelector('.floating-format-bubble') as HTMLElement;
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.className = 'floating-format-bubble';
    bubble.innerHTML = `
      <button class="fb-btn bold-btn" title="Bold (Ctrl+B)"><b>B</b></button>
      <button class="fb-btn italic-btn" title="Italic (Ctrl+I)"><i>I</i></button>
      <button class="fb-btn underline-btn" title="Underline (Ctrl+U)"><u>U</u></button>
      <button class="fb-btn strike-btn" title="Strikethrough"><s>S</s></button>
      <span class="sep"></span>
      <button class="fb-btn code-btn" title="Inline Code (Ctrl+E)">&lt;&gt;</button>
      <button class="fb-btn link-btn" title="Link (Ctrl+K)">🔗</button>
      <button class="fb-btn highlight-btn" title="Highlight (Ctrl+Shift+H)">🖍</button>
      <button class="fb-btn comment-btn" title="Comment (Ctrl+Shift+M)">💬</button>
    `;
    ctx.elements.edInner.appendChild(bubble);

    // Prevent default mousedown to preserve rich text selection
    bubble.addEventListener('mousedown', e => {
      e.preventDefault();
    });

    const runCommand = (cmd: string, val?: string) => {
      document.execCommand(cmd, false, val);
      syncFocusedBlockContent(ctx);
      saveAndSyncContent();
      ctx.markSaving();
      ctx.syncToolbar();
    };

    bubble.querySelector('.bold-btn')?.addEventListener('click', () => runCommand('bold'));
    bubble.querySelector('.italic-btn')?.addEventListener('click', () => runCommand('italic'));
    bubble.querySelector('.underline-btn')?.addEventListener('click', () => runCommand('underline'));
    bubble.querySelector('.strike-btn')?.addEventListener('click', () => runCommand('strikeThrough'));
    bubble.querySelector('.code-btn')?.addEventListener('click', () => {
      const sel = window.getSelection()?.toString();
      if (sel) {
        runCommand('insertHTML', `<code style="background:var(--bg3); padding: 2px 4px; border-radius: 4px; font-family: monospace;">${esc(sel)}</code>`);
      }
    });
    bubble.querySelector('.link-btn')?.addEventListener('click', () => {
      const sel = window.getSelection();
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      ctx.showPrompt('Link URL', 'https://...', 'https://', u => {
        if (u) {
          if (range) {
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(range);
          }
          runCommand('createLink', u);
        }
      });
    });
    bubble.querySelector('.highlight-btn')?.addEventListener('click', () => {
      runCommand('hiliteColor', ctx.api.theme === 'dark' ? 'rgba(255,210,63,.32)' : '#ffe9a0');
    });
    bubble.querySelector('.comment-btn')?.addEventListener('click', () => {
      const activeEl = document.activeElement as HTMLElement;
      const blockEl = activeEl?.closest('.block-wrapper') as HTMLElement;
      if (blockEl) {
        const bId = blockEl.dataset.id!;
        const n = ctx.st.notes.find((x: any) => x.id === ctx.st.sel);
        if (n) {
          const match = findBlockById(n.blocks, bId);
          if (match) {
            const commentVal = prompt('Enter comment:', match.block.comment || '');
            if (commentVal !== null) {
              match.block.comment = commentVal.trim() || undefined;
              ctx.renderEditor();
            }
          }
        }
      }
    });
  }

  const handleSelectionChange = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      bubble.style.display = 'none';
      return;
    }

    const range = sel.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    const editableParent = commonAncestor.nodeType === Node.ELEMENT_NODE
      ? (commonAncestor as HTMLElement).closest('.block-text-field, .table-cell-field')
      : commonAncestor.parentNode ? (commonAncestor.parentNode as HTMLElement).closest('.block-text-field, .table-cell-field') : null;

    if (!editableParent || !ctx.elements.edBody.contains(editableParent)) {
      bubble.style.display = 'none';
      return;
    }

    const rects = range.getClientRects();
    if (rects.length === 0) {
      bubble.style.display = 'none';
      return;
    }

    const firstRect = rects[0];
    const innerRect = ctx.elements.edInner.getBoundingClientRect();
    const left = firstRect.left - innerRect.left + (firstRect.width / 2) - ((bubble.offsetWidth || 230) / 2);
    const top = firstRect.top - innerRect.top - (bubble.offsetHeight || 36) - 8;

    bubble.style.left = Math.max(8, left) + 'px';
    bubble.style.top = top + 'px';
    bubble.style.display = 'flex';

    // Update active button states based on selection style
    const boldBtn = bubble.querySelector('.bold-btn');
    const italicBtn = bubble.querySelector('.italic-btn');
    const underlineBtn = bubble.querySelector('.underline-btn');
    const strikeBtn = bubble.querySelector('.strike-btn');

    if (document.queryCommandState('bold')) boldBtn?.classList.add('active');
    else boldBtn?.classList.remove('active');

    if (document.queryCommandState('italic')) italicBtn?.classList.add('active');
    else italicBtn?.classList.remove('active');

    if (document.queryCommandState('underline')) underlineBtn?.classList.add('active');
    else underlineBtn?.classList.remove('active');

    if (document.queryCommandState('strikeThrough')) strikeBtn?.classList.add('active');
    else strikeBtn?.classList.remove('active');
  };

  document.addEventListener('selectionchange', handleSelectionChange);
}

