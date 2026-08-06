Type: task
Status: resolved
Blocked by: 01, 04

## Question

How should we implement the recursive deletion logic for folders/notes to ensure nested children are safely deleted, and how do we present the warning confirmation UI to the user?

## Answer

We have implemented recursive folder/note deletion:
1. Implemented a recursive deletion helper `deleteFolderRecursive` in `sidebar.ts` that traverses the subfolders and subnotes recursively, removing each from the `sharedNotes` and `st.folders` data lists.
2. Cleared active filters if the deleted folder was active.
3. Provided confirmation alerts (`confirm(...)`) to warning users before running recursive deletion.
4. Hooked deletion triggers to the context menu of folders in the sidebar.
