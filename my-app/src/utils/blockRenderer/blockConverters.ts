import type { Block } from '../../types';
import { genId, esc } from '../stringHelpers';

export function htmlToBlocks(html: string): Block[] {
  const d = document.createElement('div');
  d.innerHTML = html;
  const blocks: Block[] = [];
  
  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      
      if (tag === 'h2') {
        blocks.push({ id: genId(), type: 'heading1', content: el.textContent || '', children: [] });
      } else if (tag === 'h3') {
        blocks.push({ id: genId(), type: 'heading2', content: el.textContent || '', children: [] });
      } else if (tag === 'img') {
        blocks.push({
          id: genId(),
          type: 'image',
          url: el.getAttribute('src') || '',
          content: el.getAttribute('alt') || 'image',
          children: []
        });
      } else if (tag === 'video') {
        blocks.push({
          id: genId(),
          type: 'video',
          url: el.getAttribute('src') || '',
          content: 'video',
          children: []
        });
      } else if (tag === 'audio') {
        blocks.push({
          id: genId(),
          type: 'audio',
          url: el.getAttribute('src') || '',
          content: 'audio',
          children: []
        });
      } else if (tag === 'iframe') {
        blocks.push({
          id: genId(),
          type: 'pdf',
          url: el.getAttribute('src') || '',
          content: 'PDF',
          children: []
        });
      } else if (tag === 'pre') {
        const codeEl = el.querySelector('code');
        let lang = 'plaintext';
        if (codeEl) {
          const classes = Array.from(codeEl.classList);
          const langClass = classes.find(c => c.startsWith('language-'));
          if (langClass) {
            lang = langClass.replace('language-', '');
          }
        }
        blocks.push({
          id: genId(),
          type: 'code',
          content: el.textContent || '',
          language: lang,
          children: []
        });
      } else if (tag === 'a' && el.classList.contains('bookmark-link')) {
        let url = el.getAttribute('href') || '';
        if (url && !/^(https?:\/\/|file:\/\/|mailto:|tel:)/i.test(url)) {
          url = 'https://' + url;
        }
        blocks.push({
          id: genId(),
          type: 'bookmark',
          url: url,
          content: el.textContent || '',
          bookmarkTitle: el.getAttribute('data-title') || undefined,
          bookmarkDesc: el.getAttribute('data-desc') || undefined,
          bookmarkImage: el.getAttribute('data-image') || undefined,
          bookmarkIcon: el.getAttribute('data-icon') || undefined,
          children: []
        });
      } else if (tag === 'a' && el.classList.contains('file-link')) {
        blocks.push({
          id: genId(),
          type: 'file',
          url: el.getAttribute('href') || '',
          content: el.textContent || '',
          fileName: el.getAttribute('download') || '',
          children: []
        });
      } else if (tag === 'li') {
        const isTodo = el.querySelector('input[type="checkbox"]') !== null || el.textContent?.trim().startsWith('[ ]') || el.textContent?.trim().startsWith('[x]');
        const checked = el.querySelector('input[type="checkbox"]') ? (el.querySelector('input[type="checkbox"]') as HTMLInputElement).checked : false;
        let content = el.textContent || '';
        if (content.startsWith('[ ]') || content.startsWith('[x]')) {
          content = content.substring(3).trim();
        }
        blocks.push({
          id: genId(),
          type: isTodo ? 'todo' : 'paragraph',
          content: content,
          checked: isTodo ? checked : undefined,
          children: []
        });
      } else if (tag === 'p' || tag === 'blockquote' || tag === 'div') {
        if (el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName.toLowerCase() === 'br')) {
          blocks.push({ id: genId(), type: 'paragraph', content: el.textContent || '', children: [] });
        } else {
          Array.from(el.childNodes).forEach(child => walk(child));
        }
      } else {
        const isBlockTag = ['ul', 'ol', 'section', 'article'].includes(tag);
        if (isBlockTag) {
          Array.from(el.childNodes).forEach(child => walk(child));
        } else {
          const text = el.textContent || '';
          if (text.trim()) {
            blocks.push({ id: genId(), type: 'paragraph', content: text, children: [] });
          }
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        blocks.push({ id: genId(), type: 'paragraph', content: text.trim(), children: [] });
      }
    }
  }
  
  Array.from(d.childNodes).forEach(child => walk(child));
  
  if (blocks.length === 0) {
    blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
  }
  return blocks;
}

export function blocksToHtml(blocks: Block[]): string {
  if (!blocks || blocks.length === 0) return '';
  let html = '';
  for (const block of blocks) {
    if (block.type === 'heading1') {
      html += `<h2>${esc(block.content)}</h2>`;
    } else if (block.type === 'heading2') {
      html += `<h3>${esc(block.content)}</h3>`;
    } else if (block.type === 'todo') {
      const checkedAttr = block.checked ? 'checked' : '';
      html += `<p><input type="checkbox" ${checkedAttr} disabled> ${esc(block.content)}</p>`;
    } else if (block.type === 'image') {
      html += `<p><img src="${block.url || ''}" alt="${esc(block.content || 'image')}" /></p>`;
    } else if (block.type === 'video') {
      html += `<p><video src="${block.url || ''}" controls></video></p>`;
    } else if (block.type === 'audio') {
      html += `<p><audio src="${block.url || ''}" controls></audio></p>`;
    } else if (block.type === 'pdf') {
      html += `<p><iframe src="${block.url || ''}" class="block-media-pdf"></iframe></p>`;
    } else if (block.type === 'bookmark') {
      html += `<p><a class="bookmark-link" href="${block.url || ''}" data-title="${esc(block.bookmarkTitle || '')}" data-desc="${esc(block.bookmarkDesc || '')}" data-image="${esc(block.bookmarkImage || '')}" data-icon="${esc(block.bookmarkIcon || '')}">${esc(block.content || block.url || 'Bookmark')}</a></p>`;
    } else if (block.type === 'file') {
      html += `<p><a class="file-link" href="${block.url || ''}" download="${esc(block.fileName || '')}">${esc(block.content || 'File')}</a></p>`;
    } else if (block.type === 'code') {
      html += `<pre><code class="language-${block.language || 'plaintext'}">${esc(block.content || '')}</code></pre>`;
    } else {
      html += `<p>${esc(block.content)}</p>`;
    }
    if (block.children && block.children.length > 0) {
      html += blocksToHtml(block.children);
    }
  }
  return html;
}
