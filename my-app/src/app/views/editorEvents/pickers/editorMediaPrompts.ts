import type { AppContext } from '../../../context';
import type { Block, Note } from '../../../../types';
import { findBlockById } from '../../../../utils';
import { saveAndSyncContent } from '../../../../store';
import { rerenderNote, focusNextBlockOrNew } from './editorPopupUtils';

export function openMediaFilePrompt(ctx: AppContext, cmdType: string, block: Block, n: Note) {
  const api = (typeof window !== 'undefined') ? (window.api || window.electronAPI) : undefined;
  if (api && api.selectFile) {
    api.selectFile(cmdType).then((res) => {
      if (res && res.url) {
        block.type = cmdType as any;
        block.url = res.url;
        block.content = res.fileName;
        block.fileName = res.fileName;
        rerenderNote(ctx, n);
        saveAndSyncContent();
        ctx.markSaving();
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
  else if (cmdType === 'audio') input.accept = 'audio/mpeg, audio/mp3, audio/wav, audio/ogg, audio/x-m4a, audio/aac, audio/flac, .mp3, .wav, .ogg, .m4a, .aac, .flac';
  else if (cmdType === 'pdf') input.accept = 'application/pdf';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const filePath = (file as any).path;
    if (filePath && api && api.copyAssetToVault) {
      try {
        const res = await api.copyAssetToVault(filePath);
        if (res && res.url) {
          block.type = cmdType as any;
          block.url = res.url;
          block.content = file.name;
          block.fileName = file.name;
          rerenderNote(ctx, n);
          saveAndSyncContent();
          ctx.markSaving();
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

    // Fallback: Read as base64 data URL so content is persisted rather than temporary volatile blob URL
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      block.type = cmdType as any;
      block.url = dataUrl;
      block.content = file.name;
      block.fileName = file.name;
      rerenderNote(ctx, n);
      saveAndSyncContent();
      ctx.markSaving();
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
  saveAndSyncContent();
  ctx.markSaving();
  const match = findBlockById(n.blocks, block.id);
  if (match) {
    focusNextBlockOrNew(ctx, n, match.index, match.parentList);
  }
}
