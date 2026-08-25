import type { Block } from '../../types';
import { genId, esc } from '../stringHelpers';

export function convertNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (el.classList.contains('wiki-link')) {
    return el.textContent || '';
  }
  if (el.classList.contains('date-badge')) {
    const date = el.getAttribute('data-date') || '';
    return `📅 ${date}`;
  }
  if (el.classList.contains('math-badge')) {
    const tex = el.getAttribute('data-tex') || '';
    return `$$${tex}$$`;
  }
  if (el.classList.contains('search-highlight')) {
    return el.textContent || '';
  }

  let childrenText = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    childrenText += convertNodeToMarkdown(el.childNodes[i]);
  }

  if (tag === 'b' || tag === 'strong') {
    return `**${childrenText}**`;
  }
  if (tag === 'i' || tag === 'em') {
    return `*${childrenText}*`;
  }
  if (tag === 'code') {
    return `\`${childrenText}\``;
  }
  if (tag === 'del' || tag === 's' || tag === 'strike') {
    return `~~${childrenText}~~`;
  }
  if (tag === 'u') {
    return `<u>${childrenText}</u>`;
  }
  if (tag === 'a') {
    const href = el.getAttribute('href');
    if (href && childrenText) {
      return `[${childrenText}](${href})`;
    }
    return childrenText;
  }
  if (tag === 'br') {
    return '<br>';
  }

  return childrenText;
}

export function cleanBadgeHtml(el: HTMLElement): string {
  const temp = document.createElement('div');
  temp.innerHTML = el.innerHTML;
  
  temp.querySelectorAll('.wiki-link').forEach((child: any) => {
    const txt = child.textContent || '';
    child.replaceWith(document.createTextNode(txt));
  });
  temp.querySelectorAll('.date-badge').forEach((child: any) => {
    const date = child.getAttribute('data-date') || '';
    child.replaceWith(document.createTextNode(`📅 ${date}`));
  });
  temp.querySelectorAll('.math-badge').forEach((child: any) => {
    const tex = child.getAttribute('data-tex') || '';
    child.replaceWith(document.createTextNode(`$$${tex}$$`));
  });
  temp.querySelectorAll('.search-highlight').forEach((child: any) => {
    const txt = child.textContent || '';
    child.replaceWith(document.createTextNode(txt));
  });
  
  return convertNodeToMarkdown(temp);
}

export function isSpecialBlockOrBlockTag(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  const blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'blockquote', 'ul', 'ol', 'li', 'hr', 'pre', 'section', 'article', 'aside', 'table'];
  if (blockTags.includes(tag)) return true;
  
  if (tag === 'img' || tag === 'video' || tag === 'audio' || tag === 'iframe') return true;
  if (tag === 'a' && (el.classList.contains('bookmark-link') || el.classList.contains('file-link'))) return true;
  if (el.classList.contains('callout-block') || el.classList.contains('mermaid-block') || el.classList.contains('html-preview-block') || el.classList.contains('html-block') || el.classList.contains('math-block') || el.classList.contains('block-wrapper') || el.classList.contains('toggle-block') || el.classList.contains('column-list-block') || el.classList.contains('column-block') || el.classList.contains('template-block') || el.classList.contains('toc-block') || el.classList.contains('breadcrumb-block')) return true;
  
  return false;
}

