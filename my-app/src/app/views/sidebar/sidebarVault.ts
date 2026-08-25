import type { AppContext } from '../../context';
import type { FlyoutItem } from '../../../types';
import { IC } from '../../../constants';
import { APPS } from '../../../store';

export async function reloadFromVault(ctx: AppContext) {
  const { clearVaultCache, sharedNotes, sharedFolders, sharedNotebooks, saveAndSync: _saveAndSync } = await import('../../../store');
  clearVaultCache();
  const newVaultData = window.electronAPI?.loadVault
    ? await window.electronAPI.loadVault()
    : (window.electronAPI?.loadVaultSync ? window.electronAPI.loadVaultSync() : null);
  sharedNotes.length = 0;
  if (newVaultData?.notes) {
    newVaultData.notes.forEach((n: any) => sharedNotes.push(n));
  }
  sharedFolders.length = 0;
  if (newVaultData?.folders) {
    newVaultData.folders.forEach((f: any) => sharedFolders.push(f));
  }
  sharedNotebooks.length = 0;
  if (newVaultData?.notebooks) {
    newVaultData.notebooks.forEach((nb: any) => sharedNotebooks.push(nb));
  }
  
  // Clean state boundary reset (BUG-21)
  ctx.st.historyStack = [];
  ctx.st.historyIndex = -1;
  ctx.st.tag = null;
  ctx.st.folder = null;
  ctx.st.sel = null;
  ctx.st.nb = 'all';
  ctx.st.quick = 'all';
  ctx.st.expandedFolders = new Set(['design']);

  APPS.forEach(app => {
    if (app.st) {
      app.st.historyStack = [];
      app.st.historyIndex = -1;
      app.st.tag = null;
      app.st.folder = null;
      app.st.sel = null;
      app.st.nb = 'all';
      app.st.quick = 'all';
      app.st.expandedFolders = new Set(['design']);
    }
  });

  _saveAndSync();
}

