import { z } from 'zod';
import { NoteSchema } from './noteSchema';

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable().optional().default(null)
}).passthrough();

export type Folder = z.infer<typeof FolderSchema>;

export const NotebookSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional().default('#0067c0')
}).passthrough();

export type Notebook = z.infer<typeof NotebookSchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional().default('#0067c0')
}).passthrough();

export type Tag = z.infer<typeof TagSchema>;

export const TransientClipSchema = z.object({
  id: z.string(),
  content: z.string(),
  source: z.string().optional(),
  createdAt: z.string().optional()
}).passthrough();

export type TransientClip = z.infer<typeof TransientClipSchema>;

export const VaultDataSchema = z.object({
  notes: z.array(NoteSchema).default([]),
  folders: z.array(FolderSchema).default([]),
  notebooks: z.array(NotebookSchema).default([]),
  tags: z.array(TagSchema).default([]),
  clips: z.array(TransientClipSchema).default([])
}).passthrough();

export type VaultData = z.infer<typeof VaultDataSchema>;
