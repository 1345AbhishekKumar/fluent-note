import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  openNewWindow: (noteId?: string) => ipcRenderer.send('window-new', noteId),
});

declare global {
  interface Window {
    electronAPI?: {
      closeWindow: () => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      openNewWindow: (noteId?: string) => void;
    };
  }
}
