# Architecture — Fluent Notes

Reference architecture for Fluent Notes, aligned with the project constitution in `AGENTS.md`.
Every diagram and section below reflects only the tools actually chosen for this project —
nothing is included speculatively.

---

## 1. Architecture Diagrams

### 1.1 Process Model

```mermaid
flowchart TB
    subgraph Main["Main Process (Node.js + OS access)"]
        Lifecycle[App Lifecycle / setAppUserModelId]
        WinMgr[Window Manager]
        IPCHandlers[IPC Handlers - main/ipc/*]
        Services[Services - main/services/*]
        DBNode[(Vault .md files + metadata.json + electron-store)]
        Updater[electron-updater]
        Tray[Tray Icon + Menu]
        Shortcuts[globalShortcut]
    end

    subgraph Preload["Preload Script (isolated context)"]
        Bridge[contextBridge - typed window.api]
    end

    subgraph Renderer["Renderer (React 19, zero Node access)"]
        UI[React Components]
        Store[Zustand Store]
        Router[React Router]
    end

    Lifecycle --> WinMgr
    WinMgr --> Preload
    Preload -->|contextBridge.exposeInMainWorld| Renderer
    UI -->|window.api.*| Bridge
    Bridge -->|ipcRenderer.invoke| IPCHandlers
    IPCHandlers -->|Zod validate| Services
    Services --> DBNode
    IPCHandlers -->|ipcMain.handle response| Bridge
    Bridge --> UI
    UI --> Store
    UI --> Router
    Updater -.background check.-> GitHubReleases[(GitHub Releases)]
    Tray -.same IPC/service layer.-> Services
    Shortcuts --> Services

    style Main fill:#f9a825
    style Preload fill:#ffe4b5
    style Renderer fill:#bcd4ff
```

**Why the shading matters:** the main process (orange) is the only one with OS/filesystem power.
The preload script (tan) is a narrow, intentional gap in the isolation — it exists only to hand
the renderer (blue) a small typed API. Nothing should ever widen that gap back into a full Node
bridge. Note that `Shortcuts` fans out to `Services` rather than directly to a window — a global
shortcut trigger lazily creates the Sticky Notes or Progress Tracker `BrowserWindow` through the
same service layer any other entry point uses, it never holds a standing reference to one.

### 1.2 Development Environment

```mermaid
flowchart TB
    Dev[Developer] --> ForgeDev[Electron Forge Dev Server]
    ForgeDev --> MainProc[Main Process - hot restart on change]
    ForgeDev --> PreloadProc[Preload - hot restart on change]
    ForgeDev --> RendererProc[Renderer - HMR]

    MainProc --> DBDev[(Vault .md files + metadata.json - local dev folder)]
    MainProc -.disabled in dev.-> UpdaterDev[electron-updater - no-op locally]
    MainProc --> LogDev[electron-log - console + file]
    MainProc --> SentryDev[Sentry - dev env, low sample rate]

    style DBDev fill:#bcd4ff
```

### 1.3 Production / Packaged Environment

```mermaid
flowchart TB
    User[Windows User] --> Installer[Electron Forge / NSIS Installer - per-machine]
    Installer --> AppDir[Installed App - Program Files]
    AppDir --> Launch[App Launch]

    subgraph Runtime["Running App"]
        Launch --> AUMID[setAppUserModelId]
        AUMID --> MainRT[Main Process]
        MainRT --> WinRT[BrowserWindow - native title bar]
        WinRT --> PreloadRT[Preload]
        PreloadRT --> RendererRT[Renderer - React 19]
        MainRT --> DBProd[(Vault .md files + metadata.json + config.json)]
    end

    subgraph Updates["Auto-Update"]
        MainRT --> Updater[electron-updater]
        Updater -.check on launch + interval.-> UpdateSrc[(GitHub Releases)]
        UpdateSrc -.signed artifact.-> Updater
        Updater -.prompt user.-> RendererRT
    end

    subgraph TrayLayer["Tray"]
        MainRT --> TrayProd[Tray Icon + Menu]
    end

    subgraph TaskbarLayer["Taskbar"]
        MainRT --> TaskbarAPI[Jump lists - recent/frequent actions]
    end

    MainRT --> Toast[Windows Toast Notification]

    subgraph Observability["Monitoring"]
        MainRT --> Sentry[Sentry - Errors, all processes]
        RendererRT --> Sentry
        MainRT --> ElogFile[electron-log - rotating file]
    end

    style Installer fill:#f9a825
    style DBProd fill:#bcd4ff
    style Updater fill:#c8e6c9
```

---

## 2. Lifecycle Diagrams

### 2.1 Core IPC Request Lifecycle

