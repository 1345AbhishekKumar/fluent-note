export function renderTitlebar(theme: string, IC: any, winControlsHtml: string): string {
  return `
  <div class="titlebar">
    <button class="tbtn ic burger" title="Toggle navigation" aria-label="Toggle navigation">${IC.menu}</button>
    <span class="app-ico">${IC.pen}</span><span class="app-name">Fluent Notes</span>
    <div class="tb-search"><div class="sbox"><span class="ic s-ic">${IC.search}</span><input class="search" type="text" placeholder="Search notes" spellcheck="false"><kbd class="s-kbd">Ctrl K</kbd></div></div>
    <span class="tb-spacer"></span>
    <div class="lens-switcher-container" style="position:relative;">
      <button class="tbtn style-btn lens-btn" id="lensSwitcherBtn"><span class="lens-lbl">Notes Lens</span><span class="ic lens-chev">${IC.chevD}</span></button>
      <div class="lens-vault-dropdown" id="lensVaultDropdown" style="display:none;">
        <div class="lvd-section-label">Switch Vault</div>
        <div class="lvd-vault-list" id="lvdVaultList"></div>
        <div class="lvd-divider"></div>
        <button class="lvd-manage-btn" id="lvdManageBtn">
          <span class="ic">${IC.vault}</span>
          <span>Manage Vaults…</span>
        </button>
      </div>
    </div>
    <button class="tbtn ic split-btn" title="Side-by-side themes">${IC.split}</button>
    <button class="tbtn ic theme-btn" title="Toggle theme">${IC.moon}</button>
    ${winControlsHtml}
  </div>`;
}

export function renderSidebar(IC: any): string {
  return `
  <aside class="pane sidebar">
    <div class="sb-scroll">
      <button class="sb-new"><span class="ic">${IC.plus}</span><span class="sb-txt">New note</span></button>
      <div class="sb-label sb-txt">Quick access</div>
      <nav class="sb-nav">
        <button class="nav-item rv" data-q="all"><span class="ni-bar"></span><span class="ic">${IC.home}</span><span class="sb-txt">All notes</span></button>
        <button class="nav-item rv" data-q="pinned"><span class="ni-bar"></span><span class="ic">${IC.pin}</span><span class="sb-txt">Pinned</span></button>
      </nav>
      <div class="sb-label sb-txt">Views</div>
      <nav class="sb-nav views-nav">
        <button class="nav-item rv" data-view="list"><span class="ni-bar"></span><span class="ic">${IC.ul}</span><span class="sb-txt">List</span></button>
        <button class="nav-item rv" data-view="grid"><span class="ni-bar"></span><span class="ic">${IC.grid}</span><span class="sb-txt">Grid</span></button>
        <button class="nav-item rv" data-view="graph"><span class="ni-bar"></span><span class="ic">${IC.graph}</span><span class="sb-txt">Graph</span></button>
      </nav>
      <div class="sb-label sb-txt nb-header">
        <span>Notebooks</span>
        <button class="btn-new-nb" title="New notebook">
          ${IC.plus}
        </button>
      </div>
      <nav class="sb-nav nbs"></nav>
      <div class="sb-label sb-txt">Tags</div>
      <div class="sb-tags"></div>
    </div>
    <div class="sb-foot">
      <button class="nav-item rv sb-import"><span class="ic">${IC.link}</span><span class="sb-txt">Import Share</span></button>
      <button class="nav-item rv sb-set"><span class="ic">${IC.gear}</span><span class="sb-txt">Settings</span></button>
    </div>
  </aside>`;
}

export function renderListpane(IC: any): string {
  return `
  <section class="pane listpane">
    <div class="lp-head">
      <div class="lp-tr">
        <h2 class="lp-title">All notes</h2>
        <div class="lp-actions">
          <button class="ib ic act-filter" title="Filter by tag">${IC.tag}</button>
          <button class="ib ic act-sort" title="Sort & view">${IC.sortIc}</button>
          <button class="ib ic new-note" title="New note">${IC.plus}</button>
        </div>
      </div>
      <div class="lp-sub"></div>
    </div>
    <div class="lp-scroll"></div>
  </section>`;
}

