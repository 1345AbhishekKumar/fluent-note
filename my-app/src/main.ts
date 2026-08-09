import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';
import { createWindow, initWindowManager } from './main/windowManager';
import { initLinkMetadata } from './main/linkMetadata';
import { initVaultManager, getVaultPath } from './main/vaultManager';

if (started) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'fluent-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true
    }
  }
]);

initWindowManager();
initLinkMetadata();
initVaultManager();

app.on('ready', () => {
  protocol.handle('fluent-file', (request) => {
    try {
      const url = request.url;
      const relativePath = decodeURIComponent(url.replace(/^fluent-file:\/\//, ''));
      const vaultPath = getVaultPath();
      if (!vaultPath) return new Response('No vault open', { status: 404 });
      const fullPath = path.join(vaultPath, relativePath);
      return net.fetch(pathToFileURL(fullPath).toString());
    } catch (e) {
      console.error('Error serving fluent-file protocol:', e);
      return new Response('File error', { status: 500 });
    }
  });

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
