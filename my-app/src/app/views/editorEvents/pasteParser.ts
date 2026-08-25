import type { Block, BlockType } from '../../../types';
import { genId, esc } from '../../../utils';

export function sanitizeInlineHtml(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  function clean(node: Node): string {
    let result = '';
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        result += esc(child.textContent || '');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const safeTags = ['b', 'strong', 'i', 'em', 'u', 'strike', 's', 'del', 'mark', 'code', 'a', 'span'];
        if (safeTags.includes(tag)) {
          const innerContent = clean(el);
          if (tag === 'a') {
            const href = el.getAttribute('href') || '';
            result += `<a href="${esc(href)}" target="_blank">${innerContent}</a>`;
          } else if (tag === 'span') {
            const style = el.getAttribute('style') || '';
            const className = el.getAttribute('class') || '';
            let attrs = '';
            if (style) attrs += ` style="${esc(style)}"`;
            if (className) attrs += ` class="${esc(className)}"`;
            result += `<span${attrs}>${innerContent}</span>`;
          } else {
            result += `<${tag}>${innerContent}</${tag}>`;
          }
        } else {
          result += clean(el);
        }
      }
    }
    return result;
  }
  
  return clean(temp);
}

export function detectMermaidSyntax(text: string): boolean {
  const trimmed = text.trim();
  const firstLine = trimmed.split('\n')[0].trim().toLowerCase();
  
  const mermaidKeywords = [
    'graph ', 'graph\n', 'flowchart ', 'flowchart\n',
    'sequencediagram', 'gantt', 'classdiagram', 'statediagram',
    'erdiagram', 'pie', 'gitgraph', 'c4diagram', 'mindmap',
    'timeline', 'zenuml', 'kanban', 'architecture'
  ];
  
  return mermaidKeywords.some(keyword => firstLine.startsWith(keyword));
}

