import { BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';

export const createWindow = (noteId?: string) => {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'fullscreen-ui',
    backgroundMaterial: 'acrylic',
    visualEffectState: 'active',
    hasShadow: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    try {
      const parsedCurrent = new URL(currentUrl);
      const parsedTarget = new URL(url);
      if (parsedCurrent.origin !== parsedTarget.origin || parsedCurrent.pathname !== parsedTarget.pathname) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (e) {
      if (url !== currentUrl) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(noteId ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}?noteId=${noteId}` : MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      noteId ? { query: { noteId } } : undefined
    );
  }
};

export function initWindowManager() {
  // Handle IPC window controls globally to support multiple windows
  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window-new', (event, noteId) => {
    createWindow(noteId);
  });

  ipcMain.handle('open-external-url', async (event, url: string) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (err) {
      console.error('Failed to open external URL:', err);
      return false;
    }
  });
}
