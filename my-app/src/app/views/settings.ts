import type { AppContext } from '../context';

interface SettingRow {
  title: string;
  desc?: string;
  linkText?: string;
  onClickLink?: () => void;
  type: 'button' | 'toggle' | 'select' | 'slider' | 'swatches' | 'buttons';
  valueKey?: string; // key in localStorage or state
  options?: string[]; // for select
  defaultValue?: string | boolean | number;
  buttonLabel?: string;
  buttonLabels?: string[]; // for multiple buttons
  onAction?: (ctx: AppContext, val?: any) => void;
  onButtonAction?: (ctx: AppContext, buttonIndex: number) => void;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
}

interface SettingSection {
  title: string;
  rows: SettingRow[];
}

interface TabDefinition {
  id: string;
  name: string;
  icon: string;
  category: 'options' | 'core-plugins';
  sections: SettingSection[];
}

const TABS: TabDefinition[] = [
  {
    id: 'general',
    name: 'General',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Updates',
        rows: [
          {
            title: 'Version 1.0.0',
            desc: 'Installer version: 1.0.0',
            linkText: 'Read the changelog.',
            onClickLink: () => {
              if (window.electronAPI) {
                window.electronAPI.openExternalUrl('https://github.com/1345AbhishekKumar/fluent-note/releases');
              }
            },
            type: 'button',
            buttonLabel: 'Check for updates',
            onAction: (ctx) => {
              ctx.toast('Your app is up to date!');
            }
          },
          {
            title: 'Automatic updates',
            desc: 'Turn this off to prevent the app from checking for updates.',
            type: 'toggle',
            valueKey: 'pref_auto_updates',
            defaultValue: true
          },
          {
            title: 'Receive early access versions',
            desc: 'Auto-update to the latest early access version. These versions include new features but may be less stable.',
            type: 'toggle',
            valueKey: 'pref_early_access',
            defaultValue: false
          }
        ]
      },
      {
        title: 'Language',
        rows: [
          {
            title: 'Language',
            desc: 'Change the display language.',
            linkText: 'Learn how to add a new language to Fluent Notes.',
            onClickLink: () => {
              if (window.electronAPI) {
                window.electronAPI.openExternalUrl('https://github.com/1345AbhishekKumar/fluent-note');
              }
            },
            type: 'select',
            valueKey: 'pref_language',
            defaultValue: 'English (GB)',
            options: ['English (GB)', 'English (US)', 'Español', 'Français', 'Deutsch', '日本語', '简体中文']
          }
        ]
      },
      {
        title: 'Help',
        rows: [
          {
            title: 'Help',
            desc: 'Learn how to use Fluent Notes and get help from the community.',
            type: 'button',
            buttonLabel: 'Open',
            onAction: () => {
              if (window.electronAPI) {
                window.electronAPI.openExternalUrl('https://github.com/1345AbhishekKumar/fluent-note#readme');
              }
            }
          }
        ]
      },
      {
        title: 'Account',
        rows: [
          {
            title: 'Your account',
            desc: 'You are not logged in right now. An account is only needed for Sync, Publish, and Catalyst insider builds.',
            type: 'buttons',
            buttonLabels: ['Log in', 'Sign up'],
            onButtonAction: (ctx, index) => {
              if (index === 0) {
                ctx.toast('Sync Login is coming soon!');
              } else {
                ctx.toast('Registration is coming soon!');
              }
            }
          },
          {
            title: 'Commercial licence',
            desc: 'A commercial license is required to use Fluent Notes for work.',
            type: 'buttons',
            buttonLabels: ['Activate', 'Purchase'],
            onButtonAction: (ctx, index) => {
              if (index === 0) {
                ctx.toast('Licence activation requires local credentials.');
              } else {
                if (window.electronAPI) {
                  window.electronAPI.openExternalUrl('https://github.com/1345AbhishekKumar/fluent-note');
                }
              }
            }
          }
        ]
      }
    ]
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Theme',
        rows: [
          {
            title: 'Base theme',
            desc: 'Toggle between dark and light modes.',
            type: 'toggle',
            valueKey: 'pref_theme_dark',
            defaultValue: true,
            onAction: (ctx, val) => {
              const theme = val ? 'dark' : 'light';
              ctx.api.setTheme(theme);
            }
          },
          {
            title: 'Accent color',
            desc: 'Select your preferred accent theme color.',
            type: 'swatches',
            valueKey: 'pref_accent_color',
            defaultValue: '#0067c0'
          }
        ]
      },
      {
        title: 'Typography',
        rows: [
          {
            title: 'Text size',
            desc: 'Adjust the base font size for the editor view.',
            type: 'select',
            valueKey: 'pref_editor_font_size',
            defaultValue: '14.5px',
            options: ['12px', '13.5px', '14.5px', '16px', '18px'],
            onAction: (ctx, val) => {
              ctx.elements.edBody.style.fontSize = val;
            }
          }
        ]
      }
    ]
  },
  {
    id: 'interface',
    name: 'Interface',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Layout & View',
        rows: [
          {
            title: 'Default view mode',
            desc: 'Set the initial layout style for note listing.',
            type: 'select',
            valueKey: 'pref_default_view',
            defaultValue: 'list',
            options: ['list', 'grid', 'graph'],
            onAction: (ctx, val) => {
              ctx.st.view = val as 'list' | 'grid' | 'graph';
              ctx.renderSidebar();
              ctx.renderList();
            }
          },
          {
            title: 'App zoom factor',
            desc: 'Adjust the application scale zoom multiplier.',
            type: 'slider',
            valueKey: 'pref_zoom_factor',
            defaultValue: 1.0,
            sliderMin: 0.6,
            sliderMax: 1.8,
            sliderStep: 0.1,
            onAction: (ctx, val) => {
              ctx.st.zoomFactor = val;
              ctx.root.style.zoom = String(val);
            }
          }
        ]
      }
    ]
  },
  {
    id: 'editor',
    name: 'Editor',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Behaviors',
        rows: [
          {
            title: 'Spell check',
            desc: 'Enable spell check inside note inputs.',
            type: 'toggle',
            valueKey: 'pref_spellcheck',
            defaultValue: false,
            onAction: (ctx, val) => {
              ctx.elements.edBody.spellcheck = val;
              ctx.elements.edTitle.spellcheck = val;
            }
          },
          {
            title: 'Auto-save interval',
            desc: 'Automatically save notes locally as you type.',
            type: 'toggle',
            valueKey: 'pref_autosave',
            defaultValue: true
          }
        ]
      }
    ]
  },
  {
    id: 'files',
    name: 'Files and links',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Vault Folder Location',
        rows: [
          {
            title: 'Vault path',
            desc: 'The current folder where your markdown notes and configs are stored.',
            type: 'button',
            buttonLabel: 'Change Folder',
            onAction: (ctx) => {
              if (window.electronAPI && window.electronAPI.selectVaultFolder) {
                window.electronAPI.selectVaultFolder().then(newPath => {
                  if (newPath) {
                    import('../../store').then(({ clearVaultCache, sharedNotes, sharedFolders, sharedNotebooks, saveAndSync }) => {
                      clearVaultCache();
                      const newVaultData = window.electronAPI!.loadVaultSync();
                      
                      sharedNotes.length = 0;
                      if (newVaultData && newVaultData.notes) {
                        newVaultData.notes.forEach((n: any) => {
                          if (!n.blocks || n.blocks.length === 0) {
                            const { htmlToBlocks } = require('../../utils');
                            n.blocks = htmlToBlocks(n.body || '');
                          }
                          sharedNotes.push(n);
                        });
                      }
                      
                      sharedFolders.length = 0;
                      if (newVaultData && newVaultData.folders) {
                        newVaultData.folders.forEach((f: any) => sharedFolders.push(f));
                      }
        
                      sharedNotebooks.length = 0;
                      if (newVaultData && newVaultData.notebooks) {
                        newVaultData.notebooks.forEach((nb: any) => sharedNotebooks.push(nb));
                      }
                      
                      ctx.st.sel = sharedNotes.length ? sharedNotes[0].id : null;
                      ctx.st.folder = null;
                      ctx.st.nb = 'all';
                      ctx.st.tag = null;
                      ctx.st.quick = 'all';
                      ctx.st.expandedFolders = new Set(['design']);
                      
                      saveAndSync();
                      ctx.toast(`Vault directory changed to: ${newPath}`);
                      
                      // Refresh vault path display in settings
                      const descEl = document.querySelector('[data-setting-desc="vault-path"]');
                      if (descEl) descEl.textContent = newPath;
                    });
                  }
                });
              } else {
                ctx.toast('Local vault storage requires the desktop app');
              }
            }
          }
        ]
      }
    ]
  },
  {
    id: 'hotkeys',
    name: 'Hotkeys',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6.01" y2="8"></line><line x1="10" y1="8" x2="10.01" y2="8"></line><line x1="14" y1="8" x2="14.01" y2="8"></line><line x1="18" y1="8" x2="18.01" y2="8"></line><line x1="6" y1="12" x2="6.01" y2="12"></line><line x1="18" y1="12" x2="18.01" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>`,
    category: 'options',
    sections: [
      {
        title: 'System Keybindings',
        rows: [
          { title: 'Create new note', desc: 'Ctrl + N', type: 'button', buttonLabel: 'Rebind', onAction: (ctx) => ctx.toast('Rebinding is disabled') },
          { title: 'Save note manually', desc: 'Ctrl + S', type: 'button', buttonLabel: 'Rebind', onAction: (ctx) => ctx.toast('Rebinding is disabled') },
          { title: 'Search notes searchbox', desc: 'Ctrl + K', type: 'button', buttonLabel: 'Rebind', onAction: (ctx) => ctx.toast('Rebinding is disabled') },
          { title: 'App zoom in / zoom out', desc: 'Ctrl + = / Ctrl + -', type: 'button', buttonLabel: 'Rebind', onAction: (ctx) => ctx.toast('Rebinding is disabled') }
        ]
      },
      {
        title: 'Markdown formatting hotkeys',
        rows: [
          { title: 'Make text bold', desc: 'Ctrl + B', type: 'button', buttonLabel: 'Rebind', onAction: (ctx) => ctx.toast('Rebinding is disabled') },
          { title: 'Make text italic', desc: 'Ctrl + I', type: 'button', buttonLabel: 'Rebind', onAction: (ctx) => ctx.toast('Rebinding is disabled') },
          { title: 'Underline selected text', desc: 'Ctrl + U', type: 'button', buttonLabel: 'Rebind', onAction: (ctx) => ctx.toast('Rebinding is disabled') }
        ]
      }
    ]
  },
  {
    id: 'keychain',
    name: 'Keychain',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6M15.5 7.5l3 3M18.5 4.5l3 3"></path></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Security Storage',
        rows: [
          {
            title: 'Save decryption key in OS vault',
            desc: 'Use system keychain services (Credential Manager / Keychain) to store vault encryption credentials.',
            type: 'toggle',
            valueKey: 'pref_use_keychain',
            defaultValue: true
          },
          {
            title: 'Decryption lock timeout',
            desc: 'Duration of inactivity before local cache requires key authentication.',
            type: 'select',
            valueKey: 'pref_lock_timer',
            defaultValue: 'Never',
            options: ['5 minutes', '15 minutes', '1 hour', 'Never']
          }
        ]
      }
    ]
  },
  {
    id: 'core-plugins',
    name: 'Core plugins',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Core plugins',
        rows: [
          {
            title: 'Enable core plugin framework',
            desc: 'Toggle the system native extensions. Turning this off disables backlinks, canvas, note composer, etc.',
            type: 'toggle',
            valueKey: 'pref_core_plugins_enabled',
            defaultValue: true
          }
        ]
      }
    ]
  },
  {
    id: 'community-plugins',
    name: 'Community plugins',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    category: 'options',
    sections: [
      {
        title: 'Community plugins',
        rows: [
          {
            title: 'Enable community plugins',
            desc: 'Community plugins are created by third-party developers. They can access files on your machine. Enable them at your own risk.',
            type: 'button',
            buttonLabel: 'Enable',
            onAction: (ctx) => {
              ctx.toast('Community plugins are disabled in sandbox environments');
            }
          }
        ]
      }
    ]
  }
];