export function detectCodeHeuristics(text: string): boolean {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  
  let codeLineCount = 0;
  
  const codePatterns = [
    / ===? /, / !==? /, / \+= /, / -= /, / \*= /, / \/= /,
    / \&\& /, / \|\| /, / => /, / <= /, / >= /,
    /\bconst\b/, /\blet\b/, /\bvar\b/, /\bfunction\b/, /\bclass\b/,
    /\bimport\b/, /\bexport\b/, /\bpublic\b/, /\bprivate\b/, /\bvoid\b/,
    /\bdef\b/, /\breturn\b/, /\bconsole\.log\b/, /\bprintf?\b/,
    /\bstruct\b/, /\bimpl\b/, /\bfn\b/, /\bpackage\b/, /\bnamespace\b/,
    /\busing\b/, /\bstd::\b/, /\b#include\b/, /\bsystem\.out\b/,
    /\bselect\b/, /\bfrom\b/, /\bwhere\b/, /\binsert\b/, /\bupdate\b/, /\bdelete\b/,
    /\b\w+\(/
  ];
  
  lines.forEach(line => {
    const isCode = 
      line.includes('{') || 
      line.includes('}') || 
      line.endsWith(';') || 
      line.includes(' = ') ||
      codePatterns.some(regex => regex.test(line));
    
    if (isCode) {
      codeLineCount++;
    }
  });
  
  const codeRatio = codeLineCount / lines.length;
  return codeRatio > 0.5;
}

export function detectLanguage(text: string): string {
  const lowercase = text.toLowerCase();
  if (lowercase.includes('import os') || lowercase.includes('def ') || lowercase.includes('print(')) {
    return 'python';
  }
  if (lowercase.includes('const ') || lowercase.includes('let ') || lowercase.includes('console.log') || lowercase.includes('function ')) {
    return 'javascript';
  }
  if (lowercase.includes('public class ') || lowercase.includes('system.out.println')) {
    return 'java';
  }
  if (lowercase.includes('<html>') || lowercase.includes('</div>') || lowercase.includes('class=')) {
    return 'html';
  }
  if (lowercase.includes('select ') && lowercase.includes('from ') && lowercase.includes('where ')) {
    return 'sql';
  }
  if (lowercase.includes('body {') || lowercase.includes('color:') || lowercase.includes('border-radius:')) {
    return 'css';
  }
  return 'javascript'; // default
}

export function parseTextToBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split(/\r?\n/);
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const codeContent = codeBlockLines.join('\n');
        const isMermaid = codeBlockLang === 'mermaid' || detectMermaidSyntax(codeContent);
        const isHtml = codeBlockLang === 'html-preview' || codeBlockLang === 'htmlpreview';
        blocks.push({
          id: genId(),
          type: isMermaid ? 'mermaid' : (isHtml ? 'html' : 'code'),
          content: codeContent,
          language: (isMermaid || isHtml) ? undefined : (codeBlockLang || 'plaintext'),
          mermaidMode: isMermaid ? 'split' : undefined,
          htmlMode: isHtml ? 'split' : undefined,
          children: []
        });
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.substring(3).trim().toLowerCase();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }
    
    // Parse markdown block elements
    if (trimmed.startsWith('# ')) {
      blocks.push({ id: genId(), type: 'heading1', content: line.substring(line.indexOf('# ') + 2), children: [] });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ id: genId(), type: 'heading2', content: line.substring(line.indexOf('## ') + 3), children: [] });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ id: genId(), type: 'heading3', content: line.substring(line.indexOf('### ') + 4), children: [] });
    } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ id: genId(), type: 'divider', content: '', children: [] });
    } else if (trimmed.startsWith('>')) {
      const content = line.substring(line.indexOf('>') + 1).trim();
      blocks.push({ id: genId(), type: 'quote', content, children: [] });
    } else if (/^(?:[\-\*\+\u2022]\s+)?\[([ xX])\]\s+(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^(?:[\-\*\+\u2022]\s+)?\[([ xX])\]\s+(.*)$/);
      if (match) {
        const checked = match[1].toLowerCase() === 'x';
        const content = match[2];
        blocks.push({ id: genId(), type: 'todo', checked, content, children: [] });
      }
    } else if (/^(?:[\-\*\+\u2022])\s+(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^(?:[\-\*\+\u2022])\s+(.*)$/);
      if (match) {
        blocks.push({ id: genId(), type: 'bullet', content: match[1], children: [] });
      }
    } else if (/^\d+[\.\)]\s+(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^\d+[\.\)]\s+(.*)$/);
      if (match) {
        blocks.push({ id: genId(), type: 'numbered', content: match[1], children: [] });
      }
    } else {
      if (trimmed === '') {
        if (blocks.length > 0 && blocks[blocks.length - 1].content !== '') {
          blocks.push({ id: genId(), type: 'paragraph', content: '', children: [] });
        }
      } else {
        blocks.push({ id: genId(), type: 'paragraph', content: line, children: [] });
      }
    }
  }
  
  if (inCodeBlock && codeBlockLines.length > 0) {
    const codeContent = codeBlockLines.join('\n');
    const isMermaid = codeBlockLang === 'mermaid' || detectMermaidSyntax(codeContent);
    const isHtml = codeBlockLang === 'html-preview' || codeBlockLang === 'htmlpreview';
    blocks.push({
      id: genId(),
      type: isMermaid ? 'mermaid' : (isHtml ? 'html' : 'code'),
      content: codeContent,
      language: (isMermaid || isHtml) ? undefined : (codeBlockLang || 'plaintext'),
      mermaidMode: isMermaid ? 'split' : undefined,
      htmlMode: isHtml ? 'split' : undefined,
      children: []
    });
  }
  
  return blocks;
}

