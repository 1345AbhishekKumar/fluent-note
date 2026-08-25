import type { Notebook } from '../types';
import { DEFAULT_NOTEBOOKS, NOTEBOOKS_KEY } from '../constants';

let cachedVault: any = null;
function getCachedVault() {
  if (cachedVault) return cachedVault;
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      cachedVault = window.electronAPI.loadVaultSync();
      return cachedVault;
    } catch (e) {
      console.error('Error loading notebooks from vault:', e);
    }
  }
  return null;
}

export function loadNotebooks(): Notebook[] {
  try {
    const vault = getCachedVault();
    if (vault && vault.notebooks) return vault.notebooks;
  } catch (e) {
    console.error('Error loading notebooks:', e);
  }
  return DEFAULT_NOTEBOOKS;
}

export function saveNotebooks(_notebooks: Notebook[]) {
  // Disk vault files are the single source of truth; stale localStorage caching removed
}

export const sharedNotebooks: Notebook[] = loadNotebooks();
