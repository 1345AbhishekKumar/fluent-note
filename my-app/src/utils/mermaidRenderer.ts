import mermaid from 'mermaid';
import { esc } from './stringHelpers';

function getMermaidApi() {
  const m = mermaid as any;
  return m.default || m;
}

try {
  const api = getMermaidApi();
  if (api && typeof api.initialize === 'function') {
    api.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose'
    });
  }
} catch (e) {}

export async function renderMermaidDiagramsInContainer(container: HTMLElement, theme: 'light' | 'dark' = 'dark') {
  const api = getMermaidApi();
  if (!api || typeof api.render !== 'function') return;

  try {
    if (typeof api.initialize === 'function') {
      api.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose'
      });
    }
  } catch (e) {}

  const mermaidBlocks = container.querySelectorAll('.block-mermaid-wrapper');
  mermaidBlocks.forEach(async (wrapper) => {
    const blockId = (wrapper as HTMLElement).dataset.id;
    if (!blockId) return;

    const codeField = wrapper.querySelector('.mermaid-code-field') as HTMLElement;
    const outputEl = wrapper.querySelector('.mermaid-render-output') as HTMLElement;
    if (!outputEl) return;

    let rawText = '';
    if (codeField) {
      // Preserve newlines from contenteditable HTML by replacing <br> and <div> with newlines
      const html = codeField.innerHTML || '';
      if (html.includes('<br>') || html.includes('<div>')) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<div>/gi, '');
        rawText = tmp.textContent || '';
      } else {
        rawText = codeField.innerText || codeField.textContent || '';
      }
    }

    const code = rawText.trim();
    if (!code) {
      outputEl.innerHTML = `<div class="mermaid-error text-xs text-text3 italic p-2">Empty diagram code</div>`;
      return;
    }

    const sanitizedId = blockId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const renderId = `mermaid-${sanitizedId}`;

    // Clean any pre-existing temporary DOM nodes left by previous render attempts
    const cleanupTempNodes = () => {
      const orphans = document.querySelectorAll(`[id="${renderId}"], [id="d${renderId}"], [id^="d${renderId}"]`);
      orphans.forEach(el => el.remove());
    };

    cleanupTempNodes();

    try {
      const res = await api.render(renderId, code);
      const svg = typeof res === 'string' ? res : res.svg;
      outputEl.innerHTML = svg;
    } catch (err: any) {
      cleanupTempNodes();
      const msg = err?.message ? String(err.message).split('\n')[0] : 'Syntax error in Mermaid definition';
      outputEl.innerHTML = `<div class="mermaid-error text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg font-mono border border-red-800/50 my-1">${esc(msg)}</div>`;
    } finally {
      // Ensure no dangling elements remained in document.body
      const dangling = document.getElementById('d' + renderId);
      if (dangling) dangling.remove();
    }
  });
}
