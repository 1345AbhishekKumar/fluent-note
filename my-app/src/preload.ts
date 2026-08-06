import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  openNewWindow: (noteId?: string) => ipcRenderer.send('window-new', noteId),
  fetchLinkMetadata: (url: string) => ipcRenderer.invoke('fetch-link-metadata', url),
});

declare global {
  interface Window {
    electronAPI?: {
      closeWindow: () => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      openNewWindow: (noteId?: string) => void;
      fetchLinkMetadata: (url: string) => Promise<{ title: string; description: string; image: string; icon: string }>;
    };
  }
}