function getVaultId(vaultPath: string): string {
  let hash = 0;
  for (let i = 0; i < vaultPath.length; i++) {
    const char = vaultPath.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + '00000000';
}

function buildVaultList(overlay: HTMLElement, ctx: AppContext, currentPath: string) {
  const list = overlay.querySelector('#vmVaultList') as HTMLElement;
  list.innerHTML = '';

  const recents: string[] = window.electronAPI?.getRecentVaultsSync() ?? [];

  // Always ensure current vault is at the top
  const allVaults = [currentPath, ...recents.filter(p => p !== currentPath)].filter(Boolean);

  if (allVaults.length === 0) {
    list.innerHTML = '<p class="vm-empty">No vaults found.</p>';
    return;
  }

  allVaults.forEach(vaultPath => {
    const parts = vaultPath.replace(/\\/g, '/').split('/');
    const vaultName = parts[parts.length - 1] || vaultPath;
    const isActive = vaultPath === currentPath;

    const row = document.createElement('div');
    row.className = 'vm-vault-item' + (isActive ? ' vm-vault-item--active' : '');
    row.innerHTML = `
      <div class="vm-vault-item-body">
        <span class="vm-vault-item-name">${vaultName}</span>
        <span class="vm-vault-item-path">${vaultPath}</span>
      </div>
      <button class="vm-vault-item-more rv" title="Vault options" data-path="${vaultPath}">
        <span class="ic">${IC.dots}</span>
      </button>`;

    if (!isActive) {
      // Click on row body to switch vault
      const body = row.querySelector('.vm-vault-item-body') as HTMLElement;
      body.style.cursor = 'pointer';
      body.addEventListener('click', async () => {
        try {
          await window.electronAPI!.openVaultByPath(vaultPath);
          await reloadFromVault(ctx);
          
          APPS.forEach(app => {
            app.selectFirstNote();
            app.renderSidebar();
            app.renderList();
            if (app.closeVaultSwitcher) app.closeVaultSwitcher();
          });
          
          const newPath = window.electronAPI!.getVaultPathSync();
          const newParts = newPath.replace(/\\/g, '/').split('/');
          const newVaultName = newParts[newParts.length - 1] || newPath;
          
          document.querySelectorAll('.lens-lbl').forEach(lbl => {
            lbl.textContent = newVaultName;
          });
          
          ctx.toast(`Switched to: ${newVaultName}`);
        } catch (err) {
          ctx.toast('Failed to open vault: path may not exist.');
        }
      });
    }

    const moreBtn = row.querySelector('.vm-vault-item-more') as HTMLButtonElement;
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = moreBtn.getBoundingClientRect();
        const items: FlyoutItem[] = [
          {
            label: 'Copy vault ID',
            icon: IC.copy,
            action: () => {
              const vaultId = getVaultId(vaultPath);
              navigator.clipboard.writeText(vaultId);
              ctx.toast('Vault ID copied to clipboard');
            }
          },
          {
            label: 'Rename vault...',
            icon: IC.pen,
            action: () => {
              ctx.showPrompt('Rename vault:', 'Vault name', vaultName, async (newName) => {
                if (newName && newName.trim() && newName.trim() !== vaultName) {
                  try {
                    const result = await window.electronAPI!.renameVault(vaultPath, newName.trim());
                    if (result && result.success) {
                      ctx.toast(`Renamed vault to: ${newName.trim()}`);
                      const isActiveVault = vaultPath === currentPath;
                      if (isActiveVault) {
                        await reloadFromVault(ctx);
                        APPS.forEach(app => {
                          app.selectFirstNote();
                          app.renderSidebar();
                          app.renderList();
                        });
                        document.querySelectorAll('.lens-lbl').forEach(lbl => {
                          lbl.textContent = newName.trim();
                        });
                      }
                      buildVaultList(overlay, ctx, isActiveVault ? result.newPath : currentPath);
                    }
                  } catch (err: any) {
                    ctx.toast(`Failed to rename vault: ${err.message || err}`);
                  }
                }
              });
            }
          },
          {
            label: 'Move vault...',
            icon: IC.folder,
            action: async () => {
              try {
                const newPath = await window.electronAPI!.moveVault(vaultPath);
                if (newPath) {
                  ctx.toast(`Moved vault to new location`);
                  const isActiveVault = vaultPath === currentPath;
                  if (isActiveVault) {
                    await reloadFromVault(ctx);
                    APPS.forEach(app => {
                      app.selectFirstNote();
                      app.renderSidebar();
                      app.renderList();
                    });
                    const parts = newPath.replace(/\\/g, '/').split('/');
                    const newName = parts[parts.length - 1] || newPath;
                    document.querySelectorAll('.lens-lbl').forEach(lbl => {
                      lbl.textContent = newName;
                    });
                  }
                  buildVaultList(overlay, ctx, isActiveVault ? newPath : currentPath);
                }
              } catch (err: any) {
                ctx.toast(`Failed to move vault: ${err.message || err}`);
              }
            }
          },
          {
            label: 'Reveal vault in system explorer',
            icon: IC.share,
            action: async () => {
              const ok = await window.electronAPI!.revealVaultInExplorer(vaultPath);
              if (!ok) {
                ctx.toast('Failed to open vault folder in explorer');
              }
            }
          }
        ];

        if (!isActive) {
          items.push({ sep: true } as any);
          items.push({
            label: 'Remove from list',
            icon: IC.trash,
            danger: true,
            action: async () => {
              await window.electronAPI!.removeRecentVault(vaultPath);
              buildVaultList(overlay, ctx, currentPath);
            }
          });
        }

        ctx.openFlyAt(rect.left, rect.bottom + 6, items);
      });
    }

    list.appendChild(row);
  });
}

