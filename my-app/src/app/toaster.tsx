import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Toaster, toast } from 'sonner';

let toasterRoot: Root | null = null;
let currentThemeSetter: ((t: 'light' | 'dark' | 'system') => void) | null = null;

function FluentToasterHost({ initialTheme = 'system' }: { initialTheme?: 'light' | 'dark' | 'system' }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialTheme);

  useEffect(() => {
    currentThemeSetter = (newTheme) => setTheme(newTheme);
    return () => {
      currentThemeSetter = null;
    };
  }, []);

  return (
    <Toaster
      position="bottom-center"
      theme={theme}
      richColors
      closeButton
      duration={3600}
      offset={20}
      className="fluent-toaster"
      toastOptions={{
        className: 'fluent-toast',
      }}
    />
  );
}

/**
 * Initializes and mounts Sonner <Toaster /> once at the document root.
 */
export function initToaster(initialTheme: 'light' | 'dark' | 'system' = 'system'): void {
  if (typeof document === 'undefined') return;
  if (toasterRoot) return;

  let hostEl = document.getElementById('fluent-toaster-root');
  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = 'fluent-toaster-root';
    document.body.appendChild(hostEl);
  }

  toasterRoot = createRoot(hostEl);
  toasterRoot.render(<FluentToasterHost initialTheme={initialTheme} />);
}

/**
 * Dynamically updates the theme of the mounted Toaster.
 */
export function setToasterTheme(theme: 'light' | 'dark' | 'system'): void {
  if (currentThemeSetter) {
    currentThemeSetter(theme);
  }
}

function baseToast(msg: string, actLabel?: string, fn?: () => void): string | number {
  if (actLabel && fn) {
    return toast(msg, {
      action: {
        label: actLabel,
        onClick: () => {
          try {
            fn();
          } catch (err) {
            console.error('Toast action execution error:', err);
          }
        },
      },
    });
  }
  return toast(msg);
}

export type ToastFn = ((msg: string, actLabel?: string, fn?: () => void) => string | number) & typeof toast;

/**
 * Backwards-compatible bridge for legacy (msg, actLabel, fn) callers,
 * with transparent access to all of Sonner's methods (success, error, promise, etc.).
 */
export const showToast = new Proxy(baseToast, {
  get(target, prop, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }
    return (toast as any)[prop];
  },
}) as unknown as ToastFn;

export { toast };
