# Refactor Renderer

This plan outlines the refactoring of [renderer.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/renderer.ts) into clean, modular files categorized by feature/responsibility, without changing any user-facing functionality or breaking existing tests.

## Goal
Deconstruct the 2600+ line monolithic `renderer.ts` file into structured, feature-based modules within `my-app/src`.

## Tasks

- [ ] Task 1: Create [types/index.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/types/index.ts) → Move shared interfaces (`BlockType`, `Block`, `Note`, `Notebook`, `Tag`, `TransientClip`, `FlyoutItem`, `AppInstance`) here.
- [ ] Task 2: Create [constants/index.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/constants/index.ts) → Move icons `IC`, default data `NBS`/`TAGS`/`DEFAULT_NOTES`/`DEFAULT_CLIPS`, storage keys, and `winControlsHtml` here.
- [ ] Task 3: Create [utils/index.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/utils/index.ts) → Move parser/helper utilities (`genId`, `htmlToBlocks`, `blocksToHtml`, `renderLinksInContent`, `renderBlockTree`, `findBlockById`, `getBlockLevel`, `flattenBlocks`, `isCaretAtStart`, `moveCaret`, `extractLinks`, `resolveNoteId`, `getReferencedNoteIds`, `calculateSubGraphClosure`, `strip`, `esc`) here.
- [ ] Task 4: Create [store/index.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/store/index.ts) → Manage state `sharedNotes`, local storage loading/saving, and app instances list `APPS`, plus sync methods (`saveAndSync`, `saveAndSyncContent`).
- [ ] Task 5: Create [app/createApp.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/createApp.ts) → House the core `createApp` execution block, event listeners, and sub-views.
- [ ] Task 6: Simplify [renderer.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/renderer.ts) → Make it a clean bootstrap entry point. Re-export all necessary symbols to ensure full backward compatibility with tests.
- [ ] Task 7: Verify all tests → Run `npm test` and verify that all 13 unit tests pass successfully.

## Done When
- All functions are split into files by responsibility.
- `renderer.ts` acts as a clean entry point re-exporting the APIs.
- The dev build compiles without errors.
- `npm test` runs and passes successfully.
