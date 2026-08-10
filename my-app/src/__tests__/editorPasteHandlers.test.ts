// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { detectMermaidSyntax, detectCodeHeuristics, detectLanguage, parseTextToBlocks, parseHtmlToBlocks, parseClipboardContent } from '../app/views/editorEvents/pasteParser';
import { handleEditorPaste } from '../app/views/editorEvents/editorPasteHandlers';
import type { AppContext } from '../app/context';
import type { Note } from '../types';

describe('Paste Formatting Parser', () => {
  describe('detectMermaidSyntax', () => {
    it('detects standard mermaid keyword headers', () => {
      expect(detectMermaidSyntax('graph TD\n  A --> B')).toBe(true);
      expect(detectMermaidSyntax('flowchart LR\n  A --> B')).toBe(true);
      expect(detectMermaidSyntax('sequenceDiagram\n  Alice->>Bob: Hello')).toBe(true);
      expect(detectMermaidSyntax('Hello World')).toBe(false);
    });
  });

  describe('detectCodeHeuristics', () => {
    it('detects programming syntax structures', () => {
      const code = 'const x = 5;\nconsole.log(x);\nif (x > 3) {\n  return true;\n}';
      const text = 'This is a normal paragraph with some words.\nIt has multiple sentences and simple punctuation.';
      expect(detectCodeHeuristics(code)).toBe(true);
      expect(detectCodeHeuristics(text)).toBe(false);
    });
  });

  describe('detectLanguage', () => {
    it('identifies language from syntax keywords', () => {
      expect(detectLanguage('def calculate(x):\n  return x * 2')).toBe('python');
      expect(detectLanguage('const list = [];')).toBe('javascript');
      expect(detectLanguage('SELECT * FROM users WHERE id = 1;')).toBe('sql');
      expect(detectLanguage('h1 { color: red; }')).toBe('css');
    });
  });

  describe('parseTextToBlocks', () => {
    it('parses headings', () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
      const blocks = parseTextToBlocks(markdown);
      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe('heading1');
      expect(blocks[0].content).toBe('Heading 1');
      expect(blocks[1].type).toBe('heading2');
      expect(blocks[1].content).toBe('Heading 2');
      expect(blocks[2].type).toBe('heading3');
      expect(blocks[2].content).toBe('Heading 3');
    });

    it('parses todo list items', () => {
      const markdown = '[ ] Checkbox 1\n[x] Checkbox 2\n- [ ] Checkbox 3\n* [x] Checkbox 4';
      const blocks = parseTextToBlocks(markdown);
      expect(blocks).toHaveLength(4);
      expect(blocks[0].type).toBe('todo');
      expect(blocks[0].checked).toBe(false);
      expect(blocks[0].content).toBe('Checkbox 1');
      expect(blocks[1].type).toBe('todo');
      expect(blocks[1].checked).toBe(true);
      expect(blocks[1].content).toBe('Checkbox 2');
      expect(blocks[2].type).toBe('todo');
      expect(blocks[2].checked).toBe(false);
      expect(blocks[2].content).toBe('Checkbox 3');
      expect(blocks[3].type).toBe('todo');
      expect(blocks[3].checked).toBe(true);
      expect(blocks[3].content).toBe('Checkbox 4');
    });

    it('parses bullet and numbered lists', () => {
      const markdown = '- Bullet item 1\n* Bullet item 2\n1. Numbered item 1\n2) Numbered item 2';
      const blocks = parseTextToBlocks(markdown);
      expect(blocks).toHaveLength(4);
      expect(blocks[0].type).toBe('bullet');
      expect(blocks[0].content).toBe('Bullet item 1');
      expect(blocks[1].type).toBe('bullet');
      expect(blocks[1].content).toBe('Bullet item 2');
      expect(blocks[2].type).toBe('numbered');
      expect(blocks[2].content).toBe('Numbered item 1');
      expect(blocks[3].type).toBe('numbered');
      expect(blocks[3].content).toBe('Numbered item 2');
    });

    it('parses code blocks, dividers, and quotes', () => {
      const markdown = '```js\nconst x = 10;\n```\n---\n> Quote text';
      const blocks = parseTextToBlocks(markdown);
      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe('code');
      expect(blocks[0].content).toBe('const x = 10;');
      expect(blocks[0].language).toBe('js');
      expect(blocks[1].type).toBe('divider');
      expect(blocks[2].type).toBe('quote');
      expect(blocks[2].content).toBe('Quote text');
    });
  });

  describe('parseHtmlToBlocks', () => {
    it('parses structured HTML input', () => {
      const html = `
        <h1>Header 1</h1>
        <p>A simple paragraph.</p>
        <ul>
          <li>Bullet 1</li>
          <li>[ ] Todo Bullet</li>
        </ul>
        <pre><code class="language-typescript">const flag: boolean = true;</code></pre>
      `;
      const blocks = parseHtmlToBlocks(html);
      expect(blocks.length).toBeGreaterThanOrEqual(4);
      expect(blocks[0].type).toBe('heading1');
      expect(blocks[0].content).toBe('Header 1');
      expect(blocks[1].type).toBe('paragraph');
      expect(blocks[1].content).toBe('A simple paragraph.');
      expect(blocks[2].type).toBe('bullet');
      expect(blocks[2].content).toBe('Bullet 1');
      expect(blocks[3].type).toBe('todo');
      expect(blocks[3].content).toBe('Todo Bullet');
      expect(blocks[3].checked).toBe(false);
      expect(blocks[blocks.length - 1].type).toBe('code');
      expect(blocks[blocks.length - 1].content).toBe('const flag: boolean = true;');
      expect(blocks[blocks.length - 1].language).toBe('typescript');
    });
  });

  describe('parseClipboardContent', () => {
    it('does not classify mixed markdown text with code blocks as a single code block', () => {
      const mixedText = 'Here is the intro text.\n\n```python\ndef my_func():\n  pass\n```\n\nOutro text.';
      const dataTransfer = {
        getData: (format: string) => {
          if (format === 'text/html') return '';
          return mixedText;
        }
      } as unknown as DataTransfer;
      
      const blocks = parseClipboardContent(dataTransfer);
      expect(blocks.length).toBeGreaterThan(1);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].content).toBe('Here is the intro text.');
      
      // Look for the code block
      const codeBlock = blocks.find(b => b.type === 'code');
      expect(codeBlock).toBeDefined();
      expect(codeBlock!.content).toBe('def my_func():\n  pass');
      expect(codeBlock!.language).toBe('python');
    });

    it('classifies pure code content as a single code block', () => {
      const pureCode = 'const calc = (val) => {\n  return val * 2;\n};\nconsole.log(calc(10));';
      const dataTransfer = {
        getData: (format: string) => {
          if (format === 'text/html') return '';
          return pureCode;
        }
      } as unknown as DataTransfer;
      
      const blocks = parseClipboardContent(dataTransfer);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('code');
      expect(blocks[0].content).toBe(pureCode);
    });
  });
});

