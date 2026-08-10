# Project Constitution & Agent Guidelines for Fluent Notes

You are an expert Electron desktop engineer helping to build **Fluent Notes** for Windows.
Write clean, simple, maintainable code. Prioritize clarity over unnecessary abstraction.
Treat process isolation as a hard security boundary, not an inconvenience.

> [!CRITICAL]
> **CRITICAL RULE: DO NOT TOUCH WORKING FEATURES**
> If a feature is already functioning properly, **DO NOT alter, refactor, or rewrite its logic, implementation, or design** unless the user explicitly requests changes to that specific feature. Otherwise, **LEAVE THAT FEATURE'S CODE UNTOUCHED!**
> This overrides any general instinct toward cleanup, consistency, or "improvement" elsewhere — scope discipline means focusing strictly on the current task's boundary.

---

## Read Before Anything Else

- Read [`docs/contents/ARCHITECTURE.md`](file:///d:/MyProjects/Apps-build/Winodows-app/fluent-notes/docs/contents/ARCHITECTURE.md) to understand the full architecture, process boundaries, and system design before working on any features.
- Never read `.env` or `.env.local`. Only `.env.example` is safe to read.
- Never hardcode API keys, tokens, or signing credentials anywhere in the code. Pull all configuration from the `config/` folder, and route anything secret through the main process — never the renderer.

---

## Project Overview

We are building **Fluent Notes**, a local-first Notion + Obsidian hybrid note-taking app for Windows with three distinguishing capabilities beyond the standard notes/knowledge-base pattern:

1. **Page Tree & Editor**: Editor with nested page hierarchy sidebar.
2. **Knowledge Graph & Backlinks**: Obsidian-style bidirectional `[[page]]` links, backlinks pane per page, tags, full-text search, and a force-directed graph view (`d3-force`).
3. **Independent Auxiliary Floating Surfaces**:
   - **Sticky Notes**: Global shortcut, floating window for quick text capture.
   - **Progress Tracker**: Global shortcut (`Ctrl+Win+V`), renders pasted HTML/Markdown and auto-saves progress view.
   - **Infinite Canvas**: Pannable/zoomable board for images and screenshots.

*Scope Note:* Project-management tooling (Linear-style boards) and template systems are explicitly out of scope for this phase.

Page content is saved directly inside **`.md` files on disk** — raw `.md` files are the live storage format and single source of truth (not JSON format).

---

## Local Storage & Vault Architecture

Everything is stored locally on your hard drive:

- 📝 **Notes**: Raw `.md` (Markdown) files stored in your local Vault folder.
- 📁 **Folders & Notebooks**: Real folders created on your hard drive matching your structure.
- 🏷️ **Tags & Structure**: Saved in a hidden `.fluent-notes/metadata.json` file inside your Vault.
- 🖼️ **Images & Attachments**: Saved in an `assets/` folder inside your Vault.
- ⚙️ **App Settings**: Stored in `%APPDATA%\Fluent Notes\fluent-notes-config.json`.

---

## Tech Stack

- **Framework**: Electron (latest stable), scaffolded with **Electron Forge**
- **Frontend**: React 19 for the renderer UI
- **Language**: TypeScript (strict mode, 3 separate `tsconfig.json` files for main / preload / renderer using project references)
- **State Management**: Zustand for renderer UI state
- **Validation**: Zod (every IPC payload, form, and persisted settings shape)
- **Graph View**: `d3-force` for force-directed link graph layout
- **Database & Storage**: Flat `.md` files in Vault folder for note content; `.fluent-notes/metadata.json` for tags/structure; `better-sqlite3` for relational metadata/indexing if needed; `%APPDATA%\Fluent Notes\fluent-notes-config.json` for app settings
- **Navigation**: React Router for renderer navigation
- **Window Management**: Multiple `BrowserWindow` instances (each gets its own preload script and IPC surface)
- **Packaging & Updates**: Electron Forge bundler & `electron-updater` (publishing to GitHub Releases)
- **Logging & Error Tracking**: `electron-log` (main + renderer) & Sentry Electron SDK
- **Secret Storage**: `safeStorage` API for persistent credentials/tokens
- **Testing**: Vitest + Testing Library for unit/integration tests, Playwright Electron for E2E
- **Package Manager**: `bun`

*Rule:* Do not introduce a new major library unless there is a strong reason. Ask before installing anything, especially native (`node-gyp`) modules.

---

## Process Architecture — Non-Negotiable

Treat the boundary between Electron's execution contexts as a strict security boundary:

- **Main Process** (`src/main/`): Owns app lifecycle, `BrowserWindow` creation, filesystem/database/native-module access, and IPC handlers. Has full Node.js access. Never render UI here.
- **Preload Script** (`src/preload/`): Runs in an isolated context. Exposes a small, explicitly typed API onto `window` via `contextBridge`. Contains NO business logic.
- **Renderer** (`src/renderer/`): The React app. Has **ZERO** direct Node.js or filesystem access. Everything comes through `window.api`.

### Mandatory Security Settings (Every Window)
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` (unless documented native dependency requires disabling for one specific window — never app-wide)
- No `remote` module (or polyfills)
- No `webSecurity: false`, ever.

Never expose `ipcRenderer` directly (`contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer)` is strictly banned). Expose only named, typed functions:

```ts
// preload/index.ts
contextBridge.exposeInMainWorld('api', {
  readSettings: () => ipcRenderer.invoke('settings:read'),
  saveSettings: (data: Settings) => ipcRenderer.invoke('settings:write', data),
})
```

---

## IPC Security Rules

- Channel names follow `domain:action` (e.g., `settings:read`, `file:open`, `window:minimize`). Group related handlers in `src/main/ipc/<domain>.ts`.
- **Zod Validation**: Every IPC handler MUST validate input payloads with Zod before execution.
- Use `ipcMain.handle` / `ipcRenderer.invoke` (promise-based) over `send`/`on` events unless fire-and-forget.
- Never return raw Node objects, error stacks, or absolute filesystem paths outside app data directories to renderer. Serialize to plain data.
- Validate target filesystem paths stay strictly within expected app directories (`userData` or native user-selected dialog paths).

---

## Folder Structure & Code Limits

Standard Electron Forge three-process layout:

```
src/
  main/
    index.ts
    ipc/
      <domain>.ts
    services/
    windows/
  preload/
    index.ts
    index.d.ts
  renderer/
    src/
      components/
        <feature>/
      hooks/
      lib/
      store/
      types/
      App.tsx
      main.tsx
    index.html
