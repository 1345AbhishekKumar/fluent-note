import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { findBlockById } from '../../../../utils';
import { rerenderNote, focusNextBlockOrNew } from './editorPopupUtils';

export function openMediaFilePrompt(ctx: AppContext, cmdType: string, block: Block, n: Note) {
  if (typeof window !== 'undefined' && window.api && window.api.selectFile) {
    window.api.selectFile(cmdType).then((res) => {
      if (res && res.url) {
        block.type = cmdType as any;
        block.url = res.url;
        block.content = res.fileName;
        block.fileName = res.fileName;
        rerenderNote(ctx, n);
        const match = findBlockById(n.blocks, block.id);
        if (match) {
          focusNextBlockOrNew(ctx, n, match.index, match.parentList);
        }
      }
    }).catch((err) => {
      console.error('Error selecting file via native dialog:', err);
    });
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  if (cmdType === 'image') input.accept = 'image/*';
  else if (cmdType === 'video') input.accept = 'video/*';
  else if (cmdType === 'audio') input.accept = 'audio/*';
  else if (cmdType === 'pdf') input.accept = 'application/pdf';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const filePath = (file as any).path;
    if (filePath && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.copyAssetToVault) {
      try {
        const res = await window.electronAPI.copyAssetToVault(filePath);
        if (res && res.url) {
          block.type = cmdType as any;
          block.url = res.url;
          block.content = file.name;
          block.fileName = file.name;
          rerenderNote(ctx, n);
          const match = findBlockById(n.blocks, block.id);
          if (match) {
            focusNextBlockOrNew(ctx, n, match.index, match.parentList);
          }
          return;
        }
      } catch (err) {
        console.error('Error copying asset to vault:', err);
      }
    }

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
