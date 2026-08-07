import type { AppContext } from '../context';

export function showPrompt(
  ctx: AppContext,
  title: string,
  placeholder: string,
  value: string,
  callback: (val: string | null) => void
) {
  const modal = document.createElement('div');
  modal.className = 'p2p-modal-overlay prompt-modal-container';
  
  modal.innerHTML = `
    <style>
      .prompt-modal-container .p2p-card {
        background: var(--card);
        border: 1px solid var(--card-brd);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
      }
      .prompt-modal-container .prompt-input {
        width: 100%;
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid var(--pane-brd);
        background: var(--input);
        color: var(--text1);
        outline: none;
        font-size: 13px;
        transition: border-color var(--duration-quick) var(--ease-smooth-out), box-shadow var(--duration-quick) var(--ease-smooth-out);
      }
      .prompt-modal-container .prompt-input:focus {
        border-color: var(--focus);
        box-shadow: 0 0 0 2px var(--accent-soft);
      }
      .prompt-modal-container .btn-cancel,
      .prompt-modal-container .btn-ok {
        padding: 6px 16px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color var(--duration-quick) var(--ease-smooth-out), transform var(--duration-micro) var(--ease-smooth-out);
      }
      .prompt-modal-container .btn-cancel:active,
      .prompt-modal-container .btn-ok:active {
        transform: scale(var(--scale-medium));
      }
      .prompt-modal-container .btn-cancel {
        background: var(--nav-h);
        color: var(--text1);
        border: 1px solid var(--pane-brd);
      }
      .prompt-modal-container .btn-cancel:hover {
        background: var(--card-h);
      }
      .prompt-modal-container .btn-ok {
        background: var(--accent);
        color: var(--accent-on);
        border: 1px solid var(--accent-brd);
      }
      .prompt-modal-container .btn-ok:hover {
        background: var(--accent-fill-h);
      }
    </style>
    <div class="p2p-card">
      <div style="font-weight: 600; font-size: 13.5px; color: var(--text1); margin-bottom: 2px;">${title}</div>
      <input type="text" class="prompt-input" value="${value}" placeholder="${placeholder}" />
      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:4px;">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-ok">OK</button>
      </div>
    </div>
  `;
  
  ctx.root.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
  
  const input = modal.querySelector('.prompt-input') as HTMLInputElement;
  const cancelBtn = modal.querySelector('.btn-cancel') as HTMLButtonElement;
  const okBtn = modal.querySelector('.btn-ok') as HTMLButtonElement;
  
  input.focus();
  input.select();
  
  let closed = false;
  let callbackCalled = false;
  const close = (result: string | null) => {
    if (closed) return;
    closed = true;
    modal.classList.remove('show');
    const cleanup = () => {
      if (callbackCalled) return;
      callbackCalled = true;
      modal.remove();
      callback(result);
    };
    modal.addEventListener('transitionend', (e) => {
      if (e.target === modal) cleanup();
    }, { once: true });
    setTimeout(cleanup, 250);
  };
  
  cancelBtn.addEventListener('click', () => close(null));
  okBtn.addEventListener('click', () => close(input.value.trim()));
  
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      close(input.value.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(null);
    }
  });
}
