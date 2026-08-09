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
    clustersEl.innerHTML = `<div class="text-xs text-text3 italic py-3 px-1">Highlights inbox is empty.</div>`;
    return;
  }

  clustersEl.innerHTML = clusters.map(clusterName => {
    const clusterClips = activeClips.filter(c => c.cluster === clusterName);
    return `
      <div class="cluster-card p-2.5 px-3 bg-card border border-card-brd rounded-lg shadow-[var(--sh-card)] flex flex-col gap-2 mb-3" data-cluster="${clusterName}">
        <div class="cluster-header flex justify-between items-center border-b border-divider pb-1">
          <span class="cluster-title text-[12.5px] font-semibold text-text1">${esc(clusterName)}</span>
          <button class="cluster-synth-btn px-1.5 py-0.5 text-[11px] rounded bg-accent-soft text-accent font-semibold cursor-pointer hover:bg-accent hover:text-accent-on">Synthesize</button>
        </div>
        <div class="cluster-body flex flex-col gap-1.5 mt-2">
          ${clusterClips.map(clip => `
            <div class="highlight-item p-1.5 px-2 bg-[rgba(127,127,127,0.05)] rounded text-[11.5px] leading-[1.4] text-text2 cursor-grab select-none border border-dashed border-transparent hover:border-accent-brd hover:bg-accent-soft" draggable="true" data-id="${clip.id}">${esc(clip.content)}</div>
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
