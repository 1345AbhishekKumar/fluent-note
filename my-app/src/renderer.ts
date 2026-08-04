import './index.css';
import { createApp } from './app/createApp';
import { APPS } from './store';

export * from './types';
export * from './constants';
export * from './utils';
export * from './store';
export * from './app/createApp';

/* ================= BOOT ================= */
document.addEventListener('DOMContentLoaded', () => {
  const halfA = document.getElementById('halfA');
  const halfB = document.getElementById('halfB');
  if (!halfA || !halfB) return;

  const appA = createApp(halfA, 'light');
  const appB = createApp(halfB, 'dark');

  appA.onTheme = (t) => {
    document.body.dataset.wall = t;
  };

  document.addEventListener('selectionchange', () => {
    requestAnimationFrame(() => APPS.forEach(a => a.sync && a.sync()));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      APPS.forEach(a => {
        a.root.querySelector('.flyout')?.classList.remove('open');
        a.root.classList.remove('sb-open');
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      (appA.root.querySelector('.search') as HTMLInputElement)?.focus();
    }
  });

  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch (e) {}
});
