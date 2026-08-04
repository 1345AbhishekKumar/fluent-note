# Specification: Extended Fluent Notes (Research OS Edition)

## Problem Statement

Academic researchers and knowledge workers suffer from fragmented tools and workflows. They must constantly context-switch between rigid relational tables (like Notion) and freeform personal knowledge graphs (like Obsidian). Furthermore, they face four fundamental architectural gaps in existing software:
1. **Graph vs. Grid Divide:** The friction of choosing between structured grids and freeform relationship graphs.
2. **Transient vs. Permanent Data Conflict:** The struggle to transition unstructured research clips (highlights, web captures) into synthesized permanent notes.
3. **Collaboration Anomaly:** The inability to share project-bounded sub-sections of a personal knowledge vault without exposing the whole vault.
4. **Context Switching Tax:** The cognitive overhead of using a single static layout for capturing, organizing, synthesizing, and publishing.

## Solution

An extended, offline-first, private desktop application built on Electron, Vite, and TypeScript. "Fluent Notes (Research OS Edition)" introduces:
1. **A nested, block-based editor** (supporting slash commands, markdown shortcuts, block nesting, and drag-and-drop).
2. **Dynamic view switching** (rendering note collections as a list of cards, a sortable grid table, or a 2D interactive reference graph).
3. **Adaptive Workflow Lenses** (Notes Lens, Academic Lens with backlinks & bibliography metadata, and Review Lens with a transient highlights inbox and a crystallization engine).
4. **P2P Sub-graph Sharing** (visual project closure calculator and simulated vault package exporter).

All data is stored locally in `localStorage`, preserving privacy and offline availability.

## User Stories

### Core Block Editor
1. As a user, I want to create a new note page so that I can document separate research topics.
2. As a user, I want to type text in a block inside the editor so that I can record my thoughts.
3. As a user, I want to press `Enter` in a block to create a new paragraph block immediately below it, so that I can write continuously.
4. As a user, I want to press `Backspace` at the start of an empty block to delete it and move focus to the preceding block, so that I can clean up empty blocks easily.
5. As a user, I want to use `ArrowUp` and `ArrowDown` keys to move focus between adjacent blocks, so that I can navigate my notes without using the mouse.
6. As a user, I want to press `Tab` at the beginning of a block to indent/nest it under the block above it, so that I can structure nested ideas.
7. As a user, I want to press `Shift+Tab` on a nested block to outdent it, so that I can adjust hierarchy.
8. As a user, I want block nesting to be restricted to 3 levels deep, so that the document structure remains clean.
9. As a user, I want to see a 6-dot drag handle on the left of a block when I hover over it, so that I have a clear interaction target for reordering.
10. As a user, I want to drag and drop blocks vertically using their drag handles, so that I can easily reorder content.
11. As a user, I want to see a drop indicator while dragging a block, so that I can preview where the block will land.
12. As a user, I want to type `/` in a block to open a floating block format menu, so that I can change the block type.
13. As a user, I want to navigate the slash menu using arrow keys and select options with `Enter` or mouse click, so that I can format blocks quickly.
14. As a user, I want to select "Heading 1" from the slash menu to convert the block to a large heading.
15. As a user, I want to select "Heading 2" from the slash menu to convert the block to a medium heading.
16. As a user, I want to select "To-do" from the slash menu to convert the block to a checklist item.
17. As a user, I want to toggle the checkbox on a To-do block so that I can mark tasks as completed.
18. As a user, I want to type `# ` at the start of a block to automatically convert it into a Heading 1.
19. As a user, I want to type `## ` at the start of a block to automatically convert it into a Heading 2.
20. As a user, I want to type `- [ ] ` at the start of a block to automatically convert it into a To-do block.

### Graph vs. Grid Views
21. As a user, I want to see a View Switcher in the list pane toolbar, so that I can switch between Card List, Grid, and Graph views.
22. As a user, I want the Grid View to display notes in a tabular format with columns for Title, Notebook, Tags, and Date, so that I can view structured metadata.
23. As a user, I want to click column headers in the Grid View to sort the table rows accordingly.
24. As a user, I want to type WikiLinks like `[[Note Title]]` or `@Note Title` inside blocks to create hyperlinked connections between notes.
25. As a user, I want to click on a WikiLink to instantly navigate to and open the referenced note page.
26. As a user, I want the Graph View to render an interactive 2D visualization of all notes as nodes and WikiLink connections as edges, so that I can see my personal knowledge web.
27. As a user, I want to drag nodes around in the Graph View to inspect connections visually.
28. As a user, I want to click a node in the Graph View to open that note in the editor.

