## Destination

Implement a recursive, nested folder and note hierarchy in the Fluent Notes application. Users can create folders inside notes, folders inside folders, or notes inside folders, to arbitrary depth, with an interactive sidebar tree view, sub-items rendering in the editor, and safe recursive deletion.

## Notes

- Keep logic offline-first and persisted in `localStorage`.
- Preserve the acrylic/mica semi-translucent visual themes and UI styling.
- Verify correctness via unit testing in `my-app/src/__tests__`.

## Decisions so far

- [01-data-model-migration](issues/01-data-model-migration.md) — Defined recursive Parent-Child association type schema and migrated constants/store to support recursive folder/note entities.
- [02-sidebar-tree-view](issues/02-sidebar-tree-view.md) — Implemented recursive sidebar tree item renderer and custom expand/collapse animations and hover handlers.
- [03-folder-note-editor-view](issues/03-folder-note-editor-view.md) — Rendered recursive child list inside note editor with direct button navigators and responsive card grids.

## Not yet specified

- **Breadcrumbs navigation**: How to display path breadcrumbs when viewing deeply nested folders or notes.
- **Search behavior**: How search indexing and search results should handle nested folders vs notes.
- **Move/Transfer Dialog**: An alternative UI dialog to move notes/folders without drag-and-drop.
