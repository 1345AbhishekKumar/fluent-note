import type { AppContext } from '../../context';
import { esc, strip } from '../../../utils';

let hoverTimeout: any = null;
let activePopover: HTMLElement | null = null;
let currentSubpageId: string | null = null;

export function initEditorHoverCard(ctx: AppContext) {
  const edBody = ctx.elements.edBody;
  if (!edBody) return;

  // Remove popover on document scroll or window resize
  window.addEventListener('scroll', removePopover, true);
  window.addEventListener('resize', removePopover);

  edBody.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const subpageEl = target.closest('.block-subpage-card, .block-subpage-row') as HTMLElement;
    
    if (!subpageEl) {
      // Check if mouse moved into popover itself
      if (target.closest('.subpage-hover-popover')) return;
      scheduleRemovePopover();
      return;
    }

    const subpageId = subpageEl.dataset.subpageid;
    if (!subpageId) return;

    if (currentSubpageId === subpageId && activePopover) {
      clearTimeout(hoverTimeout);
      return;
    }

    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      showPopover(ctx, subpageEl, subpageId);
    }, 280);
  });

  edBody.addEventListener('mouseout', (e) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && (relatedTarget.closest('.block-subpage-card') || relatedTarget.closest('.block-subpage-row') || relatedTarget.closest('.subpage-hover-popover'))) {
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
    currentSubpageId = null;
  }
}

function showPopover(ctx: AppContext, targetEl: HTMLElement, subpageId: string) {
  const childNote = ctx.st.notes.find(n => n.id === subpageId);
  if (!childNote) return;

  removePopover();
  currentSubpageId = subpageId;

  // Compute breadcrumb path
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

  // Preview snippet body text
  let snippet = strip(childNote.body || '');
  if (!snippet && childNote.blocks && childNote.blocks.length > 0) {
    snippet = childNote.blocks.map(b => b.content).filter(Boolean).join(' · ');
  }
  if (!snippet) snippet = 'No additional content';

  const popover = document.createElement('div');
  popover.className = 'subpage-hover-popover';
  popover.innerHTML = `
    <div class="hover-popover-header">
      <span class="hover-popover-icon">📄</span>
      <div class="hover-popover-meta">
        <div class="hover-popover-breadcrumb">${esc(breadcrumb)}</div>
        <div class="hover-popover-title">${esc(childNote.title || 'Untitled')}</div>
      </div>
    </div>
    <div class="hover-popover-body">${esc(snippet)}</div>
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

  // Position popover relative to targetEl
  const rect = targetEl.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();

  let top = rect.bottom + 6;
  let left = rect.left;

  // Avoid overflow off screen bottom
  if (top + popRect.height > window.innerHeight - 10) {
    top = rect.top - popRect.height - 6;
  }
  // Avoid overflow off screen right
  if (left + popRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popRect.width - 10;
  }
  left = Math.max(10, left);

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}