export function htmlToBlocks(html: string): Block[] {
  const d = document.createElement('div');
  d.innerHTML = html;
  const blocks: Block[] = [];
  
  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      
      if (tag === 'h2') {
        blocks.push({ id: genId(), type: 'heading1', content: cleanBadgeHtml(el), children: [] });
      } else if (tag === 'h3') {
        blocks.push({ id: genId(), type: 'heading2', content: cleanBadgeHtml(el), children: [] });
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
      } else if (tag === 'h4') {
        blocks.push({ id: genId(), type: 'heading3', content: cleanBadgeHtml(el), children: [] });
      } else if (tag === 'table') {
        const rows: string[][] = [];
        const trs = el.querySelectorAll('tr');
        trs.forEach(tr => {
          const row: string[] = [];
          const tds = tr.querySelectorAll('td, th');
          tds.forEach(td => {
            row.push(cleanBadgeHtml(td as HTMLElement));
          });
          if (row.length > 0) {
            rows.push(row);
          }
        });
        blocks.push({
          id: genId(),
          type: 'table',
          content: JSON.stringify(rows.length > 0 ? rows : [['', ''], ['', '']]),
          children: []
        });
      } else if (tag === 'hr') {
        blocks.push({ id: genId(), type: 'divider', content: '', children: [] });
      } else if (tag === 'blockquote') {
        blocks.push({ id: genId(), type: 'quote', content: cleanBadgeHtml(el), children: [] });
      } else if (el.classList.contains('callout-block')) {
        const pEl = el.querySelector('p') || el;
        blocks.push({
          id: genId(),
          type: 'callout',
          icon: el.getAttribute('data-icon') || '💡',
          content: cleanBadgeHtml(pEl),
          children: []
        });
      } else if (el.classList.contains('toggle-block')) {
        const type = el.getAttribute('data-type') || 'toggle';
        const collapsed = el.getAttribute('data-collapsed') === 'true';
        const childrenContainer = el.querySelector('.toggle-children');
        const childrenBlocks = childrenContainer ? htmlToBlocks(childrenContainer.innerHTML) : [];
        
        const pEl = el.querySelector('p') || el.querySelector('.toggle-title');
        let content = '';
        if (pEl) {
          content = cleanBadgeHtml(pEl as HTMLElement);
        } else {
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelector('.toggle-children')?.remove();
          content = cleanBadgeHtml(clone);
        }
        
        blocks.push({
          id: genId(),
          type: type as any,
          content,
          collapsed,
          children: childrenBlocks
        });
      } else if (el.classList.contains('column-list-block')) {
        const childrenBlocks = htmlToBlocks(el.innerHTML);
        blocks.push({
          id: genId(),
          type: 'column_list',
          content: '',
          children: childrenBlocks
        });
      } else if (el.classList.contains('column-block')) {
        const widthVal = el.getAttribute('data-width');
        const columnWidth = widthVal ? parseInt(widthVal) : undefined;
        const childrenBlocks = htmlToBlocks(el.innerHTML);
        blocks.push({
          id: genId(),
          type: 'column',
          content: '',
          columnWidth,
          children: childrenBlocks
        });
      } else if (el.classList.contains('template-block')) {
        const childrenContainer = el.querySelector('.template-children');
        const childrenBlocks = childrenContainer ? htmlToBlocks(childrenContainer.innerHTML) : [];
        
        const pEl = el.querySelector('p');
        let content = '';
        if (pEl) {
          content = cleanBadgeHtml(pEl);
        } else {
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelector('.template-children')?.remove();
          content = cleanBadgeHtml(clone);
        }
        
        blocks.push({
          id: genId(),
          type: 'template',
          content,
          children: childrenBlocks
        });
      } else if (el.classList.contains('toc-block')) {
        blocks.push({
          id: genId(),
          type: 'toc',
          content: '',
          children: []
        });
      } else if (el.classList.contains('breadcrumb-block')) {
        blocks.push({
          id: genId(),
          type: 'breadcrumb',
          content: '',
          children: []
        });
      } else if (tag === 'pre' || el.classList.contains('mermaid-block') || el.classList.contains('html-preview-block') || el.classList.contains('html-block') || el.classList.contains('math-block')) {
        const codeEl = el.querySelector('code');
        const contentText = codeEl ? (codeEl.textContent || '') : (el.textContent || '');
        if (el.classList.contains('mermaid-block') || (codeEl && codeEl.classList.contains('language-mermaid'))) {
          blocks.push({
            id: genId(),
            type: 'mermaid',
            mermaidMode: (el.getAttribute('data-mermaid-mode') as any) || 'split',
            content: contentText,
            children: []
          });
        } else if (el.classList.contains('html-preview-block') || el.classList.contains('html-block') || (codeEl && (codeEl.classList.contains('language-html-preview') || codeEl.classList.contains('language-htmlpreview')))) {
          blocks.push({
            id: genId(),
            type: 'html',
            htmlMode: (el.getAttribute('data-html-mode') as any) || 'split',
            content: contentText,
            children: []
          });
        } else if (el.classList.contains('math-block') || (codeEl && codeEl.classList.contains('language-math'))) {
          blocks.push({
            id: genId(),
            type: 'math',
            content: contentText,
            children: []
          });
        } else {
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
            content: contentText,
            language: lang,
            children: []
          });
        }
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
        let content = cleanBadgeHtml(el);
        if (isTodo) {
          const temp = document.createElement('div');
          temp.innerHTML = content;
          const checkbox = temp.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.remove();
            content = temp.innerHTML.trim();
          } else if (content.startsWith('[ ]') || content.startsWith('[x]')) {
            content = content.substring(3).trim();
          }
        }
        const parentTag = el.parentElement?.tagName.toLowerCase();
        let itemType: any = 'paragraph';
        if (isTodo) itemType = 'todo';
        else if (parentTag === 'ul') itemType = 'bullet';
        else if (parentTag === 'ol') itemType = 'numbered';

        blocks.push({
          id: genId(),
          type: itemType,
          content: content,
          checked: isTodo ? checked : undefined,
          children: []
        });
      } else if (tag === 'p' || tag === 'div') {
        const hasBlockOrSpecialChildren = Array.from(el.querySelectorAll('*')).some(child => isSpecialBlockOrBlockTag(child));
        
        if (!hasBlockOrSpecialChildren) {
          blocks.push({ id: genId(), type: 'paragraph', content: cleanBadgeHtml(el), children: [] });
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
    } else if (block.type === 'heading3') {
      html += `<h4>${esc(block.content)}</h4>`;
    } else if (block.type === 'todo') {
      const checkedAttr = block.checked ? 'checked' : '';
      html += `<p><input type="checkbox" ${checkedAttr} disabled> ${esc(block.content)}</p>`;
    } else if (block.type === 'bullet') {
      html += `<ul><li>${esc(block.content)}</li></ul>`;
    } else if (block.type === 'numbered') {
      html += `<ol><li>${esc(block.content)}</li></ol>`;
    } else if (block.type === 'quote') {
      html += `<blockquote>${esc(block.content)}</blockquote>`;
    } else if (block.type === 'divider') {
      html += `<hr />`;
    } else if (block.type === 'callout') {
      html += `<div class="callout-block" data-icon="${esc(block.icon || '💡')}"><p>${esc(block.content)}</p></div>`;
    } else if (block.type === 'mermaid') {
      html += `<pre class="mermaid-block" data-mermaid-mode="${block.mermaidMode || 'split'}"><code class="language-mermaid">${esc(block.content || '')}</code></pre>`;
    } else if (block.type === 'html') {
      html += `<pre class="html-preview-block" data-html-mode="${block.htmlMode || 'split'}"><code class="language-html-preview">${esc(block.content || '')}</code></pre>`;
    } else if (block.type === 'math' || block.type === 'equation') {
      html += `<pre class="math-block"><code class="language-math">${esc(block.content || '')}</code></pre>`;
    } else if (block.type === 'image') {
      html += `<p><img src="${esc(block.url || '')}" alt="${esc(block.content || 'image')}" /></p>`;
    } else if (block.type === 'video') {
      html += `<p><video src="${esc(block.url || '')}" controls></video></p>`;
    } else if (block.type === 'audio') {
      html += `<p><audio src="${esc(block.url || '')}" controls></audio></p>`;
    } else if (block.type === 'pdf') {
      html += `<p><iframe src="${esc(block.url || '')}" class="block-media-pdf"></iframe></p>`;
    } else if (block.type === 'bookmark') {
      html += `<p><a class="bookmark-link" href="${esc(block.url || '')}" data-title="${esc(block.bookmarkTitle || '')}" data-desc="${esc(block.bookmarkDesc || '')}" data-image="${esc(block.bookmarkImage || '')}" data-icon="${esc(block.bookmarkIcon || '')}">${esc(block.content || block.url || 'Bookmark')}</a></p>`;
    } else if (block.type === 'file') {
      html += `<p><a class="file-link" href="${esc(block.url || '')}" download="${esc(block.fileName || '')}">${esc(block.content || 'File')}</a></p>`;
    } else if (block.type === 'code') {
      html += `<pre><code class="language-${block.language || 'plaintext'}">${esc(block.content || '')}</code></pre>`;
    } else if (block.type === 'toggle' || block.type === 'toggle_h1' || block.type === 'toggle_h2' || block.type === 'toggle_h3') {
      const collapsedAttr = block.collapsed ? 'data-collapsed="true"' : '';
      html += `<div class="toggle-block" data-type="${block.type}" ${collapsedAttr}><p>${esc(block.content)}</p>`;
      if (block.children && block.children.length > 0) {
        html += `<div class="toggle-children">${blocksToHtml(block.children)}</div>`;
      }
      html += `</div>`;
    } else if (block.type === 'column_list') {
      html += `<div class="column-list-block">`;
      if (block.children && block.children.length > 0) {
        html += blocksToHtml(block.children);
      }
      html += `</div>`;
    } else if (block.type === 'column') {
      const widthAttr = block.columnWidth ? `data-width="${block.columnWidth}"` : '';
      html += `<div class="column-block" ${widthAttr}>`;
      if (block.children && block.children.length > 0) {
        html += blocksToHtml(block.children);
      }
      html += `</div>`;
    } else if (block.type === 'template') {
      html += `<div class="template-block"><p>${esc(block.content || '')}</p>`;
      if (block.children && block.children.length > 0) {
        html += `<div class="template-children">${blocksToHtml(block.children)}</div>`;
      }
      html += `</div>`;
    } else if (block.type === 'toc') {
      html += `<div class="toc-block"></div>`;
    } else if (block.type === 'breadcrumb') {
      html += `<div class="breadcrumb-block"></div>`;
    } else if (block.type === 'subfolder') {
      html += `<div class="subfolder-block" data-id="${esc(block.url || '')}"><p>${esc(block.content || 'Subfolder')}</p></div>`;
    } else if (block.type === 'table') {
      let grid: string[][] = [];
      try {
        grid = JSON.parse(block.content);
      } catch (ex) {
        grid = [['', ''], ['', '']];
      }
      html += `<table><tbody>`;
      for (const row of grid) {
        html += `<tr>`;
        for (const cell of row) {
          html += `<td>${esc(cell)}</td>`;
        }
        html += `</tr>`;
      }
      html += `</tbody></table>`;
    } else {
      html += `<p>${esc(block.content)}</p>`;
    }
    if (block.children && block.children.length > 0 && 
        !['toggle', 'toggle_h1', 'toggle_h2', 'toggle_h3', 'column_list', 'column', 'template', 'table'].includes(block.type)) {
      html += blocksToHtml(block.children);
    }
  }
  return html;
}
