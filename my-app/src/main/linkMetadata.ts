import { ipcMain } from 'electron';
import { z } from 'zod';

export function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '::'
  ) {
    return true;
  }

  // Check IPv4 ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some(o => o < 0 || o > 255)) return true;
    const [a, b] = octets;
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 10) return true;  // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16
    if (a === 0) return true;   // 0.0.0.0/8
  }

  // Check IPv6 private/link-local/unique local ranges (fe80::/10, fc00::/7)
  if (
    /^fe[89ab]/i.test(host) ||
    /^f[cd]/i.test(host)
  ) {
    return true;
  }

  return false;
}

export function parseMetadata(html: string, urlStr: string) {
  const result = {
    title: '',
    description: '',
    image: '',
    icon: '',
  };
  
  // Try to find title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Helper for meta tags
  const getMeta = (nameOrProperty: string) => {
    const regex = new RegExp(`<meta[^>]*(?:name|property)=["']${nameOrProperty}["'][^>]*content=["']([^"']+)["']`, 'i');
    const match = html.match(regex);
    if (match) return match[1].trim();
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${nameOrProperty}["']`, 'i');
    const match2 = html.match(regex2);
    if (match2) return match2[1].trim();
    return '';
  };

  result.title = getMeta('og:title') || getMeta('twitter:title') || result.title;
  result.description = getMeta('description') || getMeta('og:description') || getMeta('twitter:description');
  result.image = getMeta('og:image') || getMeta('twitter:image');

  // Try to find favicon icon
  const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
                    html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
  if (iconMatch) {
    result.icon = iconMatch[1].trim();
  }

  // Resolve relative URLs
  try {
    const parsedUrl = new URL(urlStr);
    if (result.image && !result.image.startsWith('http')) {
      result.image = new URL(result.image, parsedUrl.origin).href;
    }
    if (result.icon && !result.icon.startsWith('http')) {
      result.icon = new URL(result.icon, parsedUrl.origin).href;
    } else if (!result.icon) {
      result.icon = `${parsedUrl.origin}/favicon.ico`;
    }
  } catch (e) {
    // Ignore URL errors
  }

  return result;
}

export function initLinkMetadata() {
  ipcMain.handle('fetch-link-metadata', async (event, rawUrl: unknown) => {
    try {
      const validatedUrl = z.string().parse(rawUrl).trim();
      let urlStr = validatedUrl;
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(urlStr)) {
          return { title: '', description: '', image: '', icon: '' };
        }
        urlStr = 'https://' + urlStr;
      }

      const parsedUrl = new URL(urlStr);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return { title: '', description: '', image: '', icon: '' };
      }

      if (isPrivateOrBlockedHost(parsedUrl.hostname)) {
        return { title: '', description: '', image: '', icon: '' };
      }

      const response = await fetch(urlStr, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error('Fetch failed');
      const html = await response.text();
      return parseMetadata(html, urlStr);
    } catch (e) {
      console.error('Metadata fetch error:', e);
      return { title: '', description: '', image: '', icon: '' };
    }
  });
}