export function parseHtmlToBlocks(html: string): Block[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: Block[] = [];
  
  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      
      if (['h1', 'h2'].includes(tag)) {
        blocks.push({ id: genId(), type: 'heading1', content: el.textContent || '', children: [] });
      } else if (tag === 'h3') {
        blocks.push({ id: genId(), type: 'heading2', content: el.textContent || '', children: [] });
      } else if (['h4', 'h5', 'h6'].includes(tag)) {
        blocks.push({ id: genId(), type: 'heading3', content: el.textContent || '', children: [] });
      } else if (tag === 'hr') {
        blocks.push({ id: genId(), type: 'divider', content: '', children: [] });
      } else if (tag === 'blockquote') {
        blocks.push({ id: genId(), type: 'quote', content: el.textContent || '', children: [] });
      } else if (tag === 'pre' || tag === 'code' || el.classList.contains('mermaid-block') || el.classList.contains('html-preview-block') || el.classList.contains('code-block')) {
        const codeEl = tag === 'pre' ? el.querySelector('code') : el;
        const contentText = codeEl ? (codeEl.textContent || '') : (el.textContent || '');
        const isMermaid = el.classList.contains('mermaid-block') || (codeEl !== null && codeEl.classList.contains('language-mermaid')) || detectMermaidSyntax(contentText);
        const isHtml = el.classList.contains('html-preview-block') || (codeEl !== null && (codeEl.classList.contains('language-html-preview') || codeEl.classList.contains('language-htmlpreview')));
        
        if (isMermaid) {
          blocks.push({
            id: genId(),
            type: 'mermaid',
            content: contentText,
            mermaidMode: 'split',
            children: []
          });
        } else if (isHtml) {
          blocks.push({
            id: genId(),
            type: 'html',
            content: contentText,
            htmlMode: 'split',
            children: []
          });
        } else {
          let lang = 'plaintext';
          const classes = codeEl ? Array.from(codeEl.classList) : [];
          const langClass = classes.find(c => c.startsWith('language-'));
          if (langClass) {
            lang = langClass.replace('language-', '');
          } else {
            lang = detectLanguage(contentText);
          }
          blocks.push({
            id: genId(),
            type: 'code',
            content: contentText,
            language: lang,
            children: []
          });
        }
      } else if (tag === 'img') {
        blocks.push({
          id: genId(),
          type: 'image',
          url: el.getAttribute('src') || '',
          content: el.getAttribute('alt') || 'image',
          children: []
        });
      } else if (tag === 'li') {
        const isTodo = el.querySelector('input[type="checkbox"]') !== null || 
                       el.textContent?.trim().startsWith('[ ]') || 
                       el.textContent?.trim().startsWith('[x]') ||
                       el.textContent?.trim().startsWith('[X]');
        
        let checked = false;
        const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox) {
          checked = checkbox.checked;
        } else {
          const trimmedText = el.textContent?.trim() || '';
          checked = trimmedText.startsWith('[x]') || trimmedText.startsWith('[X]');
        }
        
        let content = el.textContent || '';
        if (content.trim().startsWith('[ ]') || content.trim().startsWith('[x]') || content.trim().startsWith('[X]')) {
          content = content.replace(/^\s*\[[ xX]\]\s*/, '');
        }
        
        const parentTag = el.parentElement?.tagName.toLowerCase();
        let itemType: BlockType = 'bullet';
        if (isTodo) itemType = 'todo';
        else if (parentTag === 'ol') itemType = 'numbered';
        
        blocks.push({
          id: genId(),
          type: itemType,
          content: content.trim(),
          checked: isTodo ? checked : undefined,
          children: []
        });
      } else if (['p', 'div', 'span', 'section', 'article', 'ul', 'ol'].includes(tag)) {
        const hasBlockChildren = Array.from(el.children).some(child => 
          ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'pre', 'code', 'ul', 'ol', 'li', 'blockquote', 'hr', 'img'].includes(child.tagName.toLowerCase())
        );
        
        if (!hasBlockChildren && el.textContent?.trim()) {
          const text = el.textContent.trim();
          const matchesMarkdown = 
            text.startsWith('#') || 
            text.startsWith('>') || 
            text.startsWith('-') || 
            text.startsWith('*') || 
            text.startsWith('+') || 
            /^\d+[\.\)]/.test(text) || 
            text === '---';
          
          if (matchesMarkdown) {
            const parsed = parseTextToBlocks(text);
            blocks.push(...parsed);
          } else {
            blocks.push({
              id: genId(),
              type: 'paragraph',
              content: sanitizeInlineHtml(el.innerHTML),
              children: []
            });
          }
        } else {
          Array.from(node.childNodes).forEach(child => walk(child));
        }
      } else {
        const text = el.textContent || '';
        if (text.trim() && node.parentElement?.tagName.toLowerCase() === 'body') {
          blocks.push({ id: genId(), type: 'paragraph', content: text.trim(), children: [] });
        } else {
          Array.from(node.childNodes).forEach(child => walk(child));
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim() && node.parentElement?.tagName.toLowerCase() === 'body') {
        blocks.push({ id: genId(), type: 'paragraph', content: text.trim(), children: [] });
      }
    }
  }
  
  Array.from(doc.body.childNodes).forEach(child => walk(child));
  return blocks.filter(b => b.content !== '' || b.type === 'paragraph');
}

export function parseClipboardContent(clipboardData: DataTransfer): Block[] {
  const html = clipboardData.getData('text/html');
  const text = clipboardData.getData('text') || clipboardData.getData('text/plain') || '';
  
  if (html && html.trim()) {
    const htmlBlocks = parseHtmlToBlocks(html);
    if (htmlBlocks.length > 0) {
      return htmlBlocks;
    }
  }
  
  if (text && text.trim()) {
    if (text.includes('```')) {
      return parseTextToBlocks(text);
    }

    if (detectMermaidSyntax(text)) {
      return [{
        id: genId(),
        type: 'mermaid',
        content: text,
        mermaidMode: 'split',
        children: []
      }];
    }
    
    if (detectCodeHeuristics(text)) {
      return [{
        id: genId(),
        type: 'code',
        content: text,
        language: detectLanguage(text),
        children: []
      }];
    }
    
    return parseTextToBlocks(text);
  }
  
  return [];
}
