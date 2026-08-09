import { app, dialog, shell, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { sanitizeFilename, serializeNoteToMarkdown, deserializeMarkdownToNote } from '../utils/fsUtils';
import { DEFAULT_NOTES, DEFAULT_FOLDERS, DEFAULT_CLIPS } from '../constants';

const configPath = path.join(app.getPath('userData'), 'fluent-notes-config.json');

export interface GlobalConfig {
  currentVaultPath?: string;
  recentVaults?: string[];
}

export function readConfig(): GlobalConfig {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return {};
}

export function writeConfig(cfg: GlobalConfig) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing config:', e);
  }
}

export function getVaultPath(): string {
  const cfg = readConfig();
  if (cfg.currentVaultPath) {
    if (!cfg.recentVaults) cfg.recentVaults = [];
    if (!cfg.recentVaults.includes(cfg.currentVaultPath)) {
      cfg.recentVaults.unshift(cfg.currentVaultPath);
      writeConfig(cfg);
    }
    return cfg.currentVaultPath;
  }
  return '';
}

export function setVaultPath(p: string) {
  const cfg = readConfig();
  cfg.currentVaultPath = p;
  if (!cfg.recentVaults) cfg.recentVaults = [];
  cfg.recentVaults = cfg.recentVaults.filter(x => x !== p);
  cfg.recentVaults.unshift(p);
  writeConfig(cfg);
}

export function getRecentVaults(): string[] {
  const cfg = readConfig();
  if (!cfg.recentVaults) {
    const active = getVaultPath();
    return [active];
  }
  const validVaults = cfg.recentVaults.filter(p => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isDirectory();
    } catch (e) {
      return false;
    }
  });
  if (validVaults.length !== cfg.recentVaults.length) {
    cfg.recentVaults = validVaults;
    writeConfig(cfg);
  }
  return validVaults;
}

export function removeRecentVault(p: string) {
  const cfg = readConfig();
  if (cfg.recentVaults) {
    cfg.recentVaults = cfg.recentVaults.filter(x => x !== p);
    if (cfg.currentVaultPath === p) {
      cfg.currentVaultPath = cfg.recentVaults[0] || '';
    }
    writeConfig(cfg);
  }
}

function readMdFilesRecursively(dir: string, baseDir: string): string[] {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (file !== '.fluent-notes' && file !== '.git' && file !== 'node_modules') {
          results = results.concat(readMdFilesRecursively(filePath, baseDir));
        }
      } else if (file.endsWith('.md')) {
        results.push(path.relative(baseDir, filePath));
      }
    });
  } catch (e) {
    console.error('Error reading dir recursively:', e);
  }
  return results;
}

function getFolderPathById(folders: any[], notebooks: any[], notes: any[], parentId: string): string {
  if (!parentId) return '';
  const f = folders.find(x => x.id === parentId);
  if (f) {
    const parentPath = getFolderPathById(folders, notebooks, notes, f.parentId);
    return path.join(parentPath, sanitizeFilename(f.name));
  }
  const nb = notebooks.find(x => x.id === parentId);
  if (nb) {
    return sanitizeFilename(nb.name);
  }
  const parentNote = notes ? notes.find(x => x.id === parentId) : null;
  if (parentNote) {
    const parentPath = getFolderPathById(folders, notebooks, notes, parentNote.parentId || parentNote.nb);
    return path.join(parentPath, sanitizeFilename(parentNote.title || 'Untitled'));
  }
  return '';
}

function removeEmptyDirsRecursively(dir: string, isRoot = false) {
  try {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (file !== '.fluent-notes' && file !== '.git' && file !== 'node_modules') {
          removeEmptyDirsRecursively(filePath, false);
        }
      }
    });
    
    if (!isRoot) {
      const updatedList = fs.readdirSync(dir);
      if (updatedList.length === 0) {
        fs.rmdirSync(dir);
      }
    }
  } catch (e) {
    console.error('Error removing empty directories:', e);
  }
}

