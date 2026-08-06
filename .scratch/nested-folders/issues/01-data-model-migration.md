Type: task
Status: resolved

## Question

How should we structure and store the recursive relationship between folders and notes in the codebase, and migrate the initial default dataset to use this structure?

## Answer

We have updated the data models and constants to support fully recursive folders and notes:
1. Added `Folder` interface in `types/index.ts` with `id`, `name`, `parentId` (referencing either folder, note, or null for root), and `color`.
2. Added `parentId?: string | null` to the `Note` interface in `types/index.ts`.
3. Created default folders (`DEFAULT_FOLDERS`) and nested some default notes (`n2`, `n6`, `n8`) inside folders (`f1`, `f2`, `f3`) to test folder-in-folder, folder-in-note, and note-in-folder nesting.
4. Implemented `loadFolders()` and `saveFolders()` in `store/index.ts` to persist folders in `localStorage` under `fluent_notes_app_folders` (using key `FOLDERS_KEY`).
5. Updated `saveAndSync` and `saveAndSyncContent` to sync and persist folders alongside notes.
6. Verified correctness through a comprehensive unit test suite in `store.test.ts`.
