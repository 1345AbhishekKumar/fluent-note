import type { AppContext } from '../context';

export function showPrompt(
  ctx: AppContext,
  title: string,
  placeholder: string,
  value: string,
  callback: (val: string | null) => void
) {
  const modal = document.createElement('div');
  modal.className = 'p2p-modal-overlay prompt-modal-container fixed inset-0 bg-black/0 flex items-center justify-center z-[99999] backdrop-blur-none opacity-0 pointer-events-none transition-all duration-quick ease-smooth-out [&.show]:opacity-100 [&.show]:pointer-events-auto [&.show]:bg-black/40 [&.show]:backdrop-blur-sm';
  
  modal.innerHTML = `
    <div class="p2p-card bg-card border border-card-brd rounded-lg w-[320px] p-5 shadow-2xl flex flex-col gap-3 scale-[0.96] opacity-0 transition-all duration-quick ease-smooth-out [.show_&]:scale-100 [.show_&]:opacity-100">
      <div class="font-semibold text-[13.5px] text-text1 mb-[2px]">${title}</div>
      <input type="text" class="prompt-input w-full px-3 py-2 rounded border border-pane-brd bg-input text-text1 text-xs outline-none focus:border-focus focus:ring-2 focus:ring-accent-soft transition-all duration-quick ease-smooth-out" value="${value}" placeholder="${placeholder}" />
      <div class="flex gap-2 justify-end mt-1">
        <button class="btn-cancel px-4 py-1.5 rounded text-xs font-semibold cursor-pointer bg-nav-h text-text1 border border-pane-brd hover:bg-card-h active:scale-[0.97] transition-all duration-quick ease-smooth-out">Cancel</button>
        <button class="btn-ok px-4 py-1.5 rounded text-xs font-semibold cursor-pointer bg-accent text-accent-on border border-accent-brd hover:bg-accent-fill-h active:scale-[0.97] transition-all duration-quick ease-smooth-out">OK</button>
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
