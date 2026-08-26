import type { AppContext } from '../../context';
import type { Block, Note } from '../../../types';
import { esc, strip, resolveNoteId } from '../../../utils';
import { extractBlockIdTag } from '../../../utils/linkParser';

let hoverTimeout: any = null;
let activePopover: HTMLElement | null = null;
let currentKey: string | null = null;

export function initEditorHoverCard(ctx: AppContext) {
  const edBody = ctx.elements.edBody;
  if (!edBody) return;

  window.addEventListener('scroll', removePopover, true);
  window.addEventListener('resize', removePopover);

  edBody.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const subpageEl = target.closest('.block-subpage-card, .block-subpage-row') as HTMLElement;
    const wikiLinkEl = target.closest('.wiki-link, .embedded-transclusion') as HTMLElement;

    if (!subpageEl && !wikiLinkEl) {
      if (target.closest('.subpage-hover-popover')) return;
      scheduleRemovePopover();
      return;
    }

    if (subpageEl) {
      const subpageId = subpageEl.dataset.subpageid;
      if (!subpageId) return;

      const key = `subpage:${subpageId}`;
      if (currentKey === key && activePopover) {
        clearTimeout(hoverTimeout);
        return;
      }

      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        showNotePopover(ctx, subpageEl, subpageId);
      }, 250);
      return;
    }

    if (wikiLinkEl) {
      const targetPath = (wikiLinkEl.dataset.target || wikiLinkEl.dataset.ref || '').trim();
      const heading = (wikiLinkEl.dataset.heading || '').trim();
      const blockId = (wikiLinkEl.dataset.block || '').trim();

      const key = `link:${targetPath}#${heading}^${blockId}`;
      if (currentKey === key && activePopover) {
        clearTimeout(hoverTimeout);
        return;
      }

      clearTimeout(hoverTimeout);
      const isCtrl = e.ctrlKey || e.metaKey;
      hoverTimeout = setTimeout(() => {
        showWikiLinkPopover(ctx, wikiLinkEl, targetPath, heading, blockId);
      }, isCtrl ? 50 : 300);
    }
  });

  edBody.addEventListener('mouseout', (e) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (
      relatedTarget &&
      (relatedTarget.closest('.block-subpage-card') ||
        relatedTarget.closest('.block-subpage-row') ||
        relatedTarget.closest('.wiki-link') ||
        relatedTarget.closest('.embedded-transclusion') ||
        relatedTarget.closest('.subpage-hover-popover'))
    ) {
      return;
    }
    scheduleRemovePopover();
  });
}

function scheduleRemovePopover() {
  clearTimeout(hoverTimeout);
  hoverTimeout = setTimeout(() => {
    removePopover();
  }, 200);
}

function removePopover() {
  clearTimeout(hoverTimeout);
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
    currentKey = null;
  }
}

function extractHeadingSnippet(blocks: Block[], headingText: string): string {
  const cleanTarget = headingText.trim().toLowerCase();
  let capturing = false;
  const snippetParts: string[] = [];

  function walk(list: Block[]) {
    for (const b of list) {
      const isHeading = b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3';
      const rawText = (b.content || '').replace(/<[^>]+>/g, '').trim();

      if (isHeading) {
        if (rawText.toLowerCase() === cleanTarget || rawText.toLowerCase().startsWith(cleanTarget)) {
          capturing = true;
          snippetParts.push(`<strong>${esc(rawText)}</strong>`);
          continue;
        } else if (capturing) {
          capturing = false;
          return;
        }
      }

      if (capturing) {
        if (rawText) {
          const { text } = extractBlockIdTag(rawText);
          snippetParts.push(esc(text));
        }
      }

      if (b.children && b.children.length > 0) walk(b.children);
    }
  }

  walk(blocks);
  return snippetParts.length > 0 ? snippetParts.slice(0, 4).join('<br>') : 'No additional content in this section';
}

function extractBlockSnippet(blocks: Block[], blockId: string): string {
  let found = '';
  function walk(list: Block[]) {
    for (const b of list) {
      const rawText = (b.content || '').replace(/<[^>]+>/g, '').trim();
      const { text, blockId: tagId } = extractBlockIdTag(rawText);
      if (b.id === blockId || tagId === blockId || (rawText && rawText.includes(`^${blockId}`))) {
        found = text || rawText;
        return;
      }
      if (b.children && b.children.length > 0) walk(b.children);
    }
  }
  walk(blocks);
  return found ? esc(found) : `Block #${blockId}`;
}