const CORE_PLUGINS = [
  { id: 'backlinks', name: 'Backlinks', desc: 'Displays linked references to this note.' },
  { id: 'canvas', name: 'Canvas', desc: 'Visual diagram note layouts.' },
  { id: 'command-palette', name: 'Command palette', desc: 'Open shortcut modal panel with search.' },
  { id: 'daily-notes', name: 'Daily notes', desc: 'Create daily journaling note layout.' },
  { id: 'file-recovery', name: 'File recovery', desc: 'Recover notes from historical caches.' },
  { id: 'note-composer', name: 'Note composer', desc: 'Perform structured block mutations on active notes.' },
  { id: 'page-preview', name: 'Page preview', desc: 'Show link hover card window preview.' },
  { id: 'quick-switcher', name: 'Quick switcher', desc: 'Fast select input searching note titles.' },
  { id: 'sync', name: 'Sync', desc: 'Realtime vault synchronization to secure storage.' },
  { id: 'templates', name: 'Templates', desc: 'Insert pre-defined boilerplate snippets.' }
];

let activeTabId = 'general';

function getSettingValue(key: string, def: string | boolean | number): string | boolean | number {
  const stored = localStorage.getItem(key);
  if (stored === null) return def;
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  const num = Number(stored);
  if (!isNaN(num) && stored.trim() !== '') return num;
  return stored;
}

