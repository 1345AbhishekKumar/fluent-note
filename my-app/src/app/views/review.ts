import type { AppContext } from '../context';
import type { Block, Note } from '../../types';
import { esc, genId } from '../../utils';
import { saveClips, saveAndSync } from '../../store';

export function renderReviewInbox(ctx: AppContext) {
  const clustersEl = ctx.root.querySelector('.review-clusters') as HTMLElement;
  if (!clustersEl) return;
  
  const activeClips = ctx.st.clips.filter(c => !c.archived);
  const clusters = Array.from(new Set(activeClips.map(c => c.cluster)));
  
  if (activeClips.length === 0) {
    clustersEl.innerHTML = `<div style="font-size:12px; color:var(--text3); font-style:italic; padding:12px 4px;">Highlights inbox is empty.</div>`;
    return;
  }

  clustersEl.innerHTML = clusters.map(clusterName => {
    const clusterClips = activeClips.filter(c => c.cluster === clusterName);
    return `
      <div class="cluster-card" data-cluster="${clusterName}" style="margin-bottom:12px;">
        <div class="cluster-header">
          <span class="cluster-title">${esc(clusterName)}</span>
          <button class="cluster-synth-btn">Synthesize</button>
        </div>
        <div class="cluster-body" style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          ${clusterClips.map(clip => `
            <div class="highlight-item" draggable="true" data-id="${clip.id}">${esc(clip.content)}</div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  clustersEl.querySelectorAll('.highlight-item').forEach(item => {
    const htmlItem = item as HTMLElement;
    htmlItem.addEventListener('dragstart', e => {
      const clipId = htmlItem.dataset.id!;
      const clip = ctx.st.clips.find(c => c.id === clipId);
      if (clip && e.dataTransfer) {
        e.dataTransfer.setData('text/plain', `CLIP:${clip.content}:${clip.id}`);
        e.dataTransfer.effectAllowed = 'copy';
      }
    });
  });

  clustersEl.querySelectorAll('.cluster-synth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const clusterCard = (btn as HTMLElement).closest('.cluster-card') as HTMLElement;
      if (!clusterCard) return;
      const clusterName = clusterCard.dataset.cluster!;
      
      const clusterClips = activeClips.filter(c => c.cluster === clusterName);
      const noteBlocks: Block[] = clusterClips.map(clip => ({
        id: genId(),
        type: 'paragraph' as const,
        content: clip.content,
        children: []
      }));

      clusterClips.forEach(clip => {
        clip.archived = true;
      });
      saveClips(ctx.st.clips);

      const newN: Note = {
        id: 'n' + Math.random().toString(36).slice(2, 7),
        title: clusterName,
        body: clusterClips.map(c => c.content).join('\n'),
        blocks: noteBlocks,
        nb: 'design',
        tags: ['review'],
        pinned: false,
        date: 'Just now',
        ord: --ctx.st.ordMin,
        status: 'permanent'
      };
      ctx.st.notes.unshift(newN);
      saveAndSync();
      ctx.selectNote(newN.id);
      renderReviewInbox(ctx);
    });
  });
}