function showWikiLinkPopover(ctx: AppContext, targetEl: HTMLElement, targetPath: string, heading?: string, blockId?: string) {
  const noteId = targetPath ? resolveNoteId(targetPath, ctx.st.notes) : ctx.st.sel;
  const targetNote = ctx.st.notes.find(n => n.id === noteId);

  removePopover();
  currentKey = `link:${targetPath}#${heading || ''}^${blockId || ''}`;

  if (!targetNote && !targetPath) return;

  const isGhost = !targetNote;
  const noteTitle = targetNote ? (targetNote.title || 'Untitled') : targetPath;

  const pathParts: string[] = [];
  if (targetNote && targetNote.nb && targetNote.nb !== 'all') {
    const folder = ctx.st.folders.find(f => f.id === targetNote.nb);
    if (folder) pathParts.push(folder.name);
  }
  if (heading) pathParts.push(`Section: ${heading}`);
  if (blockId) pathParts.push(`Block: ^${blockId}`);
  const breadcrumb = pathParts.length > 0 ? pathParts.join(' / ') : (isGhost ? 'Uncreated Note' : 'Note');

  let snippet = '';
  if (isGhost) {
    snippet = '<em>This note does not exist yet. Click to create it.</em>';
  } else if (targetNote) {
    if (blockId && targetNote.blocks) {
      snippet = extractBlockSnippet(targetNote.blocks, blockId);
    } else if (heading && targetNote.blocks) {
      snippet = extractHeadingSnippet(targetNote.blocks, heading);
    } else {
      snippet = strip(targetNote.body || '');
      if (!snippet && targetNote.blocks && targetNote.blocks.length > 0) {
        snippet = targetNote.blocks.map(b => b.content).filter(Boolean).slice(0, 3).join(' · ');
      }
      if (!snippet) snippet = 'No additional content';
      snippet = esc(snippet);
    }
  }

  const popover = document.createElement('div');
  popover.className = 'subpage-hover-popover bg-card dark:bg-[#1e1e1e] border border-border rounded-xl shadow-2xl p-3 z-[1100] max-w-[320px] pointer-events-auto';
  popover.innerHTML = `
    <div class="hover-popover-header flex items-center gap-2 pb-2 border-b border-border/50 mb-2">
      <span class="hover-popover-icon text-[16px]">${isGhost ? '✨' : '📄'}</span>
      <div class="hover-popover-meta flex flex-col">
        <div class="hover-popover-breadcrumb text-[10px] text-text3 uppercase font-semibold tracking-wider">${esc(breadcrumb)}</div>
        <div class="hover-popover-title text-[13px] font-semibold text-text1">${esc(noteTitle)}</div>
      </div>
    </div>
    <div class="hover-popover-body text-[12px] text-text2 leading-relaxed max-h-[140px] overflow-y-auto">${snippet}</div>
  `;

  popover.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
  });
  popover.addEventListener('mouseleave', () => {
    scheduleRemovePopover();
  });
  popover.addEventListener('click', () => {
    removePopover();
    targetEl.click();
  });

  document.body.appendChild(popover);
  activePopover = popover;

  const rect = targetEl.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();

  let top = rect.bottom + 6;
  let left = rect.left;

  if (top + popRect.height > window.innerHeight - 10) {
    top = rect.top - popRect.height - 6;
  }
  if (left + popRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popRect.width - 10;
  }
  left = Math.max(10, left);

  popover.style.position = 'fixed';
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function showNotePopover(ctx: AppContext, targetEl: HTMLElement, subpageId: string) {
  const childNote = ctx.st.notes.find(n => n.id === subpageId);
  if (!childNote) return;

  removePopover();
  currentKey = `subpage:${subpageId}`;

  const pathParts: string[] = [];
  if (childNote.nb && childNote.nb !== 'all') {
    const folder = ctx.st.folders.find(f => f.id === childNote.nb);
    if (folder) pathParts.push(folder.name);
  }
  if (childNote.parentId) {
    const parentNote = ctx.st.notes.find(n => n.id === childNote.parentId);
    if (parentNote) pathParts.push(parentNote.title || 'Untitled');
  }
  const breadcrumb = pathParts.length > 0 ? pathParts.join(' / ') : 'Subpage';

  let snippet = strip(childNote.body || '');
  if (!snippet && childNote.blocks && childNote.blocks.length > 0) {
    snippet = childNote.blocks.map(b => b.content).filter(Boolean).slice(0, 3).join(' · ');
  }
  if (!snippet) snippet = 'No additional content';

  const popover = document.createElement('div');
  popover.className = 'subpage-hover-popover bg-card dark:bg-[#1e1e1e] border border-border rounded-xl shadow-2xl p-3 z-[1100] max-w-[320px] pointer-events-auto';
  popover.innerHTML = `
    <div class="hover-popover-header flex items-center gap-2 pb-2 border-b border-border/50 mb-2">
      <span class="hover-popover-icon text-[16px]">📄</span>
      <div class="hover-popover-meta flex flex-col">
        <div class="hover-popover-breadcrumb text-[10px] text-text3 uppercase font-semibold tracking-wider">${esc(breadcrumb)}</div>
        <div class="hover-popover-title text-[13px] font-semibold text-text1">${esc(childNote.title || 'Untitled')}</div>
      </div>
    </div>
    <div class="hover-popover-body text-[12px] text-text2 leading-relaxed max-h-[140px] overflow-y-auto">${esc(snippet)}</div>
  `;

  popover.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
  });
  popover.addEventListener('mouseleave', () => {
    scheduleRemovePopover();
  });
  popover.addEventListener('click', () => {
    removePopover();
    ctx.selectNote(subpageId);
  });

  document.body.appendChild(popover);
  activePopover = popover;

  const rect = targetEl.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();

  let top = rect.bottom + 6;
  let left = rect.left;

  if (top + popRect.height > window.innerHeight - 10) {
    top = rect.top - popRect.height - 6;
  }
  if (left + popRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popRect.width - 10;
  }
  left = Math.max(10, left);

  popover.style.position = 'fixed';
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}
