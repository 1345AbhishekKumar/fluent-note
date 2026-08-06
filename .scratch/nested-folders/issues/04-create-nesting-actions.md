Type: task
Status: resolved
Blocked by: 02, 03

## Question

How should we implement the user controls and actions (context menus, buttons, shortcuts) to create a new subfolder or subnote inside an existing folder/note?

## Answer

We have implemented subpage and subfolder creation actions:
1. Implemented a utility function `findNotebookForParent` to recursively traverse the folder/note parent chain to resolve the root notebook ID.
2. Added `newSubNote(parentId)` and `newSubFolder(parentId)` to the application core actions in `createApp.ts` and `context.ts`.
3. Integrated "New subpage" and "New subfolder" actions into the note context menu and editor more menu.
4. Bound context menu event listeners to the sidebar tree rows, giving folders and notebooks options to create folders/notes directly inside them.
5. Auto-expanded the parent node when a new nested child is created.
