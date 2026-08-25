/**
 * Utility for rendering isolated sandboxed HTML previews in iframes.
 */

export function buildSafeHtmlDoc(rawContent: string, theme: 'light' | 'dark' = 'dark'): string {
  const content = rawContent || '';
  
  // If the user already wrote a full <!DOCTYPE html> or <html> document, inject basic styles & error handler
  const isFullDoc = /<!doctype\s+html|<html[\s>]/i.test(content);
  
  const bg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const text = theme === 'dark' ? '#f0f0f0' : '#1a1a1a';
  const errorBg = theme === 'dark' ? '#3b1219' : '#ffebee';
  const errorText = theme === 'dark' ? '#f87171' : '#c62828';

  const helperScript = `
    <script>
      window.onerror = function(msg, url, line, col, error) {
        var errDiv = document.getElementById('__fn_preview_error__');
        if (!errDiv) {
          errDiv = document.createElement('div');
          errDiv.id = '__fn_preview_error__';
          errDiv.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;background:${errorBg};color:${errorText};padding:8px 12px;border-radius:6px;font-family:monospace;font-size:12px;z-index:999999;border:1px solid rgba(239,68,68,0.3);box-shadow:0 4px 12px rgba(0,0,0,0.15);word-break:break-word;';
          document.body.appendChild(errDiv);
        }
        errDiv.textContent = 'Preview Error [Line ' + line + ']: ' + msg;
      };
    </script>
  `;

  if (isFullDoc) {
    if (content.includes('</body>')) {
      return content.replace('</body>', `${helperScript}</body>`);
    }
    return content + helperScript;
  }

  // Snippet mode: Wrap in standard HTML5 scaffolding with clean defaults
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 14px;
      line-height: 1.5;
      color: ${text};
      background-color: ${bg};
      overflow-x: hidden;
    }
    img, video, canvas, svg {
      max-width: 100%;
      height: auto;
    }
  </style>
  ${helperScript}
</head>
<body>
${content}
</body>
</html>`;
}

export function updateHtmlPreviewIframe(iframe: HTMLIFrameElement, rawContent: string, theme: 'light' | 'dark' = 'dark') {
  if (!iframe) return;
  const doc = buildSafeHtmlDoc(rawContent, theme);
  iframe.srcdoc = doc;
}

export function renderHtmlPreviewsInContainer(container: HTMLElement, theme: 'light' | 'dark' = 'dark') {
  const htmlBlocks = container.querySelectorAll('.block-html-wrapper');
  htmlBlocks.forEach((wrapper) => {
    const codeField = wrapper.querySelector('.html-code-field') as HTMLElement;
    const iframe = wrapper.querySelector('.html-preview-iframe') as HTMLIFrameElement;
    if (!iframe) return;

    let rawText = '';
    if (codeField) {
      const html = codeField.innerHTML || '';
      if (html.includes('<br>') || html.includes('<div>')) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<div>/gi, '');
        rawText = tmp.textContent || '';
      } else {
        rawText = codeField.innerText || codeField.textContent || '';
      }
    }

    updateHtmlPreviewIframe(iframe, rawText, theme);
  });
}
