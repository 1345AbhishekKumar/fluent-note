import type { AppContext } from './context';
import { IC } from '../constants';
import { openVaultSwitcher, reloadFromVault } from './views/sidebar';

export function initVaultSwitcher(ctx: AppContext, root: HTMLElement) {
  const q = <T extends HTMLElement>(s: string): T => root.querySelector(s) as T;
  const lensSwitcherBtn = q<HTMLButtonElement>('#lensSwitcherBtn');
  const lensVaultDropdown = q<HTMLElement>('#lensVaultDropdown');
  const lvdVaultList = q<HTMLElement>('#lvdVaultList');
  const lvdManageBtn = q<HTMLButtonElement>('#lvdManageBtn');

  function populateLensDropdown() {
    if (!window.electronAPI) {
      lensVaultDropdown.innerHTML = '<p style="font-size:11px;color:var(--text-muted);padding:8px 12px;">Desktop app only</p>';
      return;
    }
    const currentPath = window.electronAPI.getVaultPathSync();
    const recents: string[] = window.electronAPI.getRecentVaultsSync() ?? [];

    lvdVaultList.innerHTML = '';
    recents.forEach(vaultPath => {
      const parts = vaultPath.replace(/\\/g, '/').split('/');
      const vaultName = parts[parts.length - 1] || vaultPath;
      const isActive = vaultPath === currentPath;
      const row = document.createElement('button');
      row.className = 'lvd-vault-item' + (isActive ? ' active' : '');
      row.innerHTML = `<span class="lvd-vault-name">${vaultName}</span>${isActive ? `<span class="lvd-check-ic">${IC.check}</span>` : ''}`;
      row.title = vaultPath;
      if (!isActive) {
        row.addEventListener('click', async () => {
          try {
            await window.electronAPI!.openVaultByPath(vaultPath);
            await reloadFromVault(ctx);
            ctx.api.selectFirstNote();
            lensVaultDropdown.style.display = 'none';
            const lensLbl = q<HTMLElement>('.lens-lbl');
            if (lensLbl) lensLbl.textContent = vaultName;
            ctx.renderSidebar();
            ctx.renderList();
            ctx.toast(`Switched to ${vaultName}`);
          } catch (e) {
            ctx.toast('Failed to switch vault');
          }
        });
      }
      lvdVaultList.appendChild(row);
    });
  }

  if (lensSwitcherBtn && lensVaultDropdown) {
    lensSwitcherBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = lensVaultDropdown.style.display !== 'none';
      lensVaultDropdown.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) populateLensDropdown();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!lensSwitcherBtn.contains(e.target as Node) && !lensVaultDropdown.contains(e.target as Node)) {
        lensVaultDropdown.style.display = 'none';
      }
    });
  }

  if (lvdManageBtn) {
    lvdManageBtn.addEventListener('click', () => {
      lensVaultDropdown.style.display = 'none';
      openVaultSwitcher(ctx);
    });
  }
}
