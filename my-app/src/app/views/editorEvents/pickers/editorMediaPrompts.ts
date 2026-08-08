import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { findBlockById } from '../../../../utils';
import { rerenderNote, focusNextBlockOrNew } from './editorPopupUtils';

export function openMediaFilePrompt(ctx: AppContext, cmdType: string, block: Block, n: Note) {
  const input = document.createElement('input');
  input.type = 'file';
  if (cmdType === 'image') input.accept = 'image/*';
  else if (cmdType === 'video') input.accept = 'video/*';
  else if (cmdType === 'audio') input.accept = 'audio/*';
  else if (cmdType === 'pdf') input.accept = 'application/pdf';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      block.type = cmdType as any;
      block.url = e.target?.result as string;
      block.content = file.name;
      block.fileName = file.name;
      rerenderNote(ctx, n);
      const match = findBlockById(n.blocks, block.id);
      if (match) {
        focusNextBlockOrNew(ctx, n, match.index, match.parentList);
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

export function openTexPrompt(ctx: AppContext, cmdType: string, block: Block, n: Note) {
  const tex = prompt('Enter TeX / LaTeX formula:', block.content || '');
  if (tex === null) return;
  block.type = cmdType as any;
  block.content = tex;
  rerenderNote(ctx, n);
  const match = findBlockById(n.blocks, block.id);
  if (match) {
    focusNextBlockOrNew(ctx, n, match.index, match.parentList);
  }
}
