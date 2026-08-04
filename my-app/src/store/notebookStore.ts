import type { Notebook } from '../types';
import { DEFAULT_NOTEBOOKS, NOTEBOOKS_KEY } from '../constants';

export function loadNotebooks(): Notebook[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(NOTEBOOKS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading notebooks:', e);
  }
  return DEFAULT_NOTEBOOKS;
}

export function saveNotebooks(notebooks: Notebook[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
    }
  } catch (e) {
    console.error('Error saving notebooks:', e);
  }
}

export const sharedNotebooks: Notebook[] = loadNotebooks();