function setSettingValue(key: string, val: string | boolean | number): void {
  localStorage.setItem(key, String(val));
}

function applyAccentColor(hexColor: string): void {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--accent', hexColor);
  rootStyle.setProperty('--accent-fill', hexColor);
  rootStyle.setProperty('--accent-fill-h', `color-mix(in srgb, ${hexColor} 85%, white)`);
  rootStyle.setProperty('--accent-brd', `color-mix(in srgb, ${hexColor} 45%, transparent)`);
  rootStyle.setProperty('--accent-soft', `color-mix(in srgb, ${hexColor} 10%, transparent)`);
  rootStyle.setProperty('--focus', hexColor);
}

export function openSettings(ctx: AppContext): void {
  const overlay = document.getElementById('settingsOverlay') as HTMLElement;
  if (!overlay) return;

  overlay.style.display = 'flex';
  activeTabId = 'general';

  setSettingValue('pref_theme_dark', ctx.api.theme === 'dark');

  const storedAccent = getSettingValue('pref_accent_color', '#0067c0') as string;
  if (storedAccent !== '#0067c0') {
    applyAccentColor(storedAccent);
  }

  // Update vault path title in header if we have electron API
  const sidebarTitleEl = overlay.querySelector('.settings-sidebar-header span.settings-title-text') as HTMLElement;
  if (sidebarTitleEl && window.electronAPI) {
    const vaultPath = window.electronAPI.getVaultPathSync();
    if (vaultPath) {
      const parts = vaultPath.replace(/\\/g, '/').split('/');
      const vaultName = parts[parts.length - 1] || vaultPath;
      sidebarTitleEl.innerHTML = `Settings <span class="vault-badge">(${vaultName})</span>`;
    }
  }

  // Render core plugins list in sidebar
  renderSidebarPlugins(ctx);

  // Set active class on General tab
  const sidebar = overlay.querySelector('.settings-sidebar') as HTMLElement;
  if (sidebar) {
    sidebar.querySelectorAll('.settings-tab-btn, .settings-plugin-btn').forEach(el => {
      el.classList.remove('active');
    });
    const generalBtn = sidebar.querySelector('[data-tab="general"]') as HTMLElement;
    if (generalBtn) generalBtn.classList.add('active');
  }

  // Clear search input
  const searchInput = document.getElementById('settingsSearch') as HTMLInputElement;
  if (searchInput) searchInput.value = '';

  renderContent(ctx);
  initEvents(ctx);
}

