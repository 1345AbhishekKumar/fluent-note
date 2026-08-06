import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

if (started) {
  app.quit();
}

const createWindow = (noteId?: string) => {
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

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(noteId ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}?noteId=${noteId}` : MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      noteId ? { query: { noteId } } : undefined
    );
  }
};

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

function parseMetadata(html: string, urlStr: string) {
  const result = {
    title: '',
    description: '',
    image: '',
    icon: '',
  };
  
  // Try to find title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Helper for meta tags
  const getMeta = (nameOrProperty: string) => {
    const regex = new RegExp(`<meta[^>]*(?:name|property)=["']${nameOrProperty}["'][^>]*content=["']([^"']+)["']`, 'i');
    const match = html.match(regex);
    if (match) return match[1].trim();
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${nameOrProperty}["']`, 'i');
    const match2 = html.match(regex2);
    if (match2) return match2[1].trim();
    return '';
  };

  result.title = getMeta('og:title') || getMeta('twitter:title') || result.title;
  result.description = getMeta('description') || getMeta('og:description') || getMeta('twitter:description');
  result.image = getMeta('og:image') || getMeta('twitter:image');

  // Try to find favicon icon
  const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
                    html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
  if (iconMatch) {
    result.icon = iconMatch[1].trim();
  }

  // Resolve relative URLs
  try {
    const parsedUrl = new URL(urlStr);
    if (result.image && !result.image.startsWith('http')) {
      result.image = new URL(result.image, parsedUrl.origin).href;
    }
    if (result.icon && !result.icon.startsWith('http')) {
      result.icon = new URL(result.icon, parsedUrl.origin).href;
    } else if (!result.icon) {
      result.icon = `${parsedUrl.origin}/favicon.ico`;
    }
  } catch (e) {
    // Ignore URL errors
  }

  return result;
}

ipcMain.handle('fetch-link-metadata', async (event, urlStr: string) => {
  try {
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }
    const response = await fetch(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error('Fetch failed');
    const html = await response.text();
    return parseMetadata(html, urlStr);
  } catch (e) {
    console.error('Metadata fetch error:', e);
    return { title: '', description: '', image: '', icon: '' };
  }
});

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