export function renderReviewInbox(): string {
  return `
  <div class="review-inbox-pane hidden w-[280px] flex-col border-r border-pane-brd bg-pane overflow-y-auto p-3 gap-3">
    <h3 class="text-[13.5px] font-semibold text-text1 mb-1.5 flex items-center gap-1.5">Transient Highlights</h3>
    <div class="review-clusters flex flex-col gap-3"></div>
  </div>`;
}

export function renderEditorpane(IC: any): string {
  return `
  <section class="pane editorpane">
    <div class="ed-bar">
      <button class="ib ic ed-back" title="Back to list">${IC.back}</button>
      <div class="ed-tools">
        <button class="ib ic" data-cmd="undo" title="Undo">${IC.undo}</button>
        <button class="ib ic" data-cmd="redo" title="Redo">${IC.redo}</button>
        <span class="tb-spacer"></span>
        <button class="ib ic pin-btn" title="Pin note">${IC.pin}</button>
        <button class="ib ic ed-more" title="More">${IC.dots}</button>
      </div>
    </div>
    <div class="ed-scroll"><div class="ed-inner">
      <h1 class="ed-title" contenteditable="true" spellcheck="false"></h1>
      <div class="ed-meta">
        <button class="pill meta-nb"><span class="dot"></span><span class="nb-name"></span><span class="ic">${IC.chevD}</span></button>
        <span class="meta-date"><span class="ic">${IC.clock}</span><span class="md-txt"></span></span>
        <button class="pill meta-tags"><span class="ic">${IC.tag}</span><span class="mt-txt">Tags</span><span class="ic">${IC.chevD}</span></button>
      </div>
      <div class="academic-metadata">
        <label><span>Authors</span><input type="text" class="ac-authors" placeholder="Add authors…" spellcheck="false"></label>
        <label><span>Journal</span><input type="text" class="ac-journal" placeholder="Add journal…" spellcheck="false"></label>
        <label><span>Year</span><input type="text" class="ac-year" placeholder="Add year…" spellcheck="false"></label>
      </div>
      <div class="ed-body" spellcheck="false" data-ph="Start writing…"></div>

      <div class="backlinks-panel">
        <h4>Backlinks</h4>
        <div class="backlinks-list"></div>
      </div>
      <div class="ed-empty"><span class="ic">${IC.pen}</span>Select a note, or create a new one.</div>
    </div></div>
    <div class="ed-status"><span class="wc">0 words</span><span class="save ok"><span class="ic">${IC.check}</span><span class="save-t">Saved</span></span></div>
  </section>`;
}

export function renderVaultOverlay(IC: any): string {
  return `
  <div class="vault-overlay" id="vaultOverlay" aria-modal="true" role="dialog" aria-label="Vault Manager" style="display:none;">
    <div class="vault-manager">
      <!-- Left: vault list -->
      <div class="vm-left">
        <div class="vm-vault-list" id="vmVaultList"></div>
      </div>
      <!-- Right: branding + actions -->
      <div class="vm-right">
        <div class="vm-brand">
          <div class="vm-logo-wrap">
            <span class="vm-logo-ic">${IC.vault}</span>
          </div>
          <h1 class="vm-brand-name">Fluent Notes</h1>
          <p class="vm-brand-version">Local Markdown Vault</p>
        </div>
        <div class="vm-action-list">
          <div class="vm-action-row">
            <div class="vm-action-info">
              <span class="vm-action-title">Create new vault</span>
              <span class="vm-action-desc">Create a new vault under a folder.</span>
            </div>
            <button class="vm-action-btn vm-btn-primary" id="vaultCreateNew">Create</button>
          </div>
          <div class="vm-action-row">
            <div class="vm-action-info">
              <span class="vm-action-title">Open folder as vault</span>
              <span class="vm-action-desc">Choose an existing folder of Markdown files.</span>
            </div>
            <button class="vm-action-btn vm-btn-secondary" id="vaultOpenFolder">Open</button>
          </div>
        </div>
        <div class="vm-create-form" id="vaultCreateForm" style="display:none;">
          <input type="text" class="vm-name-input" id="vaultNameInput" placeholder="Vault name…" maxlength="80" />
          <button class="vm-action-btn vm-btn-primary" id="vaultCreateConfirm">Choose Folder &amp; Create</button>
        </div>
        <button class="vm-close-btn" id="vaultClose" aria-label="Close vault manager">${IC.close}</button>
      </div>
    </div>
  </div>`;
}