function renderSidebarPlugins(ctx: AppContext): void {
  const container = document.getElementById('settingsCorePluginsList') as HTMLElement;
  if (!container) return;

  container.innerHTML = CORE_PLUGINS.map(p => {
    const isEnabled = getSettingValue(`pref_plugin_${p.id}`, true) as boolean;
    return `
      <button class="settings-plugin-btn rv" data-tab="plugin_${p.id}">
        <span class="plugin-name-wrap">
          <span class="plugin-name">${p.name}</span>
        </span>
        <span class="plugin-badge" style="${isEnabled ? '' : 'background:transparent; color:var(--text3);'}">${isEnabled ? 'On' : 'Off'}</span>
      </button>
    `;
  }).join('');
}

function renderContent(ctx: AppContext): void {
  const contentContainer = document.getElementById('settingsTabContent') as HTMLElement;
  if (!contentContainer) return;

  const searchQuery = (document.getElementById('settingsSearch') as HTMLInputElement)?.value.trim().toLowerCase() || '';

  if (searchQuery) {
    renderSearchResults(ctx, searchQuery, contentContainer);
    return;
  }

  if (activeTabId.startsWith('plugin_')) {
    const pId = activeTabId.replace('plugin_', '');
    const plugin = CORE_PLUGINS.find(p => p.id === pId);
    if (plugin) {
      renderPluginView(ctx, plugin, contentContainer);
    }
    return;
  }

  const tab = TABS.find(t => t.id === activeTabId);
  if (!tab) return;

  let html = `
    <div class="settings-header">
      <h2>${tab.name}</h2>
    </div>
  `;

  tab.sections.forEach(sec => {
    html += `
      <div class="setting-section">
        <h3 class="setting-section-title">${sec.title}</h3>
        <div class="setting-card">
    `;

    sec.rows.forEach(row => {
      html += renderSettingRowHTML(row, ctx);
    });

    html += `
        </div>
      </div>
    `;
  });

  contentContainer.innerHTML = html;
  bindRowEvents(tab.sections.flatMap(s => s.rows), ctx);
}

