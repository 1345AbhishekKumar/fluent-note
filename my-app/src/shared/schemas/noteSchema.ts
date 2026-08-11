import { z } from 'zod';

export const KnownBlockTypes = [
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'todo',
  'bullet',
  'numbered',
  'toggle',
  'toggle_h1',
  'toggle_h2',
  'toggle_h3',
  'quote',
  'divider',
  'code',
  'callout',
  'image',
  'video',
  'audio',
  'pdf',
  'bookmark',
  'file',
  'equation',
  'math',
  'mermaid',
  'toc',
  'breadcrumb',
  'template',
  'subpage',
  'subfolder',
  'column_list',
  'column'
] as const;

export const BlockTypeSchema = z.string();

export type BlockType = string;

export const BlockSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    content: z.string().optional().default(''),
    checked: z.boolean().optional(),
    language: z.string().optional(),
    url: z.string().optional(),
    icon: z.string().optional(),
    fileName: z.string().optional(),
    codeWrap: z.boolean().optional(),
    codeFullWidth: z.boolean().optional(),
    mermaidMode: z.string().optional(),
    collapsed: z.boolean().optional(),
    textColor: z.string().optional(),
    bgColor: z.string().optional(),
    comment: z.string().optional(),
    columnWidth: z.number().optional(),
    bookmarkTitle: z.string().optional(),
    children: z.array(BlockSchema).optional().default([])
  }).passthrough()
);

export type Block = z.infer<typeof BlockSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  nb: z.string().default(''),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  date: z.string().default('Just now'),
  title: z.string().default('Untitled Note'),
  body: z.string().optional().default(''),
  blocks: z.array(BlockSchema).default([]),
  ord: z.number().default(0),
  authors: z.string().optional(),
  journal: z.string().optional(),
  year: z.string().optional(),
  status: z.enum(['transient', 'permanent']).optional(),
  archived: z.boolean().default(false),
  parentId: z.string().nullable().optional().default(null)
}).passthrough();

export type Note = z.infer<typeof NoteSchema>;
