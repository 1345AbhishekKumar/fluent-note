import { app, BrowserWindow, protocol, net, globalShortcut } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';
import { createWindow, initWindowManager } from './main/windowManager';
import { initLinkMetadata } from './main/linkMetadata';
import { initVaultManager, getVaultPath } from './main/vaultManager';

if (started) {
  app.quit();
}

app.setAppUserModelId('com.abhishek.fluentnotes');


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
      const normalizedVault = path.normalize(vaultPath);
      const fullPath = path.normalize(path.join(normalizedVault, relativePath));
      const normalizedVaultWithSep = normalizedVault.endsWith(path.sep) ? normalizedVault : normalizedVault + path.sep;
      if (!fullPath.startsWith(normalizedVaultWithSep)) {
        return new Response('Access denied', { status: 403 });
      }
      return net.fetch(pathToFileURL(fullPath).toString());
    } catch (e) {
      console.error('Error serving fluent-file protocol:', e);
      return new Response('File error', { status: 500 });
    }
  });

  createWindow();

  // Register global shortcuts for Sticky Notes and Progress Tracker
  try {
    globalShortcut.register('CommandOrControl+Super+V', () => {
      console.log('Ctrl+Win+V pressed - Progress Tracker triggered');
      createWindow('progress-tracker');
    });

    globalShortcut.register('CommandOrControl+Super+N', () => {
      console.log('Ctrl+Win+N pressed - Sticky Notes triggered');
      createWindow('sticky-note');
    });
  } catch (e) {
    console.error('Failed to register global shortcuts:', e);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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