export function openVaultSwitcher(ctx: AppContext) {
  if (!window.electronAPI) {
    ctx.toast('Vault management requires the desktop app');
    return;
  }

  const overlay = document.getElementById('vaultOverlay')!;
  const currentPath = window.electronAPI.getVaultPathSync();
  buildVaultList(overlay, ctx, currentPath);
  overlay.style.display = 'flex';

  const close = () => {
    const current = window.electronAPI!.getVaultPathSync();
    if (!current) {
      ctx.toast('Please select or create a vault to continue');
      return;
    }
    overlay.style.display = 'none';
    const createForm = overlay.querySelector('#vaultCreateForm') as HTMLElement;
    if (createForm) createForm.style.display = 'none';
    const nameInput = overlay.querySelector('#vaultNameInput') as HTMLInputElement;
    if (nameInput) nameInput.value = '';
    
    const closeBtn = overlay.querySelector('#vaultClose') as HTMLElement;
    if (closeBtn) closeBtn.style.display = '';
  };

  // close on backdrop click (clicking the left vm-left side area only)
  const backdropHandler = (e: MouseEvent) => {
    if (e.target === overlay) {
      const current = window.electronAPI!.getVaultPathSync();
      if (current) {
        close();
        overlay.removeEventListener('click', backdropHandler);
      }
    }
  };
  overlay.addEventListener('click', backdropHandler);

  // close button
  const closeBtn = overlay.querySelector('#vaultClose') as HTMLButtonElement;
  closeBtn.onclick = () => {
    const current = window.electronAPI!.getVaultPathSync();
    if (current) {
      close();
      overlay.removeEventListener('click', backdropHandler);
    }
  };

  // Open Folder as Vault
  const openBtn = overlay.querySelector('#vaultOpenFolder') as HTMLButtonElement;
  openBtn.onclick = async () => {
    const newPath = await window.electronAPI!.selectVaultFolder();
    if (newPath) {
      await reloadFromVault(ctx);
      
      APPS.forEach(app => {
        app.selectFirstNote();
        app.renderSidebar();
        app.renderList();
        if (app.closeVaultSwitcher) app.closeVaultSwitcher();
      });

      const parts = newPath.replace(/\\/g, '/').split('/');
      const vaultName = parts[parts.length - 1] || newPath;
      
      document.querySelectorAll('.lens-lbl').forEach(lbl => {
        lbl.textContent = vaultName;
      });
      ctx.toast(`Opened vault: ${vaultName}`);
    }
  };

  // Create New Vault — toggle sub-form
  const createBtn = overlay.querySelector('#vaultCreateNew') as HTMLButtonElement;
  const createForm = overlay.querySelector('#vaultCreateForm') as HTMLElement;
  const nameInput = overlay.querySelector('#vaultNameInput') as HTMLInputElement;
  createBtn.onclick = () => {
    const isVisible = createForm.style.display !== 'none';
    createForm.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) setTimeout(() => nameInput.focus(), 50);
  };

  const confirmBtn = overlay.querySelector('#vaultCreateConfirm') as HTMLButtonElement;
  confirmBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) { ctx.toast('Please enter a vault name'); return; }
    const newPath = await window.electronAPI!.createNewVault(name);
    if (newPath) {
      await reloadFromVault(ctx);
      
      APPS.forEach(app => {
        app.selectFirstNote();
        app.renderSidebar();
        app.renderList();
        if (app.closeVaultSwitcher) app.closeVaultSwitcher();
      });

      createForm.style.display = 'none';
      nameInput.value = '';
      
      document.querySelectorAll('.lens-lbl').forEach(lbl => {
        lbl.textContent = name;
      });
      ctx.toast(`Created vault: ${name}`);
    }
  };

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
    if (e.key === 'Escape') { createForm.style.display = 'none'; nameInput.value = ''; }
  });
}

// Global Ctrl+Shift+, shortcut to open Vault Switcher
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ',') {
    e.preventDefault();
    const overlay = document.getElementById('vaultOverlay');
    if (!overlay) return;
    if (overlay.style.display === 'flex') {
      overlay.style.display = 'none';
    } else {
      // We need a ctx reference – dispatch a custom event the app can intercept
      document.dispatchEvent(new CustomEvent('fluent:open-vault-switcher'));
    }
  }
});
