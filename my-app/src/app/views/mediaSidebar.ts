import type { AppContext } from '../context';
import { esc } from '../../utils/stringHelpers';
import { initMediaResize } from '../appResize';

let wasSplitBeforeMediaOpen = false;

export function openMediaSidebar(ctx: AppContext, title: string, url: string, type: 'pdf' | 'image' | 'video' | 'audio' | 'file') {
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
    wasSplitBeforeMediaOpen = true;
    const halfB = document.getElementById('halfB');
    if (halfB) halfB.style.display = 'none';
  }

  pane.style.display = 'flex';

  let icon = '📄';
  if (type === 'image') icon = '🖼';
  else if (type === 'video') icon = '🎬';
  else if (type === 'audio') icon = '🎵';
  else if (type === 'file') icon = '📎';

  let contentHtml = '';
  if (type === 'pdf') {
    contentHtml = `<iframe src="${url}" title="${esc(title)}"></iframe>`;
  } else if (type === 'image') {
    contentHtml = `<img src="${url}" alt="${esc(title)}" />`;
  } else if (type === 'video') {
    contentHtml = `<video src="${url}" controls autoplay></video>`;
  } else if (type === 'audio') {
    contentHtml = `<audio src="${url}" controls autoplay></audio>`;
  } else {
    contentHtml = `<iframe src="${url}" title="${esc(title)}"></iframe>`;
  }

  pane.innerHTML = `
    <div class="media-sidebar-header">
      <div class="media-sidebar-title-group">
        <span class="media-sidebar-icon">${icon}</span>
        <span class="media-sidebar-filename">${esc(title || 'Media Viewer')}</span>
      </div>
      <div class="media-sidebar-actions">
        <button class="media-sidebar-btn close-media-btn" title="Close media viewer">✕</button>
      </div>
    </div>
    <div class="media-sidebar-body">
      ${contentHtml}
    </div>
  `;

  const closeBtn = pane.querySelector('.close-media-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeMediaSidebar(ctx));
  }
}

export function closeMediaSidebar(ctx: AppContext) {
  const pane = document.getElementById('pdfPane');
  if (pane) {
    pane.style.display = 'none';
    pane.innerHTML = '';
  }

  const handle = document.getElementById('mediaResizeHandle');
  if (handle) {
    handle.style.display = 'none';
  }

  if (wasSplitBeforeMediaOpen) {
    const halfB = document.getElementById('halfB');
    if (halfB) halfB.style.display = '';
    wasSplitBeforeMediaOpen = false;
  }
}