function renderPluginView(ctx: AppContext, plugin: { id: string; name: string; desc: string }, container: HTMLElement): void {
  const toggleRow: SettingRow = {
    title: `Enable ${plugin.name}`,
    desc: plugin.desc,
    type: 'toggle',
    valueKey: `pref_plugin_${plugin.id}`,
    defaultValue: true,
    onAction: (innerCtx, val) => {
      innerCtx.toast(`${plugin.name} toggled ${val ? 'ON' : 'OFF'}`);
      renderSidebarPlugins(innerCtx);
      
      if (plugin.id === 'backlinks') {
        const blPanel = document.querySelector('.backlinks-panel') as HTMLElement;
        if (blPanel) blPanel.style.display = val ? 'block' : 'none';
      }
    }
  };

  container.innerHTML = `
    <div class="settings-header">
      <h2>${plugin.name}</h2>
      <p>Core Extension Plugin Options</p>
    </div>
    <div class="setting-section">
      <h3 class="setting-section-title">Plugin Options</h3>
      <div class="setting-card">
        ${renderSettingRowHTML(toggleRow, ctx)}
      </div>
    </div>
  `;

  bindRowEvents([toggleRow], ctx);
}

function renderSearchResults(ctx: AppContext, query: string, container: HTMLElement): void {
  const matchedRows: { row: SettingRow; tabName: string }[] = [];

  TABS.forEach(tab => {
    tab.sections.forEach(sec => {
      sec.rows.forEach(row => {
        if (row.title.toLowerCase().includes(query) || (row.desc && row.desc.toLowerCase().includes(query))) {
          matchedRows.push({ row, tabName: tab.name });
        }
      });
    });
  });

  CORE_PLUGINS.forEach(p => {
    if (p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query)) {
      const toggleRow: SettingRow = {
        title: `Enable ${p.name}`,
        desc: p.desc,
        type: 'toggle',
        valueKey: `pref_plugin_${p.id}`,
        defaultValue: true,
        onAction: (innerCtx, val) => {
          innerCtx.toast(`${p.name} toggled ${val ? 'ON' : 'OFF'}`);
          renderSidebarPlugins(innerCtx);
        }
      };
      matchedRows.push({ row: toggleRow, tabName: `Core Plugin: ${p.name}` });
    }
  });

  if (matchedRows.length === 0) {
    container.innerHTML = `
      <div class="settings-search-empty">
        <span class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </span>
        <h3>No settings matched your search</h3>
        <p>Try checking your spelling or searching for another keyword.</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="settings-header">
      <h2>Search results</h2>
      <p>Showing ${matchedRows.length} matches for "${query}"</p>
    </div>
    <div class="settings-tab-content">
  `;

  const grouped: { [key: string]: SettingRow[] } = {};
  matchedRows.forEach(match => {
    if (!grouped[match.tabName]) grouped[match.tabName] = [];
    grouped[match.tabName].push(match.row);
  });

  Object.keys(grouped).forEach(tabName => {
    html += `
      <div class="setting-section">
        <h3 class="setting-section-title" style="color:var(--accent);">${tabName}</h3>
        <div class="setting-card">
    `;
    grouped[tabName].forEach(row => {
      html += renderSettingRowHTML(row, ctx);
    });
    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  bindRowEvents(matchedRows.map(m => m.row), ctx);
}

function renderSettingRowHTML(row: SettingRow, ctx: AppContext): string {
  let controlHTML = '';
  
  if (row.type === 'toggle') {
    const isChecked = getSettingValue(row.valueKey!, row.defaultValue as boolean) as boolean;
    controlHTML = `
      <label class="setting-toggle-label">
        <input type="checkbox" class="setting-toggle-input" data-key="${row.valueKey}" ${isChecked ? 'checked' : ''} />
        <div class="setting-toggle-track"></div>
      </label>
    `;
  } else if (row.type === 'button') {
    controlHTML = `
      <button class="setting-btn-action" data-action-index="0">
        ${row.buttonLabel || 'Execute'}
      </button>
    `;
  } else if (row.type === 'buttons') {
    controlHTML = `<div style="display:flex; gap:8px;">`;
    row.buttonLabels?.forEach((label, idx) => {
      controlHTML += `
        <button class="setting-btn-action" data-action-index="${idx}">
          ${label}
        </button>
      `;
    });
    controlHTML += `</div>`;
  } else if (row.type === 'select') {
    const selected = getSettingValue(row.valueKey!, row.defaultValue as string) as string;
    controlHTML = `
      <select class="setting-select-input" data-key="${row.valueKey}">
        ${row.options?.map(opt => `<option value="${opt}" ${opt === selected ? 'selected' : ''}>${opt}</option>`).join('')}
      </select>
    `;
  } else if (row.type === 'slider') {
    const val = getSettingValue(row.valueKey!, row.defaultValue as number) as number;
    controlHTML = `
      <div class="setting-slider-wrap">
        <input type="range" class="setting-slider-input" 
               min="${row.sliderMin || 0}" max="${row.sliderMax || 100}" step="${row.sliderStep || 1}" value="${val}" data-key="${row.valueKey}" />
        <span class="setting-slider-val">${val}</span>
      </div>
    `;
  } else if (row.type === 'swatches') {
    const activeColor = getSettingValue(row.valueKey!, row.defaultValue as string) as string;
    const swatches = [
      { name: 'Windows Blue', value: '#0067c0' },
      { name: 'Royal Lavender', value: '#8470ff' },
      { name: 'Warm Amber', value: '#ff9d42' },
      { name: 'Teal Cyan', value: '#23b8b8' },
      { name: 'Coral Rose', value: '#ff6a8f' }
    ];
    controlHTML = `<div class="setting-swatches-wrap">`;
    swatches.forEach(sw => {
      const isSelected = activeColor === sw.value;
      controlHTML += `
        <button class="setting-swatch" 
                style="background:${sw.value}; border-color:${isSelected ? 'var(--text1)' : 'transparent'}; box-shadow:${isSelected ? '0 0 0 1px var(--mica-solid), 0 0 0 2px var(--accent)' : 'none'}" 
                data-color="${sw.value}" data-key="${row.valueKey}" title="${sw.name}">
          ${isSelected ? `<span>✓</span>` : ''}
        </button>
      `;
    });
    controlHTML += `</div>`;
  }

  let pathText = row.desc || '';
  if (row.title === 'Vault path' && window.electronAPI) {
    pathText = window.electronAPI.getVaultPathSync() || row.desc || '';
  }

  return `
    <div class="setting-row rv">
      <div class="setting-row-info">
        <div class="setting-row-title">${row.title}</div>
        <div class="setting-row-desc" data-setting-desc="${row.title === 'Vault path' ? 'vault-path' : ''}">${pathText}</div>
        ${row.linkText ? `<div class="setting-link">${row.linkText}</div>` : ''}
      </div>
      <div class="setting-row-control">
        ${controlHTML}
      </div>
    </div>
  `;
}

function bindRowEvents(rows: SettingRow[], ctx: AppContext): void {
  const content = document.getElementById('settingsTabContent') as HTMLElement;
  if (!content) return;

  const links = content.querySelectorAll('.setting-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      const parentRow = link.closest('.setting-row');
      if (!parentRow) return;
      const titleEl = parentRow.querySelector('.setting-row-title');
      if (!titleEl) return;
      const matchedRow = rows.find(r => r.title === titleEl.textContent);
      if (matchedRow && matchedRow.onClickLink) {
        matchedRow.onClickLink();
      }
    });
  });

  const toggles = content.querySelectorAll('.setting-toggle-input');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      const input = toggle as HTMLInputElement;
      const key = input.dataset.key;
      if (!key) return;
      const checked = input.checked;
      setSettingValue(key, checked);
      
      const matchedRow = rows.find(r => r.valueKey === key);
      if (matchedRow && matchedRow.onAction) {
        matchedRow.onAction(ctx, checked);
      }
    });
  });

  const actionBtnRows = content.querySelectorAll('.setting-row');
  actionBtnRows.forEach(rowEl => {
    const btns = rowEl.querySelectorAll('.setting-btn-action');
    if (!btns.length) return;
    const titleEl = rowEl.querySelector('.setting-row-title');
    if (!titleEl) return;
    const matchedRow = rows.find(r => r.title === titleEl.textContent);
    if (!matchedRow) return;

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const actionIdx = Number((btn as HTMLElement).dataset.actionIndex);
        if (matchedRow.type === 'buttons' && matchedRow.onButtonAction) {
          matchedRow.onButtonAction(ctx, actionIdx);
        } else if (matchedRow.onAction) {
          matchedRow.onAction(ctx);
        }
      });
    });
  });

  const selects = content.querySelectorAll('.setting-select-input');
  selects.forEach(select => {
    select.addEventListener('change', () => {
      const selInput = select as HTMLSelectElement;
      const key = selInput.dataset.key;
      if (!key) return;
      const val = selInput.value;
      setSettingValue(key, val);

      const matchedRow = rows.find(r => r.valueKey === key);
      if (matchedRow && matchedRow.onAction) {
        matchedRow.onAction(ctx, val);
      }
    });
  });

  const sliders = content.querySelectorAll('.setting-slider-input');
  sliders.forEach(slider => {
    slider.addEventListener('input', () => {
      const sliderInput = slider as HTMLInputElement;
      const key = sliderInput.dataset.key;
      if (!key) return;
      const val = Number(sliderInput.value);
      
      const valEl = sliderInput.nextElementSibling as HTMLElement;
      if (valEl) valEl.textContent = String(val);

      setSettingValue(key, val);

      const matchedRow = rows.find(r => r.valueKey === key);
      if (matchedRow && matchedRow.onAction) {
        matchedRow.onAction(ctx, val);
      }
    });
  });

  const swatchContainers = content.querySelectorAll('.setting-row');
  swatchContainers.forEach(container => {
    const swatches = container.querySelectorAll('.setting-swatch');
    if (!swatches.length) return;
    
    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const sw = swatch as HTMLElement;
        const color = sw.dataset.color;
        const key = sw.dataset.key;
        if (!color || !key) return;

        setSettingValue(key, color);
        applyAccentColor(color);
        
        const titleEl = container.querySelector('.setting-row-title');
        if (titleEl) {
          const matchedRow = rows.find(r => r.title === titleEl.textContent);
          if (matchedRow) {
            renderContent(ctx);
          }
        }
      });
    });
  });
}