Always included — this is the base call path for any renderer action that needs main-process
data, regardless of which optional services are in the stack.

```mermaid
sequenceDiagram
    participant UI as React Component
    participant Bridge as preload (window.api)
    participant Main as ipcMain handler
    participant Zod as Zod schema
    participant Svc as main/services
    participant DB as Vault (.md files / metadata.json)

    UI->>Bridge: window.api.<action>(payload)
    Bridge->>Main: ipcRenderer.invoke('domain:action', payload)
    Main->>Zod: parse(payload)
    alt Invalid payload
        Zod-->>Main: validation error
        Main-->>Bridge: { ok: false, error }
        Bridge-->>UI: rejected promise / error shape
    else Valid payload
        Zod-->>Main: typed data
        Main->>Svc: call service method
        Svc->>DB: read/write raw .md / metadata
        DB-->>Svc: result
        Svc-->>Main: result
        Main-->>Bridge: { ok: true, data }
        Bridge-->>UI: resolved promise
        UI->>UI: update Zustand store / re-render
    end
```

### 2.2 App Startup & Window Creation Lifecycle

```mermaid
sequenceDiagram
    participant OS as Windows
    participant Main as Main Process
    participant Win as BrowserWindow
    participant Preload as Preload Script
    participant Renderer as Renderer

    OS->>Main: Launch app.exe
    Main->>Main: app.setAppUserModelId(APP_ID)
    Main->>Main: app.whenReady()
    Main->>Win: new BrowserWindow({ webPreferences: { contextIsolation: true, sandbox: true, preload } })
    Win->>Preload: load preload script
    Preload->>Preload: contextBridge.exposeInMainWorld('api', {...})
    Win->>Renderer: load renderer (index.html)
    Renderer->>Renderer: React mounts, reads window.api
```

### 2.3 Auto-Update Lifecycle

```mermaid
sequenceDiagram
    participant Main as Main Process
    participant Updater as electron-updater
    participant Src as GitHub Releases
    participant User as User

    Main->>Updater: checkForUpdates() - on launch + periodic interval
    Updater->>Src: request latest manifest
    Src-->>Updater: version info + signed artifact
    alt Newer version available
        Updater->>Src: download update (background)
        Src-->>Updater: signed update package
        Updater->>Updater: verify signature
        Updater-->>Main: update-downloaded event
        Main-->>User: "Restart to update" prompt (never silent/forced mid-task)
        User->>Main: confirms restart
        Main->>Main: quitAndInstall()
    else Up to date
        Updater-->>Main: no-op
    end
```
**Key principle:** the download happens in the background; the install/restart never happens
without a user-visible prompt, and the artifact is verified against the same signing key as the
installer — an update channel is only as trustworthy as that key.

### 2.4 Windows Installer Lifecycle

```mermaid
sequenceDiagram
    participant User as User
    participant Installer as Electron Forge Installer
    participant OS as Windows (Registry / Start Menu / UAC)
    participant App as Fluent Notes

    User->>Installer: run installer .exe
    Installer->>OS: request elevation (UAC prompt)
    OS-->>Installer: elevated
    Installer->>OS: write files to Program Files, register uninstaller
    Installer->>OS: create Start Menu shortcut (AppUserModelID-tagged)
    Note over OS,App: Future updates arrive via electron-updater, not by re-running this installer
    User->>App: launches from shortcut
    App->>OS: setAppUserModelId (must match installer appId)
```

---

## 3. Integration Mapping

Only pairs of tools that are both present in this stack are documented below.

**Main process ↔ Preload ↔ Renderer** — the only sanctioned path for any data or command to cross
a process boundary. Every crossing is a named `domain:action` IPC channel, validated with Zod on
the main-process side, typed end-to-end via the preload's `index.d.ts`.

**AppUserModelID ↔ Installer `appId`** — must be identical, or Windows fails to correctly
group the app's windows in the taskbar and attributes toast notifications to "Electron" instead
of Fluent Notes.

