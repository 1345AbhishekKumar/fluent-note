import type { AppContext } from '../../context';
import { findBlockById } from '../../../utils';
import { updateHtmlPreviewIframe } from '../../../utils/htmlPreviewRenderer';

export function openHtmlFullscreenModal(ctx: AppContext, blockId: string) {
  // Remove existing modal if any
  document.querySelectorAll('.html-fullscreen-modal-overlay').forEach(el => el.remove());

  const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
  if (!n) return;
  const match = findBlockById(n.blocks, blockId);
  if (!match) return;

  const wrapper = document.querySelector(`.block-html-wrapper[data-id="${blockId}"]`);
  let content = match.block.content || '';
  if (wrapper) {
    const codeField = wrapper.querySelector('.html-code-field') as HTMLElement;
    if (codeField) {
      const html = codeField.innerHTML || '';
      if (html.includes('<br>') || html.includes('<div>')) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<div>/gi, '');
        content = tmp.textContent || '';
      } else {
        content = codeField.innerText || codeField.textContent || '';
      }
    }
  }

  const theme = document.documentElement.classList.contains('dark') || document.body.dataset.theme === 'dark' ? 'dark' : 'light';

  const modalEl = document.createElement('div');
  modalEl.className = 'html-fullscreen-modal-overlay';
  modalEl.innerHTML = `
    <div class="html-modal-header">
      <div class="html-modal-title-group">
        <span>🌐</span>
        <span>HTML Live Preview</span>
      </div>
      <div class="html-modal-devices">
        <button class="html-device-btn active" data-device="desktop" title="Desktop View (100%)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          Desktop
        </button>
        <button class="html-device-btn" data-device="tablet" title="Tablet View (768px)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
          Tablet
        </button>
        <button class="html-device-btn" data-device="mobile" title="Mobile View (375px)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
          Mobile
        </button>
      </div>
      <div class="html-modal-actions">
        <button class="html-modal-btn html-modal-refresh-btn" title="Reload Preview">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          Reload
        </button>
        <button class="html-modal-btn html-modal-close-btn" title="Close Fullscreen (Esc)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minimize2-icon lucide-minimize-2"><path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/></svg>
          Minimize
        </button>
      </div>
    </div>
    <div class="html-modal-canvas-area">
      <div class="html-modal-canvas device-desktop">
        <iframe class="html-modal-iframe" sandbox="allow-scripts allow-forms allow-modals"></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  const canvas = modalEl.querySelector('.html-modal-canvas') as HTMLElement;
  const iframe = modalEl.querySelector('.html-modal-iframe') as HTMLIFrameElement;
  updateHtmlPreviewIframe(iframe, content, theme);

  // Device switcher
  const deviceBtns = modalEl.querySelectorAll('.html-device-btn');
  deviceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      deviceBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dev = (btn as HTMLElement).dataset.device || 'desktop';
      canvas.className = `html-modal-canvas device-${dev}`;
    });
  });

  // Refresh
  modalEl.querySelector('.html-modal-refresh-btn')?.addEventListener('click', () => {
    updateHtmlPreviewIframe(iframe, content, theme);
  });

  // Close handler
  const closeModal = () => {
    modalEl.remove();
    document.removeEventListener('keydown', onKeyDown);
  };

  modalEl.querySelector('.html-modal-close-btn')?.addEventListener('click', closeModal);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  document.addEventListener('keydown', onKeyDown);
}
