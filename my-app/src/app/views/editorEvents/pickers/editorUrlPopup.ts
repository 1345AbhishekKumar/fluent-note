import type { AppContext } from '../../../context';
import type { Block, BlockType, Note } from '../../../../types';
import { findBlockById } from '../../../../utils';
import { rerenderNote, focusNextBlockOrNew } from './editorPopupUtils';
import { openMediaFilePrompt } from './editorMediaPrompts';

export function openUrlPopupEditor(ctx: AppContext, cmdType: string, block: Block, n: Note, anchorEl: HTMLElement, originalState?: Partial<Block>) {
  ctx.root.querySelector('.url-popup-editor')?.remove();

  const popup = document.createElement('div');
  popup.className = 'url-popup-editor bookmark-popup-editor';

  const buttonText = cmdType === 'bookmark' ? 'Create bookmark' : 'Embed PDF';
  const placeholderText = 'Paste in https://...';
  const descriptionText = cmdType === 'bookmark' 
    ? 'Create a visual bookmark from a link.' 
    : 'Embed a PDF file from a URL.';

  if (cmdType === 'pdf') {
    popup.innerHTML = `
      <button class="bookmark-popup-btn pdf-upload-btn" style="background: var(--nav-h); color: var(--text1); border: 1px solid var(--pane-brd); margin-bottom: 8px;">Upload local PDF</button>
      <div style="text-align: center; margin: 4px 0 8px; color: var(--text3); font-size: 11px; font-weight: 500;">OR</div>
      <input type="text" class="bookmark-popup-input" placeholder="${placeholderText}" value="${block.url || ''}" />
      <button class="bookmark-popup-btn bookmark-action-btn">${buttonText}</button>
      <p class="bookmark-popup-desc" style="margin-top: 8px;">${descriptionText}</p>
    `;
  } else {
    popup.innerHTML = `
      <input type="text" class="bookmark-popup-input" placeholder="${placeholderText}" value="${block.url || ''}" />
      <button class="bookmark-popup-btn bookmark-action-btn">${buttonText}</button>
      <p class="bookmark-popup-desc">${descriptionText}</p>
    `;
  }

  const rect = anchorEl.getBoundingClientRect();
  const parentRect = ctx.elements.edInner.getBoundingClientRect();
  
  popup.style.left = `${rect.left - parentRect.left}px`;
  popup.style.top = `${rect.bottom - parentRect.top + 6}px`;

  ctx.elements.edInner.appendChild(popup);

  const input = popup.querySelector('.bookmark-popup-input') as HTMLInputElement;
  const button = popup.querySelector('.bookmark-action-btn') as HTMLButtonElement;
  const uploadBtn = popup.querySelector('.pdf-upload-btn') as HTMLButtonElement;

  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);

  let finished = false;
  let handleOutsideClick: (e: MouseEvent) => void;

  const cancelAndClose = () => {
    if (finished) return;
    finished = true;
    if (originalState) {
      delete block.url;
      delete block.bookmarkTitle;
      delete block.bookmarkDesc;
      delete block.bookmarkImage;
      delete block.bookmarkIcon;
      Object.assign(block, originalState);
      rerenderNote(ctx, n);
    }
    if (handleOutsideClick) {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    popup.remove();
  };

  const saveAndClose = () => {
    if (finished) return;
    let url = input.value.trim();
    if (!url) {
      cancelAndClose();
      return;
    }
    finished = true;

    if (!/^(https?:\/\/|file:\/\/|mailto:|tel:)/i.test(url)) {
      url = 'https://' + url;
    }

    block.type = cmdType as BlockType;
    block.url = url;
    block.content = url;

    block.bookmarkTitle = undefined;
    block.bookmarkDesc = undefined;
    block.bookmarkImage = undefined;
    block.bookmarkIcon = undefined;

    rerenderNote(ctx, n);

    if (cmdType === 'bookmark') {
      if (window.electronAPI && window.electronAPI.fetchLinkMetadata) {
        window.electronAPI.fetchLinkMetadata(url)
          .then((meta) => {
            if (meta && meta.title) {
              block.bookmarkTitle = meta.title;
              block.bookmarkDesc = meta.description;
              block.bookmarkImage = meta.image;
              block.bookmarkIcon = meta.icon;
              rerenderNote(ctx, n);
            }
          })
          .catch((err) => {
            console.error('Error fetching link metadata:', err);
          });
      }
    }

    if (handleOutsideClick) {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    popup.remove();

    const match = findBlockById(n.blocks, block.id);
    if (match) {
      focusNextBlockOrNew(ctx, n, match.index, match.parentList);
    }
  };

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    saveAndClose();
  });

  if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelAndClose();
      openMediaFilePrompt(ctx, 'pdf', block, n);
    });
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelAndClose();
    }
  });

  setTimeout(() => {
    handleOutsideClick = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        if (input.value.trim()) {
          saveAndClose();
        } else {
          cancelAndClose();
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
  }, 0);
}