**electron-updater ↔ Electron Forge ↔ Code Signing** — the update artifact electron-updater
downloads must be signed with the same certificate as the installer, or Windows (and
electron-updater's own signature check) rejects it.

**Vault `.md` files / metadata.json ↔ main/services ↔ IPC handlers ↔ Zustand** — raw `.md` files in
the user's local Vault folder are the live storage format and sole source of truth for notes.
Metadata (tags, structure) lives in `.fluent-notes/metadata.json`. The renderer's Zustand store
holds a client-side cache of UI state and loaded notes, never the source of truth.

**Tray ↔ main/services** — tray menu actions call the exact same service functions as their
in-window equivalents, so behavior never diverges between the two entry points.

**Notification API ↔ Main process only** — constructed and shown from `main/`; the renderer
requests one over IPC, it never constructs a `Notification` itself.

**Taskbar API ↔ main/services** — `setThumbarButtons`/`setProgressBar`/`setOverlayIcon` calls are
triggered by service-layer state changes, not called ad hoc from IPC handlers, so the taskbar
always reflects real app state.

**Protocol handler ↔ `second-instance` event** — on Windows, a deep link into an already-running
app arrives via the `second-instance` event, not `open-url` — the app must listen for both to
cover cold-start and already-running cases.

**globalShortcut ↔ main/services ↔ lazy BrowserWindow creation** — both the Sticky Notes and
Progress Tracker shortcuts resolve through the service layer, which creates their respective
`BrowserWindow` on first trigger rather than holding one open at all times.

**Links & Backlinks ↔ Graph view** — `[[page]]` references are parsed on save from raw `.md` files
into an index / link list (`from_page`, `to_page`); the Backlinks pane queries it for one page, and
Graph view queries the link graph to build the `d3-force` node/edge set.

---

## 4. Folder Structure

```
.
├── src/
│   ├── main/                       # Node.js + OS access — nothing here ships to the renderer
│   │   ├── index.ts                # app lifecycle, setAppUserModelId, window creation
│   │   ├── ipc/
│   │   │   ├── pages.ts            # ipcMain.handle('domain:action', ...), Zod-validated
│   │   │   ├── links.ts            # backlinks + graph-view queries against link index
│   │   │   ├── canvas.ts
│   │   │   ├── sticky-notes.ts
│   │   │   ├── progress-tracker.ts
│   │   │   └── settings.ts
│   │   ├── services/                # business logic, called from ipc/ handlers only
│   │   │   ├── pages.service.ts     # raw .md file read/write in Vault folder
│   │   │   ├── links.service.ts     # parses [[links]] from .md files on save
│   │   │   ├── canvas.service.ts
│   │   │   ├── sticky-notes.service.ts
│   │   │   └── progress-tracker.service.ts
│   │   ├── tray.ts
│   │   ├── updater.ts
│   │   ├── global-shortcuts.ts
│   │   └── windows/
│   │       ├── createMainWindow.ts
│   │       ├── createStickyNoteWindow.ts
│   │       └── createProgressTrackerWindow.ts
│   │
│   ├── preload/
│   │   ├── index.ts                 # contextBridge surface — no business logic
│   │   └── index.d.ts               # window.api type declaration, shared with renderer
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           │   ├── PageEditor/         # Markdown editor
│           │   ├── PageTreeSidebar/    # nested-page hierarchy matching hard drive folders
│           │   ├── GraphView/          # d3-force link graph
│           │   ├── CanvasBoard/
│           │   ├── StickyNotePanel/
│           │   ├── ProgressTrackerPanel/
│           │   └── BacklinksPane/
│           ├── store/                # Zustand — UI state + client-side data cache
│           │   ├── pagesStore.ts
│           │   ├── canvasStore.ts
│           │   └── settingsStore.ts
│           ├── hooks/
│           ├── lib/
│           │   └── assets.ts         # centralized image/icon imports
│           ├── routes/
│           └── types/
│
├── resources/                        # installer icon, tray icon — never bundled into renderer JS
│   ├── tray-icon.png
│   └── icon.ico
│
├── build/                             # packaging config — installer targets, signing, publish
│
├── config/                            # env-driven config, read only from src/main
├── tsconfig.main.json
├── tsconfig.preload.json
├── tsconfig.renderer.json
└── tsconfig.json                      # project references, ties the three together
```

**Why each folder exists:**
- `src/main/` is a hard boundary: nothing here is ever bundled into the renderer. `ipc/` stays
  thin (validate + delegate); `services/` holds the actual business logic (reading/writing raw `.md` files), kept separate so it's
  testable without spinning up `ipcMain` at all. `windows/` isolates the three window-creation
  factories — main, sticky note, progress tracker — since all three are lazily invoked from
  different entry points (app launch vs. global shortcut).
- `src/preload/` is deliberately tiny — a glance at `index.ts` should show the entire renderer-
  facing API surface of the app in one file.
- `src/renderer/src/store/` is intentionally small and separate — it's a UI state cache the IPC
  layer populates, not a second source of truth.
- `resources/` sits outside `src/` on purpose: these are native-facing assets consumed at build
  time, never by the renderer bundler.
- Three separate `tsconfig.*.json` files (tied together by the root `tsconfig.json`'s project
  references) exist because main, preload, and renderer genuinely have different available
  globals (`process`, `window`) and different `lib`/`types` needs.