function initEvents(ctx: AppContext): void {
  const overlay = document.getElementById('settingsOverlay') as HTMLElement;
  const searchInput = document.getElementById('settingsSearch') as HTMLInputElement;
  const closeBtn = document.getElementById('settingsClose') as HTMLElement;
  
  if (!overlay) return;

  if (searchInput) {
    const searchHandler = () => {
      renderContent(ctx);
    };
    searchInput.removeEventListener('input', searchHandler);
    searchInput.addEventListener('input', searchHandler);
  }

  const sidebar = overlay.querySelector('.settings-sidebar') as HTMLElement;
  if (sidebar) {
    const tabHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.settings-tab-btn, .settings-plugin-btn') as HTMLElement;
      if (!btn) return;

      const tabId = btn.dataset.tab;
      if (!tabId) return;

      activeTabId = tabId;

      sidebar.querySelectorAll('.settings-tab-btn, .settings-plugin-btn').forEach(el => {
        el.classList.remove('active');
      });
      btn.classList.add('active');

      if (searchInput) searchInput.value = '';

      renderContent(ctx);
    };
    sidebar.removeEventListener('click', tabHandler);
    sidebar.addEventListener('click', tabHandler);
  }

  const backdropCloseHandler = (e: MouseEvent) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      overlay.removeEventListener('click', backdropCloseHandler);
    }
  };
  overlay.removeEventListener('click', backdropCloseHandler);
  overlay.addEventListener('click', backdropCloseHandler);

  if (closeBtn) {
    const closeBtnHandler = () => {
      overlay.style.display = 'none';
      closeBtn.removeEventListener('click', closeBtnHandler);
    };
    closeBtn.removeEventListener('click', closeBtnHandler);
    closeBtn.addEventListener('click', closeBtnHandler);
  }
}
