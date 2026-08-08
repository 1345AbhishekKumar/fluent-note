import type { AppContext } from '../../../context';
import { findBlockById } from '../../../../utils';
import { rerenderNote } from './editorPopupUtils';

export function closeLanguagePicker(ctx: AppContext) {
  const picker = ctx.root.querySelector('.language-picker-popup');
  if (picker) picker.remove();
}

export function openLanguagePicker(ctx: AppContext, btn: HTMLElement, blockId: string) {
  closeLanguagePicker(ctx);

  const popup = document.createElement('div');
  popup.className = 'language-picker-popup';
  popup.innerHTML = `
    <div class="lang-search-wrapper">
      <input type="text" class="lang-search-input" placeholder="Search for a language..." />
    </div>
    <div class="lang-list-container"></div>
  `;

  const btnRect = btn.getBoundingClientRect();
  const innerRect = ctx.elements.edInner.getBoundingClientRect();
  popup.style.left = Math.max(8, btnRect.right - innerRect.left - 200) + 'px';
  popup.style.top = (btnRect.bottom - innerRect.top + 4) + 'px';

  ctx.elements.edInner.appendChild(popup);

  const searchInput = popup.querySelector('.lang-search-input') as HTMLInputElement;
  const listContainer = popup.querySelector('.lang-list-container') as HTMLElement;

  const langOptions = [
    { val: 'plaintext', label: 'Plain Text' },
    { val: 'javascript', label: 'JavaScript' },
    { val: 'typescript', label: 'TypeScript' },
    { val: 'html', label: 'HTML' },
    { val: 'css', label: 'CSS' },
    { val: 'json', label: 'JSON' },
    { val: 'python', label: 'Python' },
    { val: 'sql', label: 'SQL' },
    { val: 'cpp', label: 'C++' },
    { val: 'java', label: 'Java' },
    { val: 'rust', label: 'Rust' },
    { val: 'javascript', label: 'React (JSX)' },
    { val: 'typescript', label: 'React (TSX)' },
    { val: 'html', label: 'Vue' },
    { val: 'html', label: 'Angular' },
    { val: 'html', label: 'Svelte' },
    { val: 'typescript', label: 'Next.js' },
    { val: 'typescript', label: 'Nuxt.js' },
    { val: 'python', label: 'Django' },
    { val: 'python', label: 'Flask' },
    { val: 'javascript', label: 'Express' },
    { val: 'java', label: 'Spring' },
    { val: 'php', label: 'Laravel' },
    { val: 'ruby', label: 'Ruby on Rails' },
    { val: 'c', label: 'C' },
    { val: 'csharp', label: 'C#' },
    { val: 'dart', label: 'Dart' },
    { val: 'docker', label: 'Docker' },
    { val: 'elixir', label: 'Elixir' },
    { val: 'erlang', label: 'Erlang' },
    { val: 'go', label: 'Go' },
    { val: 'graphql', label: 'GraphQL' },
    { val: 'groovy', label: 'Groovy' },
    { val: 'haskell', label: 'Haskell' },
    { val: 'kotlin', label: 'Kotlin' },
    { val: 'latex', label: 'LaTeX' },
    { val: 'lisp', label: 'Lisp' },
    { val: 'lua', label: 'Lua' },
    { val: 'markdown', label: 'Markdown' },
    { val: 'matlab', label: 'Matlab' },
    { val: 'nix', label: 'Nix' },
    { val: 'objectivec', label: 'Objective-C' },
    { val: 'ocaml', label: 'OCaml' },
    { val: 'php', label: 'PHP' },
    { val: 'powershell', label: 'PowerShell' },
    { val: 'ruby', label: 'Ruby' },
    { val: 'scala', label: 'Scala' },
    { val: 'swift', label: 'Swift' },
    { val: 'verilog', label: 'Verilog' },
    { val: 'vhdl', label: 'VHDL' },
    { val: 'xml', label: 'XML' },
    { val: 'yaml', label: 'YAML' }
  ];

  let selectedIndex = 0;
  let filteredOptions = [...langOptions];

  function renderList() {
    listContainer.innerHTML = filteredOptions.map((opt, i) => `
      <button class="lang-picker-item ${i === selectedIndex ? 'active' : ''}" data-val="${opt.val}" data-index="${i}">
        ${opt.label}
      </button>
    `).join('');

    listContainer.querySelectorAll('.lang-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const val = (item as HTMLElement).dataset.val!;
        selectLanguage(val);
      });
    });
  }

  function selectLanguage(val: string) {
    const n = ctx.st.notes.find(x => x.id === ctx.st.sel);
    if (!n) return;
    const match = findBlockById(n.blocks, blockId);
    if (match) {
      match.block.language = val;
      rerenderNote(ctx, n);
    }
    closeLanguagePicker(ctx);
  }

  function scrollToActiveItem() {
    const activeEl = listContainer.querySelector('.lang-picker-item.active') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    filteredOptions = langOptions.filter(o => 
      o.label.toLowerCase().includes(query) || o.val.toLowerCase().includes(query)
    );
    selectedIndex = 0;
    renderList();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredOptions.length;
      renderList();
      scrollToActiveItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredOptions.length) % filteredOptions.length;
      renderList();
      scrollToActiveItem();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[selectedIndex]) {
        selectLanguage(filteredOptions[selectedIndex].val);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeLanguagePicker(ctx);
    }
  });

  setTimeout(() => searchInput.focus(), 50);
  renderList();
}
