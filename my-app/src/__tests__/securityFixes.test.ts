import { describe, it, expect } from 'vitest';
import { escapeHtmlKeepingSafeTags } from '../utils/blockRenderer/inlineParsers';
import { blocksToHtml } from '../utils/blockRenderer/blockConverters';
import { renderMediaBlockHtml } from '../utils/blockRenderer/renderBlockGenerators';
import { isPrivateOrBlockedHost } from '../main/linkMetadata';
import type { Block } from '../types';

describe('Security Fixes - Phase 1', () => {
  describe('BUG-01: Safe-Tag Attribute XSS Sanitization', () => {
    it('strips event handlers (on* attributes) from safe tags', () => {
      const malicious = '<b onclick="alert(1)">Bold</b><span onmouseover="steal()">Text</span>';
      const output = escapeHtmlKeepingSafeTags(malicious);
      expect(output).not.toContain('onclick');
      expect(output).not.toContain('onmouseover');
      expect(output).toContain('<b>Bold</b>');
      expect(output).toContain('<span>Text</span>');
    });

    it('strips javascript: and dangerous schemes from href attributes', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a><a href="data:text/html,evil">Data</a>';
      const output = escapeHtmlKeepingSafeTags(malicious);
      expect(output).not.toContain('javascript:');
      expect(output).not.toContain('data:');
      expect(output).toContain('<a>Click</a>');
      expect(output).toContain('<a>Data</a>');
    });

    it('allows valid http, https, and mailto href schemes', () => {
      const safe = '<a href="https://example.com">Site</a><a href="mailto:test@example.com">Email</a>';
      const output = escapeHtmlKeepingSafeTags(safe);
      expect(output).toContain('href="https://example.com"');
      expect(output).toContain('href="mailto:test@example.com"');
    });
  });

  describe('BUG-02: Table Cell Escaping in blocksToHtml', () => {
    it('escapes HTML inside table cell content', () => {
      const tableBlock: Block = {
        id: 'tbl-1',
        type: 'table',
        content: JSON.stringify([['<script>alert(1)</script>', '<b>Bold</b>']]),
        children: []
      };
      const html = blocksToHtml([tableBlock]);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
    });
  });

  describe('BUG-07: Media Attribute Breakout Prevention', () => {
    it('escapes attribute interpolations in renderMediaBlockHtml', () => {
      const imgBlock: Block = {
        id: 'img-1',
        type: 'image',
        url: 'https://example.com/test.png" onerror="alert(1)',
        content: 'Test Image',
        children: []
      };
      const imgHtml = renderMediaBlockHtml(imgBlock, '', '');
      expect(imgHtml).not.toContain('onerror="alert(1)"');
      expect(imgHtml).toContain('&quot; onerror=&quot;alert(1)');

      const bookmarkBlock: Block = {
        id: 'bm-1',
        type: 'bookmark',
        content: '',
        url: 'https://example.com/" onclick="alert(1)',
        bookmarkTitle: 'Title',
        bookmarkImage: 'https://example.com/pic.png\') ; evil(); /*',
        bookmarkIcon: 'https://example.com/ico.png" onload="alert(1)',
        children: []
      };
      const bmHtml = renderMediaBlockHtml(bookmarkBlock, '', '');
      expect(bmHtml).not.toContain('onclick="alert(1)"');
      expect(bmHtml).not.toContain('onload="alert(1)"');

      const fileBlock: Block = {
        id: 'fl-1',
        type: 'file',
        content: '',
        url: 'https://example.com/file" onfocus="alert(1)',
        fileName: 'doc.pdf" download="evil',
        children: []
      };
      const fileHtml = renderMediaBlockHtml(fileBlock, '', '');
      expect(fileHtml).not.toContain('onfocus="alert(1)"');
      expect(fileHtml).toContain('&quot; onfocus=&quot;alert(1)');
    });
  });

  describe('BUG-08: SSRF Hostname Blocking', () => {
    it('blocks localhost and loopback addresses', () => {
      expect(isPrivateOrBlockedHost('localhost')).toBe(true);
      expect(isPrivateOrBlockedHost('sub.localhost')).toBe(true);
      expect(isPrivateOrBlockedHost('127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('127.100.0.5')).toBe(true);
      expect(isPrivateOrBlockedHost('0.0.0.0')).toBe(true);
      expect(isPrivateOrBlockedHost('::1')).toBe(true);
      expect(isPrivateOrBlockedHost('[::1]')).toBe(true);
    });

    it('blocks RFC 1918 private IP ranges and link-local ranges', () => {
      // 10.0.0.0/8
      expect(isPrivateOrBlockedHost('10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('10.255.255.255')).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateOrBlockedHost('172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedHost('172.31.255.255')).toBe(true);
      expect(isPrivateOrBlockedHost('172.32.0.1')).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateOrBlockedHost('192.168.1.1')).toBe(true);
      expect(isPrivateOrBlockedHost('192.168.254.254')).toBe(true);

      // 169.254.0.0/16
      expect(isPrivateOrBlockedHost('169.254.1.1')).toBe(true);

      // IPv6 link-local / ULA
      expect(isPrivateOrBlockedHost('fe80::1')).toBe(true);
      expect(isPrivateOrBlockedHost('fc00::1')).toBe(true);
      expect(isPrivateOrBlockedHost('fd12:3456::1')).toBe(true);
    });

    it('allows public hosts and domains', () => {
      expect(isPrivateOrBlockedHost('example.com')).toBe(false);
      expect(isPrivateOrBlockedHost('google.com')).toBe(false);
      expect(isPrivateOrBlockedHost('93.184.216.34')).toBe(false);
      expect(isPrivateOrBlockedHost('8.8.8.8')).toBe(false);
    });
  });
});