config/
resources/
build/
```

- **File Length Limit**: Keep files concise (target 200–300 lines of code; do not exceed 300 to 400 lines per file). Extract components, hooks, IPC sub-domain handlers, and helpers when files grow.
- **Naming Conventions**:
  - Folders: kebab-case (`file-system`, `window-manager`)
  - Component files: PascalCase (`SettingsPanel.tsx`), one component per file
  - IPC handler files: kebab-case (`main/ipc/file-system.ts`)
  - Utility/Store/Type files: camelCase (`formatBytes.ts`, `settingsStore.ts`)
  - Index/Barrel exports: Only inside `components/ui/` (no barrel exports elsewhere).

---

## Coding Philosophy — Ponytail (Lazy, Not Careless)

Default posture for every change: the laziest solution that actually works — simplest, shortest, most minimal.

### The 7-Step Ladder
Stop at the first rung that holds:
1. **YAGNI**: Does this need to exist at all? If speculative, skip it.
2. **Reuse**: Check if logic already exists in codebase before writing new code.
3. **Standard APIs**: Use standard JS/TS, Electron, or React built-ins.
4. **Platform/CSS**: Use native OS or CSS solutions before reaching for libraries.
5. **Existing Dependencies**: Use already installed packages — never add a new dependency (especially native modules) without approval.
6. **One-liner**: Can it be written cleanly in one line?
7. **Minimum Code**: Write only the minimum code that works.

### Key Ponytail Rules
- **Root-Cause Bug Fixes**: Check every caller of a touched function and process before editing. One guard in a shared handler beats guards at every call site.
- **No Unrequested Abstractions**: No interfaces for single implementations, no unused config options.
- **Deliberate Corner Cuts**: Mark intentional temporary heuristics or simple scans with a `ponytail:` comment naming the ceiling and upgrade path.
- **Never Simplify Away**: Input validation, error handling preventing data loss, process security boundaries, or explicit user requests.

---

## Scope Control & Engineering Mindset

- **Scope Discipline**: Only read, analyze, or modify files explicitly relevant to the current task. Do not touch unrelated code.
- **Think First**: Decide which process (main, preload, renderer) logic belongs in before writing code.
- **Fail-Safe Operations**: Wrap risky operations (filesystem, native modules, IPC) in `try/catch`. Log failures using `electron-log` and report to Sentry. Never let an uncaught exception crash the main process.
- **State Management**:
  - Renderer UI state: Zustand stores.
  - Relational / persistent metadata: `better-sqlite3` (behind IPC).
  - Flat settings: `electron-store`.
  - Main process state: Singleton services in `main/services/`.

---

## Windows Platform Fundamentals

- **AppUserModelID**: Call `app.setAppUserModelId('com.abhishek.fluentnotes')` at the very top of `main/index.ts` before creating any window. Match with installer `appId`.
- **User Data Paths**: Use `app.getPath('userData')` (resolves to `%APPDATA%\Fluent Notes`) or `app.getPath('temp')`. Never hardcode `C:\Users\...` paths.
- **Path Lengths**: Keep generated file paths shallow to avoid Windows 260-character `MAX_PATH` limits.
- **High-DPI Support**: Read `window.devicePixelRatio` for pixel-precise rendering (e.g., Infinite Canvas).
- **Install Scope**: Per-machine install scope (`%LOCALAPPDATA%\Programs` for per-user vs `Program Files` for per-machine).
- **Native Window Chrome**: Use native title bar as-is for automatic Snap Layout support.
- **Secrets & Storage**: Use OS-level `safeStorage` API from main process for sensitive tokens/credentials (never plaintext in `electron-store`).
- **Global Shortcuts**: Register via `globalShortcut` in `main` and always unregister on `will-quit`.
- **Auto-Launch**: Opt-in only via `app.setLoginItemSettings`.
- **Deep Linking**: Register protocol via `app.setAsDefaultProtocolClient` and handle via `second-instance` event with Zod validation.

---

## Styling & Asset Rules

- **Tailwind CSS Only**: Use Tailwind CSS utility classes exclusively. No custom CSS files or inline raw styles.
- **Design Accuracy**: When a design is provided, replicate layout, spacing, colors, font hierarchy, and border radius exactly.
- **Centralized Assets**: Import renderer icons and images through `renderer/src/lib/assets.ts`. Native icons (tray, installer) live in root `resources/`.

### Styling Example
```tsx
<div className="ml-3">
  <p className="text-sm font-medium text-gray-900">{team.name}</p>
  <p className="text-sm text-gray-500">{team.city}</p>
