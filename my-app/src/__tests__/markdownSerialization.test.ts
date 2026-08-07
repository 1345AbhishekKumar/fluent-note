import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  blocksToMarkdown,
  markdownToBlocks,
  serializeNoteToMarkdown,
  deserializeMarkdownToNote
} from '../utils/fsUtils';
import { htmlToBlocks } from '../utils';
import type { Note, Block } from '../types';

describe('Markdown Serialization & Deserialization', () => {
  it('sanitizes filename correctly by replacing illegal Windows path characters', () => {
    expect(sanitizeFilename('Project: Design/Specs*')).toBe('Project_ Design_Specs_');
    expect(sanitizeFilename('  Clean Name  ')).toBe('Clean Name');
    expect(sanitizeFilename('""<>|*?')).toBe('_______');
  });

  it('serializes blocks to human-readable markdown format', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'heading1', content: 'Fluent Design System', children: [] },
      { id: 'b2', type: 'heading2', content: 'Sub-topics', children: [] },
      { id: 'b3', type: 'paragraph', content: 'This is a description.', children: [] },
      { id: 'b4', type: 'todo', content: 'Task to complete', checked: true, children: [] },
      { id: 'b5', type: 'todo', content: 'Incomplete task', checked: false, children: [] },
      { id: 'b6', type: 'bullet', content: 'Bullet list item', children: [] },
      { id: 'b7', type: 'divider', content: '', children: [] },
      {
        id: 'b8',
        type: 'code',
        content: 'const x = 42;',
        language: 'javascript',
        children: []
      }
    ];

    const md = blocksToMarkdown(blocks);
    expect(md).toContain('# Fluent Design System');
    expect(md).toContain('## Sub-topics');
    expect(md).toContain('This is a description.');
    expect(md).toContain('- [x] Task to complete');
    expect(md).toContain('- [ ] Incomplete task');
    expect(md).toContain('- Bullet list item');
    expect(md).toContain('---');
    expect(md).toContain('```javascript\nconst x = 42;\n```');
  });

  it('serializes a Note to Markdown with YAML frontmatter', () => {
    const note: Note = {
      id: 'n-test-1',
      nb: 'work',
      tags: ['spec', 'roadmap'],
      pinned: true,
      date: 'Today · 10:00',
      title: 'Roadmap & Specs',
      body: '',
      blocks: [
        { id: 'b1', type: 'heading1', content: 'Header Title', children: [] },
        { id: 'b2', type: 'paragraph', content: 'Body paragraph text.', children: [] }
      ],
      ord: 5,
      authors: 'Abhishek',
      journal: 'Tech Notes',
      year: '2026',
      status: 'permanent',
      archived: false,
      parentId: 'parent-folder-1'
    };

    const serialized = serializeNoteToMarkdown(note);
    expect(serialized).toContain('---');
    expect(serialized).toContain('id: "n-test-1"');
    expect(serialized).toContain('nb: "work"');
    expect(serialized).toContain('tags: ["spec","roadmap"]');
    expect(serialized).toContain('pinned: true');
    expect(serialized).toContain('date: "Today · 10:00"');
    expect(serialized).toContain('title: "Roadmap & Specs"');
    expect(serialized).toContain('authors: "Abhishek"');
    expect(serialized).toContain('journal: "Tech Notes"');
    expect(serialized).toContain('year: "2026"');
    expect(serialized).toContain('status: "permanent"');
    expect(serialized).toContain('archived: false');
    expect(serialized).toContain('parentId: "parent-folder-1"');
    expect(serialized).toContain('ord: 5');
    expect(serialized).toContain('blocks: [');
    expect(serialized).toContain('# Header Title');
    expect(serialized).toContain('Body paragraph text.');
  });

  it('deserializes a serialized Markdown note back to Note structure perfectly', () => {
    const note: Note = {
      id: 'n-test-2',
      nb: 'design',
      tags: ['ux'],
      pinned: false,
      date: 'Yesterday',
      title: 'UX Review Notes',
      body: '',
      blocks: [
        { id: 'b10', type: 'paragraph', content: 'Standard text.', children: [] }
      ],
      ord: 10,
      parentId: null
    };

    const serialized = serializeNoteToMarkdown(note);
    const deserialized = deserializeMarkdownToNote(serialized, 'fallback-id');

    expect(deserialized.id).toBe('n-test-2');
    expect(deserialized.nb).toBe('design');
    expect(deserialized.tags).toEqual(['ux']);
    expect(deserialized.pinned).toBe(false);
    expect(deserialized.date).toBe('Yesterday');
    expect(deserialized.title).toBe('UX Review Notes');
    expect(deserialized.ord).toBe(10);
    expect(deserialized.parentId).toBeNull();
    expect(deserialized.blocks).toHaveLength(1);
    expect(deserialized.blocks[0].content).toBe('Standard text.');
  });

  it('deserializes externally created/modified Markdown files (no JSON blocks in YAML) using Markdown parser fallback', () => {
    const rawMarkdown = `---
id: "external-note"
title: "External Note"
nb: "research"
tags: ["import"]
---
# Heading 1 Title
Some paragraph text from another editor.

- [ ] Complete this checkbox
- Bullet point item
- [x] Done checkbox

\`\`\`typescript
const val: number = 100;
\`\`\`
`;

    const note = deserializeMarkdownToNote(rawMarkdown, 'fallback-id');
    expect(note.id).toBe('external-note');
    expect(note.title).toBe('External Note');
    expect(note.nb).toBe('research');
    expect(note.tags).toEqual(['import']);
    expect(note.blocks.length).toBeGreaterThan(0);

    const types = note.blocks.map(b => b.type);
    expect(types).toContain('heading1');
    expect(types).toContain('paragraph');
    expect(types).toContain('todo');
    expect(types).toContain('bullet');
    expect(types).toContain('code');

    const headingBlock = note.blocks.find(b => b.type === 'heading1');
    expect(headingBlock?.content).toBe('Heading 1 Title');

    const todoIncomplete = note.blocks.find(b => b.type === 'todo' && !b.checked);
    expect(todoIncomplete?.content).toBe('Complete this checkbox');

    const todoDone = note.blocks.find(b => b.type === 'todo' && b.checked);
    expect(todoDone?.content).toBe('Done checkbox');

    const codeBlock = note.blocks.find(b => b.type === 'code');
    expect(codeBlock?.content).toContain('const val: number = 100;');
    expect(codeBlock?.language).toBe('typescript');
  });

  it('serializes and deserializes media blocks (image, video, audio, pdf, bookmark) correctly', () => {
    const blocks: Block[] = [
      { id: 'b_img', type: 'image', url: 'data:image/png;base64,123', content: 'pic.png', children: [] },
      { id: 'b_vid', type: 'video', url: 'https://example.com/movie.mp4', content: 'video', children: [] },
      { id: 'b_aud', type: 'audio', url: 'https://example.com/song.mp3', content: 'audio', children: [] },
      { id: 'b_pdf', type: 'pdf', url: 'https://example.com/doc.pdf', content: 'PDF', children: [] },
      { id: 'b_bkm', type: 'bookmark', url: 'https://google.com', content: 'Google', bookmarkTitle: 'Google Title', children: [] }
    ];

    const md = blocksToMarkdown(blocks);
    expect(md).toContain('![pic.png](data:image/png;base64,123)');
    expect(md).toContain('[video](https://example.com/movie.mp4)');
    expect(md).toContain('[audio](https://example.com/song.mp3)');
    expect(md).toContain('[PDF](https://example.com/doc.pdf)');
    expect(md).toContain('[Google Title](https://google.com)');

    const note: Note = {
      id: 'n-media-test',
      nb: 'work',
      tags: [],
      pinned: false,
      date: 'Just now',
      title: 'Media Test',
      body: '',
      blocks,
      ord: 0,
      parentId: null
    };

    const serialized = serializeNoteToMarkdown(note);
    const deserialized = deserializeMarkdownToNote(serialized, 'fallback-id');
    expect(deserialized.blocks).toHaveLength(5);
    expect(deserialized.blocks[0].type).toBe('image');
    expect(deserialized.blocks[0].url).toBe('data:image/png;base64,123');
    expect(deserialized.blocks[1].type).toBe('video');
    expect(deserialized.blocks[2].type).toBe('audio');
    expect(deserialized.blocks[3].type).toBe('pdf');
    expect(deserialized.blocks[4].type).toBe('bookmark');

    // Test markdown fallback parser
    const fallbackNote = deserializeMarkdownToNote(`---
id: "fallback-media"
title: "Fallback Media"
---
![photo.jpg](photo_url)
[video](video_url)
[audio](audio_url)
[PDF](pdf_url)
[Bookmark Title](bookmark_url)
`, 'fallback-id');
    expect(fallbackNote.blocks).toHaveLength(5);
    expect(fallbackNote.blocks[0].type).toBe('image');
    expect(fallbackNote.blocks[0].url).toBe('photo_url');
    expect(fallbackNote.blocks[0].content).toBe('photo.jpg');
    
    expect(fallbackNote.blocks[1].type).toBe('video');
    expect(fallbackNote.blocks[1].url).toBe('video_url');

    expect(fallbackNote.blocks[2].type).toBe('audio');
    expect(fallbackNote.blocks[2].url).toBe('audio_url');

    expect(fallbackNote.blocks[3].type).toBe('pdf');
    expect(fallbackNote.blocks[3].url).toBe('pdf_url');

    expect(fallbackNote.blocks[4].type).toBe('bookmark');
    expect(fallbackNote.blocks[4].url).toBe('https://bookmark_url');
    expect(fallbackNote.blocks[4].content).toBe('Bookmark Title');
  });

  it('normalizes bookmark URLs without protocols when parsing HTML and markdown', () => {
    // HTML Parsing normalization
    const html = '<p><a class="bookmark-link" href="google.com">Google</a></p>';
    const parsedHtmlBlocks = htmlToBlocks(html);
    expect(parsedHtmlBlocks[0].type).toBe('bookmark');
    expect(parsedHtmlBlocks[0].url).toBe('https://google.com');

    // Markdown Parsing normalization
    const md = `---
id: "test-norm"
title: "Norm"
---
[My Site](example.com)
`;
    const parsedMdNote = deserializeMarkdownToNote(md, 'id');
    expect(parsedMdNote.blocks[0].type).toBe('bookmark');
    expect(parsedMdNote.blocks[0].url).toBe('https://example.com');
  });
});
