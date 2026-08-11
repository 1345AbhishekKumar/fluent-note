import { contextBridge, ipcRenderer } from 'electron';

const api = {
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  openNewWindow: (noteId?: string) => ipcRenderer.send('window:new', noteId),
  fetchLinkMetadata: (url: string) => ipcRenderer.invoke('fetch-link-metadata', url),
  loadVault: () => ipcRenderer.invoke('load-vault'),
  loadVaultSync: () => ipcRenderer.sendSync('load-vault-sync'),
  saveVault: (data: any) => ipcRenderer.invoke('save-vault', data),
  selectVaultFolder: () => ipcRenderer.invoke('select-vault-folder'),
  getVaultPathSync: () => ipcRenderer.sendSync('get-vault-path-sync'),
  getRecentVaultsSync: () => ipcRenderer.sendSync('get-recent-vaults-sync'),
  createNewVault: (name: string) => ipcRenderer.invoke('create-new-vault', name),
  openVaultByPath: (p: string) => ipcRenderer.invoke('open-vault-by-path', p),
  removeRecentVault: (p: string) => ipcRenderer.invoke('remove-recent-vault', p),
  renameVault: (oldPath: string, newName: string) => ipcRenderer.invoke('rename-vault', oldPath, newName),
  moveVault: (p: string) => ipcRenderer.invoke('move-vault', p),
  revealVaultInExplorer: (p: string) => ipcRenderer.invoke('reveal-vault-in-explorer', p),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  copyAssetToVault: (srcPath: string) => ipcRenderer.invoke('copy-asset-to-vault', srcPath),
  searchVaultNotes: (query: string) => ipcRenderer.invoke('search-vault-notes', query),
  getNoteBacklinks: (title: string) => ipcRenderer.invoke('get-note-backlinks', title),
  selectFile: (cmdType: string) => ipcRenderer.invoke('select-file', cmdType),
};

// Expose standard window.api boundary (and legacy window.electronAPI bridge)
contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface ApiBridge {
    closeWindow: () => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    openNewWindow: (noteId?: string) => void;
    fetchLinkMetadata: (url: string) => Promise<{ title: string; description: string; image: string; icon: string }>;
    loadVault: () => Promise<any>;
    loadVaultSync: () => any;
    saveVault: (data: any) => Promise<{ success: boolean; vaultPath?: string; error?: string }>;
    selectVaultFolder: () => Promise<string | null>;
    getVaultPathSync: () => string;
    getRecentVaultsSync: () => string[];
    createNewVault: (name: string) => Promise<string | null>;
    openVaultByPath: (p: string) => Promise<string>;
    removeRecentVault: (p: string) => Promise<string[]>;
    renameVault: (oldPath: string, newName: string) => Promise<{ success: boolean; newPath: string }>;
    moveVault: (p: string) => Promise<string | null>;
    revealVaultInExplorer: (p: string) => Promise<boolean>;
    openExternalUrl: (url: string) => Promise<boolean>;
    copyAssetToVault: (srcPath: string) => Promise<{ url: string; fileName: string } | null>;
    searchVaultNotes: (query: string) => Promise<Array<{ id: string; title: string; nb: string; date: string; body: string }>>;
    getNoteBacklinks: (title: string) => Promise<Array<{ noteId: string; noteTitle: string }>>;
    selectFile: (cmdType: string) => Promise<{ url: string; fileName: string } | null>;
  }

  interface Window {
    api?: ApiBridge;
    electronAPI?: ApiBridge;
  }
}
