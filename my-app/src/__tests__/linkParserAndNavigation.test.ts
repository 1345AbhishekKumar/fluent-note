import { describe, it, expect } from 'vitest';
import { parseLinkString, formatWikilink, formatMarkdownLink, extractBlockIdTag, generateBlockIdentifier } from '../utils/linkParser';
import { extractLinks, resolveNoteId, renameNoteWikilinks } from '../utils/noteGraph';
import { renderLinksInContent } from '../utils/blockRenderer/inlineParsers';
import type { Note } from '../types';

describe('Link Parser Utility', () => {
  it('parses standard Wikilinks', () => {
    const parsed = parseLinkString('[[My Note]]');
    expect(parsed).not.toBeNull();
    expect(parsed?.targetPath).toBe('My Note');
    expect(parsed?.displayText).toBe('My Note');
    expect(parsed?.heading).toBeUndefined();
    expect(parsed?.blockId).toBeUndefined();
    expect(parsed?.isEmbed).toBe(false);
  });

  it('parses Wikilinks with display alias', () => {
    const parsed = parseLinkString('[[My Note|Custom Display Text]]');
    expect(parsed).not.toBeNull();
    expect(parsed?.targetPath).toBe('My Note');
    expect(parsed?.displayText).toBe('Custom Display Text');
  });

  it('parses Wikilinks with heading anchors', () => {
    const parsed = parseLinkString('[[My Note#Architecture]]');
    expect(parsed).not.toBeNull();
    expect(parsed?.targetPath).toBe('My Note');
    expect(parsed?.heading).toBe('Architecture');
    expect(parsed?.displayText).toBe('My Note > Architecture');
  });

  it('parses Wikilinks with same-page heading anchors', () => {
    const parsed = parseLinkString('[[#Preview a linked file]]');
    expect(parsed).not.toBeNull();
    expect(parsed?.targetPath).toBe('');
    expect(parsed?.heading).toBe('Preview a linked file');
    expect(parsed?.displayText).toBe('Preview a linked file');
  });

  it('parses Wikilinks with block references', () => {
    const parsed = parseLinkString('[[Meeting Notes#^b15695]]');
    expect(parsed).not.toBeNull();
    expect(parsed?.targetPath).toBe('Meeting Notes');
    expect(parsed?.blockId).toBe('b15695');
    expect(parsed?.displayText).toBe('Meeting Notes > b15695');
  });

  it('parses transclusion embeds', () => {
    const parsed = parseLinkString('![[Diagram.png]]');
    expect(parsed).not.toBeNull();
    expect(parsed?.isEmbed).toBe(true);
    expect(parsed?.targetPath).toBe('Diagram.png');
  });

  it('parses standard Markdown links with URL encoding and anchors', () => {
    const parsed = parseLinkString('[Overview Guide](Projects/My%20Project.md#Setup)');
    expect(parsed).not.toBeNull();
    expect(parsed?.isMarkdownLink).toBe(true);
    expect(parsed?.targetPath).toBe('Projects/My Project');
    expect(parsed?.heading).toBe('Setup');
    expect(parsed?.displayText).toBe('Overview Guide');
  });

  it('formats Wikilinks and Markdown links correctly', () => {
    expect(formatWikilink('My Note', 'Setup', undefined, 'Guide')).toBe('[[My Note#Setup|Guide]]');
    expect(formatWikilink('My Note', undefined, 'a1b2c3')).toBe('[[My Note#^a1b2c3]]');
    expect(formatWikilink('My Note', undefined, undefined, undefined, true)).toBe('![[My Note]]');
    expect(formatMarkdownLink('Guide', 'Projects/My Note', 'Setup')).toBe('[Guide](Projects/My%20Note.md#Setup)');
  });

  it('extracts trailing block identifiers', () => {
    const res1 = extractBlockIdTag('Important takeaway point ^37066d');
    expect(res1.text).toBe('Important takeaway point');
    expect(res1.blockId).toBe('37066d');

    const res2 = extractBlockIdTag('Normal line without tag');
    expect(res2.text).toBe('Normal line without tag');
    expect(res2.blockId).toBeNull();
  });
});

describe('Note Graph & Vault Link Refactoring', () => {
  it('extracts target notes from wikilinks with anchors and aliases', () => {
    const text = 'Check out [[Architecture#Design|System Architecture]] and [[Roadmap 2026]] and [Docs](API.md#Endpoints)';
    const { wiki } = extractLinks(text);
    expect(wiki).toContain('Architecture');
    expect(wiki).toContain('Roadmap 2026');
    expect(wiki).toContain('API');
  });

  it('renames note links vault-wide preserving anchors and aliases', () => {
    const testNotes: Note[] = [
      {
        id: 'n1',
        title: 'Source Note',
        body: 'Link to [[Old Architecture]] and [[Old Architecture#Key Decisions]] and [[Old Architecture|Custom Title]] and ![[Old Architecture]]',
        blocks: [
          {
            id: 'b1',
            type: 'paragraph',
            content: 'See [Arch Doc](Old%20Architecture.md#Overview) and [[Old Architecture#^abc123]]',
            children: []
          }
        ],
        nb: 'default',
        tags: [],
        pinned: false,
        date: 'Today',
        ord: 0
      }
    ];

    const updated = renameNoteWikilinks(testNotes, 'Old Architecture', 'New Architecture');
    expect(updated).toBeGreaterThanOrEqual(6);

    expect(testNotes[0].body).toContain('[[New Architecture]]');
    expect(testNotes[0].body).toContain('[[New Architecture#Key Decisions]]');
    expect(testNotes[0].body).toContain('[[New Architecture|Custom Title]]');
    expect(testNotes[0].body).toContain('![[New Architecture]]');
    expect(testNotes[0].blocks[0].content).toContain('[[New Architecture#^abc123]]');
    expect(testNotes[0].blocks[0].content).toContain('New%20Architecture.md#Overview');
  });
});

describe('Render Links & Ghost Link Badging', () => {
  it('renders resolved and ghost links with proper data attributes and styles', () => {
    const existingNotes: Note[] = [
      {
        id: 'n100',
        title: 'Existing Page',
        body: '',
        blocks: [],
        nb: 'default',
        tags: [],
        pinned: false,
        date: 'Today',
        ord: 0
      }
    ];

    const html1 = renderLinksInContent('See [[Existing Page#H1|My Alias]]', existingNotes);
    expect(html1).toContain('data-target="Existing Page"');
    expect(html1).toContain('data-heading="H1"');
    expect(html1).toContain('data-alias="My Alias"');
    expect(html1).not.toContain('data-ghost="true"');

    const html2 = renderLinksInContent('See [[Nonexistent Page]]', existingNotes);
    expect(html2).toContain('data-target="Nonexistent Page"');
    expect(html2).toContain('data-ghost="true"');
  });
});