describe('handleEditorPaste block splitting', () => {
  it('replaces active block if it is empty', () => {
    const note: Note = {
      id: 'n1',
      title: 'Note 1',
      body: '',
      blocks: [
        { id: 'b1', type: 'paragraph', content: '', children: [] }
      ],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 0
    };

    const edBody = document.createElement('div');
    edBody.innerHTML = `
      <div class="block-wrapper" data-id="b1">
        <div class="block-text-field" contenteditable="true"></div>
      </div>
    `;
    document.body.appendChild(edBody);

    const mockCtx = {
      elements: {
        edBody: edBody
      },
      st: {
        notes: [note],
        sel: 'n1'
      },
      api: {
        theme: 'light'
      },
      markSaving: vi.fn(),
      renderEditor: vi.fn()
    } as unknown as AppContext;

    const b1Field = edBody.querySelector('.block-text-field') as HTMLElement;
    b1Field.focus();

    // Mock clipboard event with DataTransfer
    const mockDataTransfer = {
      getData: (format: string) => {
        if (format === 'text/html') return '';
        return '# Pasted Heading\n- Item 1';
      }
    } as unknown as DataTransfer;

    const mockEvent = {
      preventDefault: vi.fn(),
      clipboardData: mockDataTransfer,
      target: b1Field
    } as unknown as ClipboardEvent;

    handleEditorPaste(mockCtx, mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    // The empty block should be replaced with the first pasted block (heading1)
    // and the second block (bullet) should be inserted after it.
    expect(note.blocks).toHaveLength(2);
    expect(note.blocks[0].type).toBe('heading1');
    expect(note.blocks[0].content).toBe('Pasted Heading');
    expect(note.blocks[1].type).toBe('bullet');
    expect(note.blocks[1].content).toBe('Item 1');

    document.body.removeChild(edBody);
  });

  it('splits active block at caret position if it has content', () => {
    const note: Note = {
      id: 'n1',
      title: 'Note 1',
      body: '',
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'HelloWorld', children: [] }
      ],
      nb: 'default',
      tags: [],
      pinned: false,
      date: 'Just now',
      ord: 0
    };

    const edBody = document.createElement('div');
    edBody.innerHTML = `
      <div class="block-wrapper" data-id="b1">
        <div class="block-text-field" contenteditable="true">HelloWorld</div>
      </div>
    `;
    document.body.appendChild(edBody);

    const mockCtx = {
      elements: {
        edBody: edBody
      },
      st: {
        notes: [note],
        sel: 'n1'
      },
      api: {
        theme: 'light'
      },
      markSaving: vi.fn(),
      renderEditor: vi.fn()
    } as unknown as AppContext;

    const b1Field = edBody.querySelector('.block-text-field') as HTMLElement;
    
    // Set caret in the middle of 'HelloWorld' (index 5, between 'Hello' and 'World')
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(b1Field.firstChild!, 5);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    const mockDataTransfer = {
      getData: (format: string) => {
        if (format === 'text/html') return '';
        return '### Splitted\n[ ] Todo Item';
      }
    } as unknown as DataTransfer;

    const mockEvent = {
      preventDefault: vi.fn(),
      clipboardData: mockDataTransfer,
      target: b1Field
    } as unknown as ClipboardEvent;

    handleEditorPaste(mockCtx, mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    // After split, blocks should be:
    // 1. 'Hello' (original block content truncated before caret)
    // 2. 'Splitted' (heading3 from pasted)
    // 3. 'Todo Item' (todo list from pasted)
    // 4. 'World' (remaining original content after caret)
    expect(note.blocks).toHaveLength(4);
    expect(note.blocks[0].content).toBe('Hello');
    expect(note.blocks[1].type).toBe('heading3');
    expect(note.blocks[1].content).toBe('Splitted');
    expect(note.blocks[2].type).toBe('todo');
    expect(note.blocks[2].content).toBe('Todo Item');
    expect(note.blocks[3].type).toBe('paragraph');
    expect(note.blocks[3].content).toBe('World');

    document.body.removeChild(edBody);
  });
});
