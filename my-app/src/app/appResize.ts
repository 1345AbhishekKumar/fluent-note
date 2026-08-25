import type { AppContext } from './context';

const isStorageAvailable = typeof localStorage !== 'undefined';

export function initResize(ctx: AppContext): () => void {
  const { root, elements } = ctx;

  // 1. Load initial saved widths from localStorage
  const savedSidebarWidth = isStorageAvailable ? localStorage.getItem('fluent-notes:sidebar-width') : null;
  const savedListpaneWidth = isStorageAvailable ? localStorage.getItem('fluent-notes:listpane-width') : null;
  const savedMediaWidth = isStorageAvailable ? localStorage.getItem('fluent-notes:mediapane-width') : null;

  if (savedSidebarWidth) {
    root.style.setProperty('--sidebar-width', `${savedSidebarWidth}px`);
  }
  if (savedListpaneWidth) {
    root.style.setProperty('--listpane-width', `${savedListpaneWidth}px`);
  }

  // Helper to apply initial media width directly if media element is present
  const applyMediaWidth = () => {
    const mediaPane = document.getElementById('pdfPane');
    if (mediaPane) {
      if (savedMediaWidth) {
        mediaPane.style.setProperty('--media-width', `${savedMediaWidth}px`);
      }
    }
  };

  // Run immediately and also set up an observer to apply it when pdfPane is dynamically added
  applyMediaWidth();
  const observer = new MutationObserver(() => {
    applyMediaWidth();
  });
  const frame = document.getElementById('frame') || document.body;
  observer.observe(frame, { childList: true });

  const cleanups: (() => void)[] = [
    () => observer.disconnect()
  ];

  // 2. Setup drag handles
  const handles = root.querySelectorAll('.resize-handle') as NodeListOf<HTMLElement>;

  handles.forEach((handle) => {
    const onPointerDown = (e: PointerEvent) => {
      const targetType = handle.dataset.target;
      if (!targetType) return;

      e.preventDefault();
      handle.releasePointerCapture(e.pointerId);

      const startX = e.clientX;
      let startWidth = 0;
      let targetElement: HTMLElement | null = null;

      if (targetType === 'sidebar') {
        targetElement = elements.sidebar;
        startWidth = targetElement.getBoundingClientRect().width;
      } else if (targetType === 'listpane') {
        targetElement = root.querySelector('.listpane');
        startWidth = targetElement ? targetElement.getBoundingClientRect().width : 0;
      }

      if (!targetElement) return;

      document.body.classList.add('resizing');
      handle.classList.add('dragging');

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        let newWidth = startWidth + deltaX;

        // Apply constraints
        if (targetType === 'sidebar') {
          if (newWidth < 180) newWidth = 180;
          if (newWidth > 400) newWidth = 400;
          root.style.setProperty('--sidebar-width', `${newWidth}px`);
        } else if (targetType === 'listpane') {
          if (newWidth < 200) newWidth = 200;
          if (newWidth > 500) newWidth = 500;
          root.style.setProperty('--listpane-width', `${newWidth}px`);
        }
      };

      const onPointerUp = () => {
        document.body.classList.remove('resizing');
        handle.classList.remove('dragging');
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        // Save new width to localStorage
        if (targetType === 'sidebar') {
          const finalWidth = parseInt(root.style.getPropertyValue('--sidebar-width'));
          if (finalWidth && isStorageAvailable) {
            localStorage.setItem('fluent-notes:sidebar-width', String(finalWidth));
          }
        } else if (targetType === 'listpane') {
          const finalWidth = parseInt(root.style.getPropertyValue('--listpane-width'));
          if (finalWidth && isStorageAvailable) {
            localStorage.setItem('fluent-notes:listpane-width', String(finalWidth));
          }
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', onPointerDown);
    cleanups.push(() => handle.removeEventListener('pointerdown', onPointerDown));
  });

  return () => {
    cleanups.forEach(fn => fn());
  };
}

export function initMediaResize(handle: HTMLElement, pane: HTMLElement): () => void {
  const savedMediaWidth = isStorageAvailable ? localStorage.getItem('fluent-notes:mediapane-width') : null;
  if (savedMediaWidth) {
    pane.style.setProperty('--media-width', `${savedMediaWidth}px`);
  }

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    handle.releasePointerCapture(e.pointerId);

    const startX = e.clientX;
    const startWidth = pane.getBoundingClientRect().width;

    document.body.classList.add('resizing');
    handle.classList.add('dragging');

    const onPointerMove = (moveEvent: PointerEvent) => {
      // Moving left increases width of the rightmost panel
      const deltaX = moveEvent.clientX - startX;
      let newWidth = startWidth - deltaX;

      // Constraints
      const maxAllowedWidth = window.innerWidth - 400;
      if (newWidth < 300) newWidth = 300;
      if (newWidth > maxAllowedWidth) newWidth = maxAllowedWidth;

      pane.style.setProperty('--media-width', `${newWidth}px`);
    };

    const onPointerUp = () => {
      document.body.classList.remove('resizing');
      handle.classList.remove('dragging');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Save width
      const finalWidth = pane.getBoundingClientRect().width;
      if (finalWidth && isStorageAvailable) {
        localStorage.setItem('fluent-notes:mediapane-width', String(Math.round(finalWidth)));
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  handle.addEventListener('pointerdown', onPointerDown);
  return () => {
    handle.removeEventListener('pointerdown', onPointerDown);
  };
}
