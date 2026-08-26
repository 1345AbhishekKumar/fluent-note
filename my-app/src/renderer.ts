import './index.css';
import { createApp } from './app/createApp';
import { APPS } from './store';
import { initToaster, setToasterTheme, showToast } from './app/toaster';

export * from './types';
export * from './constants';
export * from './utils';
export * from './store';
export * from './app/createApp';
export * from './app/toaster';

export function removeSearchHighlights(container?: Element | Document | null) {
  const root = container || document;
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('.search-highlight').forEach((el: any) => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      parent.normalize();
    }
  });
}

/* ================= BOOT ================= */
document.addEventListener('DOMContentLoaded', () => {
  initToaster('light');

  const halfA = document.getElementById('halfA');
  const halfB = document.getElementById('halfB');
  if (!halfA || !halfB) return;

  const appA = createApp(halfA, 'light');
  const appB = createApp(halfB, 'dark');

  appA.onTheme = (t) => {
    document.body.dataset.wall = t;
    setToasterTheme(t as 'light' | 'dark' | 'system');
  };

  document.addEventListener('selectionchange', () => {
    requestAnimationFrame(() => APPS.forEach(a => a.sync && a.sync()));
  });

  const getActiveApp = (): any => {
    if (document.activeElement) {
      for (const app of APPS) {
        if (app.root.contains(document.activeElement)) {
          return app;
        }
      }
    }
    return appA;
  };

  // Alt+Shift+Click (Option+Shift+Click on Mac) and Ctrl+Click (Cmd+Click on Mac) handling
  document.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const noteBtn = target.closest('[data-id][data-type="note"]') || target.closest('.lp-scroll .item') || target.closest('.sub-item-btn.note-item') || target.closest('.backlink-item');
    if (!noteBtn) return;

    const noteId = (noteBtn as HTMLElement).dataset.id || (noteBtn as HTMLElement).getAttribute('data-id');
    if (!noteId) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isAltShift = e.shiftKey && (isMac ? e.metaKey || e.altKey : e.altKey);
    const isCtrlClick = (e.ctrlKey || e.metaKey) && !e.shiftKey;

    if (isAltShift || isCtrlClick) {
      e.preventDefault();
      e.stopPropagation();
      window.electronAPI?.openNewWindow?.(noteId);
    }
  }, true);

  document.addEventListener('keydown', e => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const activeEl = document.activeElement as HTMLElement;
    const inEditor = activeEl && activeEl.classList.contains('block-text-field');
    const hasSelection = window.getSelection() && !window.getSelection()?.isCollapsed;

    if (e.key === 'Escape') {
      APPS.forEach(a => {
        a.root.querySelector('.flyout')?.classList.remove('open');
        a.root.classList.remove('sb-open');
      });
    }

    // Ctrl+F: Find inside a page
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const app = getActiveApp();
      let searchBar = app.root.querySelector('.page-search-bar') as HTMLElement;
      if (!searchBar) {
        searchBar = document.createElement('div');
        searchBar.className = 'page-search-bar';
        searchBar.innerHTML = `
          <input class="page-search-input" type="text" placeholder="Find in note..." />
          <span class="page-search-count">0/0</span>
          <button class="page-search-btn prev" title="Previous match">&uarr;</button>
          <button class="page-search-btn next" title="Next match">&darr;</button>
          <button class="page-search-close" title="Close search">&times;</button>
        `;
        app.root.querySelector('.editorpane')?.appendChild(searchBar);

        const input = searchBar.querySelector('.page-search-input') as HTMLInputElement;
        const close = searchBar.querySelector('.page-search-close') as HTMLElement;
        const countSpan = searchBar.querySelector('.page-search-count') as HTMLElement;
        
        let matches: HTMLElement[] = [];
        let activeMatchIdx = -1;
        
        const highlightTextNodes = (el: Node, query: string): HTMLElement[] => {
          const highlights: HTMLElement[] = [];
          const queryLower = query.toLowerCase();

          const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.nodeValue || '';
              const textLower = text.toLowerCase();
              const idx = textLower.indexOf(queryLower);
              if (idx !== -1) {
                const matchText = text.substring(idx, idx + query.length);
                const remainingText = text.substring(idx + query.length);
                
                node.nodeValue = text.substring(0, idx);
                
                const span = document.createElement('span');
                span.className = 'search-highlight';
                span.textContent = matchText;
                
                const nextTextNode = document.createTextNode(remainingText);
                
                const parent = node.parentNode;
                if (parent) {
                  const nextSibling = node.nextSibling;
                  parent.insertBefore(span, nextSibling);
                  parent.insertBefore(nextTextNode, nextSibling);
                  highlights.push(span);
                  
                  // Walk the newly created text node for any remaining matches
                  walk(nextTextNode);
                }
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              if ((node as HTMLElement).classList.contains('search-highlight')) {
                return;
              }
              const children = Array.from(node.childNodes);
              for (const child of children) {
                walk(child);
              }
            }
          };

          walk(el);
          return highlights;
        };

        const performSearch = () => {
          const query = input.value.trim().toLowerCase();
          removeSearchHighlights(app.root);
          matches = [];
          activeMatchIdx = -1;

          if (!query) {
            countSpan.textContent = '0/0';
            return;
          }

          const fields = app.root.querySelectorAll('.editorpane .block-text-field');
          fields.forEach((field: any) => {
            highlightTextNodes(field, query);
          });

          matches = Array.from(app.root.querySelectorAll('.search-highlight')) as HTMLElement[];
          if (matches.length > 0) {
            activeMatchIdx = 0;
            matches[0].classList.add('active');
            matches[0].scrollIntoView({ block: 'center' });
            countSpan.textContent = `1/${matches.length}`;
          } else {
            countSpan.textContent = '0/0';
          }
        };

        input.addEventListener('input', performSearch);
        
        const navigate = (dir: 'next' | 'prev') => {
          if (matches.length === 0) return;
          matches[activeMatchIdx].classList.remove('active');
          if (dir === 'next') {
            activeMatchIdx = (activeMatchIdx + 1) % matches.length;
          } else {
            activeMatchIdx = (activeMatchIdx - 1 + matches.length) % matches.length;
          }
          matches[activeMatchIdx].classList.add('active');
          matches[activeMatchIdx].scrollIntoView({ block: 'center' });
          countSpan.textContent = `${activeMatchIdx + 1}/${matches.length}`;
        };

        searchBar.querySelector('.page-search-btn.next')?.addEventListener('click', () => navigate('next'));
        searchBar.querySelector('.page-search-btn.prev')?.addEventListener('click', () => navigate('prev'));

        close.addEventListener('click', () => {
          removeSearchHighlights(app.root);
          searchBar.remove();
        });

        input.addEventListener('keydown', e2 => {
          if (e2.key === 'Enter') {
            e2.preventDefault();
            navigate('next');
          }
          if (e2.key === 'Escape') {
            e2.preventDefault();
            close.click();
          }
        });
      }
      
      const input = searchBar.querySelector('.page-search-input') as HTMLInputElement;
      input.focus();
      input.select();
      return;
    }

    // Ctrl+Shift+L: Toggle Dark/Light Mode
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      const app = getActiveApp();
      app.setTheme(app.theme === 'dark' ? 'light' : 'dark');
      return;
    }

    // Ctrl+N: Create New Note
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
      e.preventDefault();
      const app = getActiveApp();
      (app.root.querySelector('.sb-new') as HTMLButtonElement)?.click();
      return;
    }

    // Ctrl+Shift+N: Open New Window
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      window.electronAPI?.openNewWindow?.();
      return;
    }

    // Ctrl+T: New Tab/Window
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
      e.preventDefault();
      window.electronAPI?.openNewWindow?.();
      return;
    }

    // Ctrl+L: Copy Page Link
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      const app = getActiveApp();
      const noteId = app.getSelectedNoteId();
      if (noteId) {
        const link = `fluent-notes://note/${noteId}`;
        navigator.clipboard.writeText(link).then(() => {
          showToast('Note link copied to clipboard!');
        });
      }
      return;
    }

    // Ctrl+[ or Alt+Left: Go Back
    if (((e.ctrlKey || e.metaKey) && e.key === '[') || (e.altKey && (e.key === 'ArrowLeft' || e.key === 'Left'))) {
      e.preventDefault();
      const app = getActiveApp();
      if (app.goBack) {
        app.goBack();
      } else if (app.st && app.st.historyStack && app.st.historyIndex > 0) {
        app.st.historyIndex--;
        const noteId = app.st.historyStack[app.st.historyIndex];
        app.selectNote(noteId, false, true);
      }
      return;
    }

    // Ctrl+] or Alt+Right: Go Forward
    if (((e.ctrlKey || e.metaKey) && e.key === ']') || (e.altKey && (e.key === 'ArrowRight' || e.key === 'Right'))) {
      e.preventDefault();
      const app = getActiveApp();
      if (app.goForward) {
        app.goForward();
      } else if (app.st && app.st.historyStack && app.st.historyIndex < app.st.historyStack.length - 1) {
        app.st.historyIndex++;
        const noteId = app.st.historyStack[app.st.historyIndex];
        app.selectNote(noteId, false, true);
      }
      return;
    }

    // Ctrl+Shift+K (Mac) or Ctrl+K (Windows) inside database peek view to go to previous page
    const isPrevDbPage = isMac 
      ? ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k')
      : ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k' && inEditor && !hasSelection);
    if (isPrevDbPage) {
      e.preventDefault();
      const app = getActiveApp();
      app.navigateNote('prev');
      return;
    }

    // Ctrl+Shift+J (Mac) or Ctrl+J (Windows) inside database peek view to go to next page
    const isNextDbPage = isMac
      ? ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j')
      : ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'j');
    if (isNextDbPage) {
      e.preventDefault();
      const app = getActiveApp();
      app.navigateNote('next');
      return;
    }

    // Ctrl+K or Ctrl+P: Focus search (if not intercepted by database navigation or link selection)
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
      if (e.key.toLowerCase() === 'k' && hasSelection) {
        // Link creation is handled in editor key events
        return;
      }
      e.preventDefault();
      const app = getActiveApp();
      (app.root.querySelector('.search') as HTMLInputElement)?.focus();
      return;
    }

    // Ctrl+Shift+U: Go up one level in page hierarchy
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      const app = getActiveApp();
      const currentId = app.getSelectedNoteId();
      if (currentId) {
        const note = app.st.notes.find((n: any) => n.id === currentId);
        if (note && note.parentId) {
          app.selectNote(note.parentId);
        }
      }
      return;
    }

    // Ctrl + = / Ctrl + -: Zoom In / Zoom Out
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-')) {
      e.preventDefault();
      const app = getActiveApp();
      if (!app.st.zoomFactor) app.st.zoomFactor = 1.0;
      if (e.key === '=' || e.key === '+') {
        app.st.zoomFactor = Math.min(1.8, app.st.zoomFactor + 0.1);
      } else {
        app.st.zoomFactor = Math.max(0.6, app.st.zoomFactor - 0.1);
      }
      app.root.style.zoom = app.st.zoomFactor;
      return;
    }
  });

  // Load initial note if noteId is in search params
  const params = new URLSearchParams(window.location.search);
  const initialNoteId = params.get('noteId');
  if (initialNoteId) {
    appA.selectNote(initialNoteId);
    if (document.body.classList.contains('split')) {
      appB.selectNote(initialNoteId);
    }
  }

  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch (e) {}
});
