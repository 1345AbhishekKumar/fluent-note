import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { createWindow, initWindowManager } from './main/windowManager';
import { initLinkMetadata } from './main/linkMetadata';
import { initVaultManager } from './main/vaultManager';

if (started) {
  app.quit();
}

initWindowManager();
initLinkMetadata();
initVaultManager();

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
