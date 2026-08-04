# Refactor createApp.ts

This plan outlines the refactoring of [createApp.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/createApp.ts) to break it down into clean, modular files. None of the newly created files will exceed 300 to 400 lines of code.

## Goal
Break down the monolithic 2000-line `createApp.ts` into specialized component files (`flyout.ts`, `p2p.ts`, `sidebar.ts`, `list.ts`, `editor.ts`, `review.ts`) communicating via a typed `AppContext`.

## Target Structure
- **[app/createApp.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/createApp.ts)**: Handles setup, HTML template rendering, selecting DOM elements, and initializing views.
- **[app/context.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/context.ts)**: Defines `AppContext` interface.
- **[app/components/flyout.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/components/flyout.ts)**: Flyout manager, positioning logic, and list item builders.
- **[app/components/p2p.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/components/p2p.ts)**: P2P sharing modal overlays.
- **[app/views/sidebar.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/sidebar.ts)**: Sidebar layouts, resize breaking, hover effects, and events.
- **[app/views/list.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/list.ts)**: List, grid, and graph SVG force layout views.
- **[app/views/editor.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/editor.ts)**: Block editor, caret movements, keyboard actions, slash menu, academic fields, and drag/drop.
- **[app/views/review.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/review.ts)**: Highlights review inbox and synthesis.

## Tasks
- [x] Task 1: Create [app/context.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/context.ts) outlining `AppContext`.
- [x] Task 2: Create [app/components/flyout.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/components/flyout.ts) outlining flyout positioning and builders.
- [x] Task 3: Create [app/components/p2p.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/components/p2p.ts) containing progress Modal.
- [x] Task 4: Create [app/views/sidebar.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/sidebar.ts) containing sidebar rendering and click event routing.
- [x] Task 5: Create [app/views/review.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/review.ts) containing Highlights review and cluster synthesis.
- [x] Task 6: Create [app/views/list.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/list.ts) containing list, grid (with table sorting), and graph (with force SVG layout calculations).
- [x] Task 7: Create [app/views/editor.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/views/editor.ts) containing markdown shortcuts, caret positioning, slash menus, key event handlers, and block drag/drop.
- [x] Task 8: Refactor [app/createApp.ts](file:///D:/MyProjects/Apps-build/Winodows-app/simple-chat/my-app/src/app/createApp.ts) to orchestrate view binding and bootstrap.
- [x] Task 9: Validate implementation by running TypeScript checks (`npx tsc --noEmit`) and unit tests (`npm test`).

## Done When
- All files contain fewer than 400 lines of code.
- Functional equivalence is maintained.
- All tests pass cleanly.