export function renderSettingsOverlay(IC: any): string {
  return `
  <div class="settings-overlay" id="settingsOverlay" aria-modal="true" role="dialog" aria-label="Settings">
    <div class="settings-container">
      <!-- Left sidebar -->
      <div class="settings-sidebar">
        <!-- Header -->
        <div class="settings-sidebar-header">
          <span class="settings-title-text">Settings</span>
        </div>
        <!-- Search bar -->
        <div class="settings-search-wrap">
          <span class="settings-search-icon">${IC.search}</span>
          <input type="text" id="settingsSearch" class="settings-search-input" placeholder="Search settings..." spellcheck="false" />
        </div>
        <!-- Menu list -->
        <div class="settings-menu">
          <!-- Options group -->
          <div class="settings-menu-group-label">Options</div>
          <button class="settings-tab-btn rv active" data-tab="general">
            <span class="tab-btn-icon">${IC.gear}</span><span>General</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="appearance">
            <span class="tab-btn-icon">${IC.sun}</span><span>Appearance</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="interface">
            <span class="tab-btn-icon">${IC.grid}</span><span>Interface</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="editor">
            <span class="tab-btn-icon">${IC.pen}</span><span>Editor</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="files">
            <span class="tab-btn-icon">${IC.folder}</span><span>Files and links</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="hotkeys">
            <span class="tab-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6.01" y2="8"></line><line x1="10" y1="8" x2="10.01" y2="8"></line><line x1="14" y1="8" x2="14.01" y2="8"></line><line x1="18" y1="8" x2="18.01" y2="8"></line><line x1="6" y1="12" x2="6.01" y2="12"></line><line x1="18" y1="12" x2="18.01" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg></span><span>Hotkeys</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="keychain">
            <span class="tab-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6M15.5 7.5l3 3M18.5 4.5l3 3"></path></svg></span><span>Keychain</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="core-plugins">
            <span class="tab-btn-icon">${IC.plus}</span><span>Core plugins</span>
          </button>
          <button class="settings-tab-btn rv" data-tab="community-plugins">
            <span class="tab-btn-icon">${IC.share}</span><span>Community plugins</span>
          </button>

          <!-- Core plugins section -->
          <div class="settings-menu-group-label">Core plugins</div>
          <div class="settings-core-plugins-list" id="settingsCorePluginsList">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>
      <!-- Right settings panel content -->
      <div class="settings-content">
        <div id="settingsTabContent" class="settings-tab-content"></div>
      </div>
      <!-- Close button -->
      <button id="settingsClose" class="settings-close-btn rv" aria-label="Close settings">${IC.close}</button>
    </div>
  </div>`;
}

export function renderToast(): string {
  return `<div class="toast"><span class="t-msg"></span><button class="t-act"></button></div>`;
}

export function renderAppLayout(theme: string, IC: any, TAGS: any, winControlsHtml: string): string {
  return `
  ${renderTitlebar(theme, IC, winControlsHtml)}
  <div class="app-body">
    ${renderSidebar(IC)}
    <div class="resize-handle" data-target="sidebar"></div>
    ${renderListpane(IC)}
    <div class="resize-handle" data-target="listpane"></div>
    ${renderReviewInbox()}
    ${renderEditorpane(IC)}
    <div class="scrim"></div>
  </div>
  <div class="flyout"></div>
  ${renderVaultOverlay(IC)}
  ${renderSettingsOverlay(IC)}
  ${renderToast()}`;
}