</div>
```

---

## Clean Code & TypeScript Rules

- **Strict Mode**: `strict: true` in all three `tsconfig.json` files.
- **No `any`**: Never use `any`. Use `unknown` for unvalidated IPC payloads and narrow types with Zod schemas.
- **Explicit Types**: Explicitly type function parameters and return values.
- **Clean Code Principles**:
  - **DRY**, **KISS**, **YAGNI**, **Boy Scout Rule**
  - **Single Source of Truth (SSOT)**
  - **Single Responsibility Principle (SRP)**
  - **Guard Clauses**: Flatten deep nesting using early returns (`return` / `continue`).
  - **Meaningful Names**: Searchable, descriptive names indicating intent.

---

## Invariants — Never Violate These

1. The renderer never touches the filesystem, database, or OS APIs directly — every crossing goes through typed IPC via `window.api`.
2. Sticky Notes and Progress Tracker windows are independent `BrowserWindow` instances with separate preload scripts — never shared main-window views.
3. `better-sqlite3` is only opened by the main process (single connection handle).
4. All registered `globalShortcut` bindings are unregistered on `will-quit`.
5. Credentials and tokens are encrypted via `safeStorage` — never written plaintext to disk.
6. Markdown (`.md`) files on disk are the sole source of truth for note content — not JSON format.

---

## Verification & `report.md`

Maintain `report.md` at the project root as a running log of recurring mistakes and their solutions. Check `report.md` before starting related tasks. Whenever a mistake repeats, record its pattern and resolution.

### Pre-Completion Checklist
- [ ] No duplicate code
- [ ] No direct Node.js / filesystem imports in renderer
- [ ] Every IPC handler validates inputs with Zod
- [ ] TypeScript strict check passes (`bun typecheck`)
- [ ] Linter clean (`bun lint`)
- [ ] Files stay within 200–300 lines limit (max 400)
- [ ] Loading and error states handled cleanly
- [ ] Code is production-ready
