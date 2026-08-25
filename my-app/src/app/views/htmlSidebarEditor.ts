import type { AppContext } from '../context';
import { esc } from '../../utils/stringHelpers';
import { initMediaResize } from '../appResize';
import { findBlockById } from '../../utils';
import { saveAndSyncContent } from '../../store';
import { updateHtmlPreviewIframe } from '../../utils/htmlPreviewRenderer';

let wasSplitBeforeHtmlOpen = false;
let htmlSidebarDebounce: any = null;

export function openHtmlSidebarEditor(ctx: AppContext, blockId: string) {
  let pane = document.getElementById('pdfPane');
  let handle = document.getElementById('mediaResizeHandle');
  if (!pane) {
    pane = document.createElement('div');
    pane.id = 'pdfPane';
    pane.className = 'media-sidebar-pane';

    handle = document.createElement('div');
    handle.id = 'mediaResizeHandle';
    handle.className = 'media-resize-handle';
    handle.dataset.target = 'media';

    const frame = document.getElementById('frame') || document.body;
    frame.appendChild(handle);
    frame.appendChild(pane);

    initMediaResize(handle, pane);
  } else {
    if (handle) handle.style.display = '';
  }

  const isSplit = document.body.classList.contains('split');
  if (isSplit && pane.style.display !== 'flex') {
    wasSplitBeforeHtmlOpen = true;
    const halfB = document.getElementById('halfB');
    if (halfB) halfB.style.display = 'none';
  }

  pane.style.display = 'flex';

  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;
  const match = findBlockById(n.blocks, blockId);
  if (!match) return;

  const currentCode = match.block.content || '';

  pane.innerHTML = `
    <div class="media-sidebar-header">
      <div class="media-sidebar-title-group">
        <span class="media-sidebar-icon">🌐</span>
        <span class="media-sidebar-filename">HTML Code Editor</span>
      </div>
      <div class="media-sidebar-actions">
        <button class="media-sidebar-btn copy-html-sidebar-btn" title="Copy code">📋 Copy</button>
        <button class="media-sidebar-btn close-html-sidebar-btn" title="Close editor">✕</button>
      </div>
    </div>
    <div class="media-sidebar-body html-sidebar-body">
      <textarea class="html-sidebar-textarea" placeholder="<!-- Paste or type HTML, CSS, & JS here -->" spellcheck="false">${esc(currentCode)}</textarea>
    </div>
  `;

  const textarea = pane.querySelector('.html-sidebar-textarea') as HTMLTextAreaElement;
  if (textarea) {
    textarea.focus();
    // If it's a new block with starter code, select all so pasting replaces it cleanly
    if (currentCode.includes('Hello HTML Preview!')) {
      textarea.select();
    }

    textarea.addEventListener('input', () => {
      const updatedCode = textarea.value;
      match.block.content = updatedCode;

      if (htmlSidebarDebounce) clearTimeout(htmlSidebarDebounce);
      htmlSidebarDebounce = setTimeout(() => {
        const wrapper = ctx.elements.edBody.querySelector(`.block-html-wrapper[data-id="${blockId}"]`);
        if (wrapper) {
          const iframe = wrapper.querySelector('.html-preview-iframe') as HTMLIFrameElement;
          if (iframe) {
            updateHtmlPreviewIframe(iframe, updatedCode, ctx.api.theme);
          }
        }
      }, 250);

      saveAndSyncContent();
      ctx.markSaving();
    });
  }

  const copyBtn = pane.querySelector('.copy-html-sidebar-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (textarea) {
        navigator.clipboard.writeText(textarea.value);
        ctx.toast('HTML code copied to clipboard!', '', () => {});
      }
    });
  }

  const closeBtn = pane.querySelector('.close-html-sidebar-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeHtmlSidebarEditor(ctx));
  }
}

export function closeHtmlSidebarEditor(ctx: AppContext) {
  const pane = document.getElementById('pdfPane');
  if (pane) {
    pane.style.display = 'none';
    pane.innerHTML = '';
  }

  const handle = document.getElementById('mediaResizeHandle');
  if (handle) {
    handle.style.display = 'none';
  }

  if (wasSplitBeforeHtmlOpen) {
    const halfB = document.getElementById('halfB');
    if (halfB) halfB.style.display = '';
    wasSplitBeforeHtmlOpen = false;
  }
}