### Workflow Lenses
29. As a user, I want to see a Lens Switcher in the top Titlebar, so that I can morph the application layout to fit my current activity.
30. As a user, I want to select the "Academic Lens" to display literature properties (Authors, Journal, Year) at the top of my note editor, so that I can document bibliography attributes.
31. As a user, I want the Academic Lens to display a "Backlinks" panel at the bottom of the editor, listing all notes that link to the active note.
32. As a user, I want to click a backlink in the backlinks panel to jump to the referring note.
33. As a user, I want to select the "Review Lens" to show a split view with a "Transient Highlights Inbox" on the left and the permanent editor on the right.
34. As a user, I want the Review Lens to group transient highlights into visual clusters (like "Interface Physics" or "Material Design"), representing on-device semantic AI groups.
35. As a user, I want to click "Synthesize" on a transient cluster card to generate a new permanent note pre-filled with the highlights as nested blocks.
36. As a user, I want to drag individual highlights from the Transient Inbox directly into the active editor to insert them as blocks.
37. As a user, I want to mark transient clips as archived once synthesized so they clear from my inbox.

### P2P Sharing & Persistence
38. As a user, I want to click a "Share Sub-graph" button on a notebook or tag category, so that I can collaborate on a specific project.
39. As a user, I want to see a visual boundary dialog outlining the project "closure" (notes to be shared in green, and private external links that will be truncated in dotted lines), ensuring I do not accidentally share private data.
40. As a user, I want to copy a simulated encrypted `.researcher-share` JSON payload from the share dialog to pass it to a collaborator.
41. As a user, I want to import a `.researcher-share` payload to merge shared notes into my vault.
42. As a user, I want all block content, views state, active lens, metadata, and task checklist states to automatically persist in `localStorage` in real time, so that my work is never lost.

## Implementation Decisions

### Data Model & Types

```typescript
export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'todo';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean; // For 'todo' block type
  children: Block[]; // Nesting support (up to 3 levels deep)
}

export interface Note {
  id: string;
  nb: string; // Notebook ID
  tags: string[];
  pinned: boolean;
  date: string;
  title: string;
  blocks: Block[]; // Replaces standard html body string
  ord: number;
  // Academic metadata attributes
  authors?: string;
  journal?: string;
  year?: string;
  // Synthesis metadata
  status?: 'transient' | 'permanent';
  archived?: boolean;
}
```

### Module Architecture

1. **Storage & Serialization:**
   * Notes are saved to `localStorage` key `fluent_notes_app_notes`.
   * Pre-seed a starting vault of structured notes with block lists, including sample WikiLink references.

2. **Block Editor Component:**
   * A recursive block rendering function (`renderBlockTree(blocks)`) that outputs styled block wrappers containing editable fields, nested child containers, and hover drag-handles.
   * A central event listener on the editor container catching `keydown` shortcuts:
     * `Enter`: creates and focuses a new sibling block.
     * `Backspace`: deletes empty blocks or merges text upward.
     * `Tab` and `Shift+Tab`: indents/outdents the block, updating the parent-child block relations in the note structure.
   * Floating `/` Slash command popup triggered when typing `/` in a block, handling mouse click and arrow key selection.
   * Markdown shortcut converter triggering block conversion upon detection of `# `, `## `, or `- [ ] ` prefixes.

3. **Views Switcher & Layouts:**
   * A CSS-based views layout engine in the list pane.
   * **Grid View:** Renders an HTML `<table>` populated with notes metadata. Handles sorting dynamically on column header click.
   * **Graph View:** Renders an `<svg>` element. Reads note titles to build vertices, and uses regex `/\[\[(.*?)\]\]|@([a-zA-Z0-9\s-_]+)/gi` to extract links and build edges. Uses a lightweight canvas-based particle layout algorithm.

4. **Workflow Lenses Controller:**
   * Appends lens flags (`lens-notes`, `lens-academic`, `lens-review`) to the app root container.
   * **Academic Panel:** Renders bibliography inputs at the top of the editor and scans the vault to populate a "Backlinks" container.
   * **Review Panel:** Adjusts grid template columns to split the viewport. Renders a mock "Transient highlights inbox" with cluster headers and drag-enabled cards.

5. **P2P Sharing Manager:**
   * Dialog showing a graph diagram of the calculated closure set of notes linked from the current page/tag.
   * Truncates outbound edge nodes that are not part of the active selection and displays them as locked/excluded.
   * Generates a base64 or JSON payload representing the shared set.

## Testing Decisions

* **Testing Principles:** Tests must be written to verify core behavioral requirements (data serialization, state changes, block editing shortcuts, reference extraction, and P2P closure calculations) rather than internal rendering states.
* **Testing Seams:**
  * **Primary Seam:** The `AppStore` and core parser logic.
  * We will add `my-app/src/__tests__/store.test.ts` to test:
    * Block conversion and serialization.
    * WikiLink parsing and node/edge generation.
    * Shared sub-graph closure calculation (ensuring external links are correctly warned about and truncated).
  * Run tests using the existing Vitest script: `bun test`.

## Out of Scope

* Fully functional WebRTC or local network discovery servers (we use a simulated `.researcher-share` encrypted payload copy-paste system).
* Nested block hierarchies beyond 3 levels deep.
* Text styling within blocks (e.g. bold, italics, underlines inline formatting).
* Media blocks (images, videos, PDF attachments).

## Further Notes

* Visual themes: The new views, handles, and lens switchers will preserve the acrylic/mica semi-translucent visual guidelines, adapting dynamically to light and dark modes.