export function initVaultManager() {
  ipcMain.on('get-vault-path-sync', (event) => {
    event.returnValue = getVaultPath();
  });

  ipcMain.on('get-recent-vaults-sync', (event) => {
    event.returnValue = getRecentVaults();
  });

  ipcMain.handle('remove-recent-vault', async (event, p: string) => {
    removeRecentVault(p);
    return getRecentVaults();
  });

  ipcMain.handle('select-vault-folder', async (event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Fluent Notes Vault Directory'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      setVaultPath(selectedPath);
      return selectedPath;
    }
    return null;
  });

  ipcMain.handle('create-new-vault', async (event, name: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Parent Folder for New Vault'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const parentDir = result.filePaths[0];
      const newVaultPath = path.join(parentDir, name);
      try {
        if (!fs.existsSync(newVaultPath)) {
          fs.mkdirSync(newVaultPath, { recursive: true });
        }
        setVaultPath(newVaultPath);
        return newVaultPath;
      } catch (err) {
        console.error('Failed to create new vault folder:', err);
        throw err;
      }
    }
    return null;
  });

  ipcMain.handle('open-vault-by-path', async (event, p: string) => {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      setVaultPath(p);
      return p;
    }
    throw new Error('Vault path does not exist');
  });

  ipcMain.handle('reveal-vault-in-explorer', async (event, p: string) => {
    try {
      if (fs.existsSync(p)) {
        await shell.openPath(p);
        return true;
      }
    } catch (err) {
      console.error('Failed to reveal vault in explorer:', err);
    }
    return false;
  });

  ipcMain.handle('rename-vault', async (event, oldPath: string, newName: string) => {
    if (!fs.existsSync(oldPath)) {
      throw new Error('Vault path does not exist');
    }
    const parentDir = path.dirname(oldPath);
    const newPath = path.join(parentDir, newName);
    if (fs.existsSync(newPath)) {
      throw new Error('A folder with that name already exists');
    }
    
    try {
      fs.renameSync(oldPath, newPath);
    } catch (err) {
      console.error('Failed to rename vault folder:', err);
      throw err;
    }

    // Update configuration
    const cfg = readConfig();
    if (cfg.currentVaultPath === oldPath) {
      cfg.currentVaultPath = newPath;
    }
    if (cfg.recentVaults) {
      cfg.recentVaults = cfg.recentVaults.map(x => x === oldPath ? newPath : x);
    }
    writeConfig(cfg);

    return { success: true, newPath };
  });

  ipcMain.handle('move-vault', async (event, currentPath: string) => {
    if (!fs.existsSync(currentPath)) {
      throw new Error('Vault path does not exist');
    }

    const result = await dialog.showOpenDialog({
      title: 'Select New Parent Directory for Vault',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const parentDir = result.filePaths[0];
    const folderName = path.basename(currentPath);
    const newPath = path.join(parentDir, folderName);

    if (fs.existsSync(newPath)) {
      throw new Error('A folder with that name already exists in the target directory');
    }

    try {
      fs.renameSync(currentPath, newPath);
    } catch (err: any) {
      if (err.code === 'EXDEV') {
        try {
          fs.cpSync(currentPath, newPath, { recursive: true });
          fs.rmSync(currentPath, { recursive: true, force: true });
        } catch (copyErr) {
          console.error('Failed to copy and delete vault for cross-device move:', copyErr);
          throw copyErr;
        }
      } else {
        console.error('Failed to move vault folder:', err);
        throw err;
      }
    }

    // Update configuration
    const cfg = readConfig();
    if (cfg.currentVaultPath === currentPath) {
      cfg.currentVaultPath = newPath;
    }
    if (cfg.recentVaults) {
      cfg.recentVaults = cfg.recentVaults.map(x => x === currentPath ? newPath : x);
    }
    writeConfig(cfg);

    return newPath;
  });

  ipcMain.on('load-vault-sync', (event) => {
    const vaultPath = getVaultPath();
    if (!vaultPath) {
      event.returnValue = { notes: [], folders: [], notebooks: [], tags: [], clips: [] };
      return;
    }
    try {
      if (!fs.existsSync(vaultPath)) {
        fs.mkdirSync(vaultPath, { recursive: true });
      }

      const defaultPath = path.join(app.getPath('documents'), 'FluentNotesVault');
      const isDefaultVault = vaultPath.toLowerCase() === defaultPath.toLowerCase();

      const configDir = path.join(vaultPath, '.fluent-notes');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const metadataPath = path.join(configDir, 'metadata.json');
      let metadata: any = {
        folders: isDefaultVault ? DEFAULT_FOLDERS : [],
        notebooks: isDefaultVault ? [
          { id: 'design', name: 'Design Team', color: '#8470ff' },
          { id: 'work', name: 'Work', color: '#ff9d42' },
          { id: 'research', name: 'Research', color: '#23b8b8' },
          { id: 'personal', name: 'Personal', color: '#ff6a8f' }
        ] : [],
        tags: isDefaultVault ? [
          { id: 'design', name: 'design', color: '#4cc2ff' },
          { id: 'ideas', name: 'ideas', color: '#ffb900' },
          { id: 'todo', name: 'to-do', color: '#6ccb5f' },
          { id: 'meeting', name: 'meeting', color: '#c58af9' },
          { id: 'reading', name: 'reading', color: '#ff8fb2' },
          { id: 'travel', name: 'travel', color: '#4de0c0' }
        ] : [],
        clips: isDefaultVault ? DEFAULT_CLIPS : []
      };

      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (e) {
          console.error('Error parsing metadata.json:', e);
        }
      } else {
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      }

      // Read all notes recursively
      const notes: any[] = [];
      const relativeMdFiles = readMdFilesRecursively(vaultPath, vaultPath);

      if (relativeMdFiles.length === 0) {
        if (isDefaultVault) {
          DEFAULT_NOTES.forEach(note => {
            const noteContent = serializeNoteToMarkdown(note);
            const fileName = `${sanitizeFilename(note.title) || note.id}.md`;
            fs.writeFileSync(path.join(vaultPath, fileName), noteContent, 'utf8');
            notes.push(note);
          });
        } else {
          // Create exactly one blank Untitled Note
          const untitledNote: any = {
            id: 'n-' + Math.random().toString(36).slice(2, 7),
            nb: '',
            tags: [],
            pinned: false,
            date: 'Just now',
            title: 'Untitled Note',
            body: '<h2>Untitled Note</h2><p>Start writing...</p>',
            blocks: [],
            ord: 0,
            parentId: null
          };
          const noteContent = serializeNoteToMarkdown(untitledNote);
          const fileName = `Untitled Note.md`;
          fs.writeFileSync(path.join(vaultPath, fileName), noteContent, 'utf8');
          notes.push(untitledNote);
        }
      } else {
        relativeMdFiles.forEach(f => {
          try {
            const filePath = path.join(vaultPath, f);
            const content = fs.readFileSync(filePath, 'utf8');
            const basename = path.basename(f, '.md');
            const noteId = basename.split('_').pop() || 'n-' + Math.random().toString(36).slice(2, 7);
            const note = deserializeMarkdownToNote(content, noteId);
            notes.push(note);
          } catch (e) {
            console.error(`Error loading note file ${f}:`, e);
          }
        });
      }

      event.returnValue = {
        notes,
        folders: metadata.folders || [],
        notebooks: metadata.notebooks || [],
        tags: metadata.tags || [],
        clips: metadata.clips || []
      };
    } catch (err) {
      console.error('Error loading vault:', err);
      event.returnValue = { notes: [], folders: [], notebooks: [], tags: [], clips: [] };
    }
  });

  ipcMain.handle('save-vault', async (event, data: { notes: any[], folders: any[], notebooks: any[], tags: any[], clips: any[] }) => {
    const vaultPath = getVaultPath();
    if (!vaultPath) return { success: false, error: 'No vault path' };
    try {
      if (!fs.existsSync(vaultPath)) {
        fs.mkdirSync(vaultPath, { recursive: true });
      }

      const configDir = path.join(vaultPath, '.fluent-notes');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Save metadata
      const metadataPath = path.join(configDir, 'metadata.json');
      const metadata = {
        folders: data.folders,
        notebooks: data.notebooks,
        tags: data.tags,
        clips: data.clips
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      // Ensure all folders and notebooks in metadata are created as physical directories
      data.notebooks.forEach(nb => {
        const dirPath = path.join(vaultPath, sanitizeFilename(nb.name));
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      });

      data.folders.forEach(f => {
        const dir = getFolderPathById(data.folders, data.notebooks, data.notes, f.id);
        const dirPath = path.join(vaultPath, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      });

      // Save notes
      const activePaths = new Set<string>();
      const pathCounts = new Map<string, number>();

      data.notes.forEach(note => {
        const parentId = note.parentId || note.nb;
        const dir = parentId ? getFolderPathById(data.folders, data.notebooks, data.notes, parentId) : '';
        const sanitizedTitle = sanitizeFilename(note.title) || 'Untitled';
        
        let relativePath = path.join(dir, `${sanitizedTitle}.md`);
        
        if (pathCounts.has(relativePath.toLowerCase())) {
          const count = pathCounts.get(relativePath.toLowerCase())! + 1;
          pathCounts.set(relativePath.toLowerCase(), count);
          relativePath = path.join(dir, `${sanitizedTitle}_${note.id}.md`);
        } else {
          pathCounts.set(relativePath.toLowerCase(), 1);
        }

        activePaths.add(relativePath.replace(/\\/g, '/').toLowerCase());

        const filePath = path.join(vaultPath, relativePath);
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        const fileContent = serializeNoteToMarkdown(note);
        fs.writeFileSync(filePath, fileContent, 'utf8');
      });

      // Recursive cleanup of deleted notes
      const allMdFiles = readMdFilesRecursively(vaultPath, vaultPath);
      allMdFiles.forEach(f => {
        const relPathLower = f.replace(/\\/g, '/').toLowerCase();
        if (!activePaths.has(relPathLower)) {
          const filePath = path.join(vaultPath, f);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n/);
            if (match) {
              fs.unlinkSync(filePath);
            }
          } catch (e) {
            console.error(`Error deleting note file ${f}:`, e);
          }
        }
      });

      // Cleanup empty directories recursively
      removeEmptyDirsRecursively(vaultPath, true);

      return { success: true, vaultPath };
    } catch (err: any) {
      console.error('Error saving vault:', err);
      return { success: false, error: err.message || err };
    }
  });

  ipcMain.handle('copy-asset-to-vault', async (event, srcPath: string) => {
    const vaultPath = getVaultPath();
    if (!vaultPath || !fs.existsSync(srcPath)) return null;
    const assetsDir = path.join(vaultPath, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const ext = path.extname(srcPath);
    const baseName = sanitizeFilename(path.basename(srcPath, ext)) || 'file';
    let destFileName = `${baseName}${ext}`;
    let destPath = path.join(assetsDir, destFileName);
    let count = 1;
    while (fs.existsSync(destPath)) {
      destFileName = `${baseName}_${count}${ext}`;
      destPath = path.join(assetsDir, destFileName);
      count++;
    }
    fs.copyFileSync(srcPath, destPath);
    return {
      url: `fluent-file://assets/${destFileName}`,
      fileName: destFileName
    };
  });
}
