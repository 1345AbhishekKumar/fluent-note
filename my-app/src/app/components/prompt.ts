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
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);';
  
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
        transition: border-color 0.15s, box-shadow 0.15s;
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
        transition: background-color 0.1s, transform 0.05s;
      }
      .prompt-modal-container .btn-cancel:active,
      .prompt-modal-container .btn-ok:active {
        transform: scale(0.97);
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
  
  const input = modal.querySelector('.prompt-input') as HTMLInputElement;
  const cancelBtn = modal.querySelector('.btn-cancel') as HTMLButtonElement;
  const okBtn = modal.querySelector('.btn-ok') as HTMLButtonElement;
  
  input.focus();
  input.select();
  
  const close = (result: string | null) => {
    modal.remove();
    callback(result);
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
