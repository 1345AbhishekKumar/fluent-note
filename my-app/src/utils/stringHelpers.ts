// String & ID helper utilities extracted from utils/index.ts

export const genId = () => 'b' + Math.random().toString(36).slice(2, 7);

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function strip(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}
