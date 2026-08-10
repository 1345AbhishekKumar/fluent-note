import type { AppContext } from '../context';
import type { Note } from '../../types';
import { esc, calculateSubGraphClosure, getBlocksText } from '../../utils';
import { APPS, saveAndSync } from '../../store';

function renderBoundaryGraph(
  sharedIds: Set<string>,
  truncatedIds: Set<string>,
  notes: Note[]
): string {
  const sharedList = Array.from(sharedIds);
  const truncatedList = Array.from(truncatedIds);
  
  // Cap displayed nodes to avoid cluttered UI
  const maxDisplay = 6;
  const displayShared = sharedList.slice(0, maxDisplay);
  const displayTruncated = truncatedList.slice(0, maxDisplay);
  
  const nodesMap = new Map<string, { x: number; y: number; isTruncated: boolean; title: string }>();
  
  const width = 340;
  const height = 180;
  
  // Calculate positions
  displayShared.forEach((id, idx) => {
    const note = notes.find(n => n.id === id);
    const title = note ? note.title || 'Untitled' : 'Unknown';
    const x = 75;
    const y = displayShared.length === 1 
      ? height / 2 
      : 25 + idx * ((height - 50) / (displayShared.length - 1));
    nodesMap.set(id, { x, y, isTruncated: false, title });
  });
  
  displayTruncated.forEach((id, idx) => {
    const note = notes.find(n => n.id === id);
    const title = note ? note.title || 'Untitled' : 'Unknown';
    const x = 265;
    const y = displayTruncated.length === 1 
      ? height / 2 
      : 25 + idx * ((height - 50) / (displayTruncated.length - 1));
    nodesMap.set(id, { x, y, isTruncated: true, title });
  });
  
  // Build edges
  const edges: string[] = [];
  for (const sharedId of displayShared) {
    const note = notes.find(n => n.id === sharedId);
    if (!note) continue;
    
    // Find references
    const refs = new Set<string>();
    const text = note.blocks ? getBlocksText(note.blocks) : '';
    const wikiRegex = /\[\[(.*?)\]\]/g;
    let match: RegExpExecArray | null;
    while ((match = wikiRegex.exec(text)) !== null) {
      const targetNote = notes.find(x => x.title.toLowerCase() === match![1].trim().toLowerCase());
      if (targetNote) refs.add(targetNote.id);
    }
    const atRegex = /@([a-zA-Z0-9\s-_]+?)/gi;
    while ((match = atRegex.exec(text)) !== null) {
      const targetNote = notes.find(x => x.title.toLowerCase() === match![1].trim().toLowerCase());
      if (targetNote) refs.add(targetNote.id);
    }
    
    const sourceNode = nodesMap.get(sharedId);
    if (!sourceNode) continue;
    
    for (const refId of refs) {
      const targetNode = nodesMap.get(refId);
      if (!targetNode) continue;
      
      const isTrunc = targetNode.isTruncated;
      const stroke = isTrunc ? '#ff5f56' : '#6ccb5f';
      const strokeDash = isTrunc ? 'stroke-dasharray="3 3"' : '';
      
      edges.push(`
        <line x1="${sourceNode.x}" y1="${sourceNode.y}" x2="${targetNode.x}" y2="${targetNode.y}" stroke="${stroke}" stroke-width="1.5" ${strokeDash} />
      `);
    }
  }
  
  // Render SVG
  let svgContent = `<g class="edges-layer">${edges.join('')}</g>`;
  
  // Draw nodes
  nodesMap.forEach((node, id) => {
    const fill = node.isTruncated ? 'none' : '#6ccb5f';
    const stroke = node.isTruncated ? '#ff5f56' : '#6ccb5f';
    const dash = node.isTruncated ? 'stroke-dasharray="2 2"' : '';
    const textAnchor = node.isTruncated ? 'start' : 'end';
    const textX = node.isTruncated ? node.x + 10 : node.x - 10;
    const shortTitle = node.title.length > 12 ? node.title.substring(0, 10) + '...' : node.title;
    
    svgContent += `
      <g class="graph-node-p2p" data-id="${id}">
        <circle cx="${node.x}" cy="${node.y}" r="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5" ${dash} />
        <text x="${textX}" y="${node.y + 3}" fill="var(--text)" font-size="10" text-anchor="${textAnchor}" style="font-family: var(--font-sans);">${esc(shortTitle)}</text>
      </g>
    `;
  });
  
  // If capped, show indication
  if (sharedList.length > maxDisplay) {
    svgContent += `
      <text x="75" y="172" fill="#6ccb5f" font-size="9" text-anchor="middle" style="font-style: italic; font-family: var(--font-sans);">+${sharedList.length - maxDisplay} more</text>
    `;
  }
  if (truncatedList.length > maxDisplay) {
    svgContent += `
      <text x="265" y="172" fill="#ff5f56" font-size="9" text-anchor="middle" style="font-style: italic; font-family: var(--font-sans);">+${truncatedList.length - maxDisplay} truncated</text>
    `;
  }
  
  return `
    <svg width="${width}" height="${height}" style="background: var(--bg3); border-radius: 6px; border: 1px solid var(--divider); display: block; margin: 12px auto;">
      ${svgContent}
    </svg>
  `;
}

export function startP2PShare(
  ctx: AppContext,
  target: Note | { type: 'notebook' | 'tag'; id: string; name: string }
) {
  let sharingName = '';
  let boundary: { notebook?: string; tag?: string } = {};
  let startIds: string[] = [];

  if ('type' in target) {
    // Sharing a Notebook or Tag
    sharingName = target.name;
    if (target.type === 'notebook') {
      boundary = { notebook: target.id };
      startIds = ctx.st.notes.filter(n => n.nb === target.id).map(n => n.id);
    } else {
      boundary = { tag: target.id };
      startIds = ctx.st.notes.filter(n => n.tags.includes(target.id)).map(n => n.id);
    }
  } else {
    // Sharing a single starting Note
    sharingName = target.title || 'Untitled Note';
    boundary = { notebook: target.nb };
    startIds = [target.id];
  }

  if (startIds.length === 0) {
    ctx.toast(`No notes found in ${sharingName} to share.`);
    return;
  }

  const closureSet = calculateSubGraphClosure(ctx.st.notes, startIds, boundary);
  const closureCount = closureSet.sharedIds.size;

  // Generate payload
  const sharedNotesList = ctx.st.notes.filter(n => closureSet.sharedIds.has(n.id));
  const payloadObj = {
    type: '.researcher-share',
    version: 1,
    notes: sharedNotesList
  };
  const jsonString = JSON.stringify(payloadObj);
  const base64Payload = btoa(unescape(encodeURIComponent(jsonString)));
  const encryptedPayload = `RESEARCHER_SHARE_${base64Payload}`;

  const modal = document.createElement('div');
  modal.className = 'p2p-modal-overlay fixed inset-0 bg-black/0 flex items-center justify-center z-[99999] backdrop-blur-none opacity-0 pointer-events-none transition-[opacity,background-color,backdrop-filter] duration-quick ease-smooth-out [&.show]:opacity-100 [&.show]:pointer-events-auto [&.show]:bg-black/40 [&.show]:backdrop-blur-sm';
  
  modal.innerHTML = `
    <div class="p2p-card bg-card border border-card-brd rounded-lg w-[400px] max-w-[90vw] p-5 shadow-2xl flex flex-col gap-3 scale-[0.96] translate-y-2 opacity-0 transition-[transform,opacity] duration-quick ease-smooth-out [.show_&]:scale-100 [.show_&]:translate-y-0 [.show_&]:opacity-100">
      <div class="p2p-title font-semibold text-base text-text1">Share Sub-graph Closure</div>
      <div class="p2p-closure-info text-xs leading-relaxed text-text2">
        <strong>Sharing:</strong> ${esc(sharingName)}<br>
        <strong>Sub-graph closure:</strong> ${closureCount} note(s) in selection.<br>
        ${closureSet.truncatedIds.size > 0 
          ? `<span class="text-[#ff5f56] font-semibold">⚠️ ${closureSet.truncatedIds.size} external references will be truncated.</span>` 
          : '<span class="text-[#6ccb5f] font-semibold">✔️ All connected notes are inside boundary.</span>'}
      </div>
      
      ${renderBoundaryGraph(closureSet.sharedIds, closureSet.truncatedIds, ctx.st.notes)}
      
      <div>
        <label class="text-[11px] font-semibold block mb-1 text-text2">Simulated \`.researcher-share\` Payload:</label>
        <textarea readonly class="p2p-payload-box w-full h-[60px] font-mono text-[10px] bg-bg2 text-text1 border border-divider rounded p-[6px] resize-none break-all outline-none">${encryptedPayload}</textarea>
      </div>
      
      <div class="p2p-progress-track w-full h-1 bg-divider rounded-sm hidden overflow-hidden">
        <div class="p2p-progress-bar w-0 h-full bg-accent transition-[width] duration-1500 ease-linear"></div>
      </div>
      
      <div class="flex gap-2">
        <button class="p2p-copy-btn flex-1 p-2 rounded bg-accent text-white border-none font-semibold cursor-pointer hover:bg-accent-fill-h active:scale-[0.97] transition-[background-color,transform] duration-quick">Copy Payload</button>
        <button class="p2p-sim-btn flex-1 p-2 rounded bg-bg2 text-text1 border border-divider font-semibold cursor-pointer hover:bg-nav-h active:scale-[0.97] transition-[background-color,transform] duration-quick">P2P Transfer</button>
      </div>
      
      <div class="p2p-status text-[11px] text-text2 text-center min-h-[16px]">Ready to copy or transfer.</div>
      
      <button class="p2p-close-btn w-full p-2 rounded bg-bg2 border border-divider text-text1 font-semibold cursor-pointer hover:bg-nav-h active:scale-[0.97] transition-[background-color,transform] duration-quick">Close</button>
    </div>
  `;

  ctx.root.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));

  const copyBtn = modal.querySelector('.p2p-copy-btn') as HTMLElement;
  const simBtn = modal.querySelector('.p2p-sim-btn') as HTMLElement;
  const closeBtn = modal.querySelector('.p2p-close-btn') as HTMLElement;
  const status = modal.querySelector('.p2p-status') as HTMLElement;
  const progressTrack = modal.querySelector('.p2p-progress-track') as HTMLElement;
  const progressBar = modal.querySelector('.p2p-progress-bar') as HTMLElement;

  copyBtn.addEventListener('click', () => {
    const textarea = modal.querySelector('.p2p-payload-box') as HTMLTextAreaElement;
    textarea.select();
    try {
      document.execCommand('copy');
      status.textContent = 'Payload copied to clipboard!';
      ctx.toast('Simulated \`.researcher-share\` payload copied!');
    } catch (e) {
      status.textContent = 'Failed to copy payload.';
    }
  });

  simBtn.addEventListener('click', () => {
    progressTrack.style.display = 'block';
    simBtn.style.pointerEvents = 'none';
    simBtn.style.opacity = '0.5';
    status.textContent = 'Connecting to peer...';
    
    setTimeout(() => {
      if (progressBar) progressBar.style.width = '100%';
      status.textContent = 'Transferring sub-graph closure...';
    }, 100);

    setTimeout(() => {
      status.textContent = 'Transfer completed successfully!';
      const peer = APPS.find(app => app !== ctx.api);
      if (peer) {
        peer.showReceivedToast(closureCount, sharingName);
      }
    }, 1600);
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    modal.classList.remove('show');
    modal.addEventListener('transitionend', (e) => {
      if (e.target === modal) modal.remove();
    }, { once: true });
    setTimeout(() => modal.remove(), 250);
  };

  closeBtn.addEventListener('click', close);
}

export function openImportDialog(ctx: AppContext) {
  const modal = document.createElement('div');
  modal.className = 'p2p-modal-overlay fixed inset-0 bg-black/0 flex items-center justify-center z-[99999] backdrop-blur-none opacity-0 pointer-events-none transition-[opacity,background-color,backdrop-filter] duration-quick ease-smooth-out [&.show]:opacity-100 [&.show]:pointer-events-auto [&.show]:bg-black/40 [&.show]:backdrop-blur-sm';

  modal.innerHTML = `
    <div class="p2p-card bg-card border border-card-brd rounded-lg w-[400px] max-w-[90vw] p-5 shadow-2xl flex flex-col gap-3 scale-[0.96] translate-y-2 opacity-0 transition-[transform,opacity] duration-quick ease-smooth-out [.show_&]:scale-100 [.show_&]:translate-y-0 [.show_&]:opacity-100">
      <div class="p2p-title font-semibold text-base text-text1">Import Sub-graph Share</div>
      <div>
        <label class="text-[11px] font-semibold block mb-1 text-text2">Paste \`.researcher-share\` Payload:</label>
        <textarea class="p2p-import-box w-full h-[100px] font-mono text-[10px] bg-bg2 text-text1 border border-divider rounded p-[6px] resize-none break-all outline-none" placeholder="RESEARCHER_SHARE_..."></textarea>
      </div>
      
      <div class="p2p-import-status text-[11px] text-[#ff5f56] min-h-[16px]"></div>
      
      <div class="flex gap-2">
        <button class="p2p-merge-btn flex-1 p-2 rounded bg-accent text-white border-none font-semibold cursor-pointer hover:bg-accent-fill-h active:scale-[0.97] transition-[background-color,transform] duration-quick">Merge into Vault</button>
        <button class="p2p-cancel-btn flex-1 p-2 rounded bg-bg2 text-text1 border border-divider font-semibold cursor-pointer hover:bg-nav-h active:scale-[0.97] transition-[background-color,transform] duration-quick">Cancel</button>
      </div>
    </div>
  `;

  ctx.root.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));

  const importBox = modal.querySelector('.p2p-import-box') as HTMLTextAreaElement;
  const mergeBtn = modal.querySelector('.p2p-merge-btn') as HTMLElement;
  const cancelBtn = modal.querySelector('.p2p-cancel-btn') as HTMLElement;
  const status = modal.querySelector('.p2p-import-status') as HTMLElement;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    modal.classList.remove('show');
    modal.addEventListener('transitionend', (e) => {
      if (e.target === modal) modal.remove();
    }, { once: true });
    setTimeout(() => modal.remove(), 250);
  };

  mergeBtn.addEventListener('click', () => {
    const val = importBox.value.trim();
    if (!val.startsWith('RESEARCHER_SHARE_')) {
      status.style.color = '#ff5f56';
      status.textContent = 'Invalid payload: must start with RESEARCHER_SHARE_';
      return;
    }

    try {
      const base64 = val.substring('RESEARCHER_SHARE_'.length);
      const jsonString = decodeURIComponent(escape(atob(base64)));
      const payload = JSON.parse(jsonString);

      if (payload.type !== '.researcher-share' || !Array.isArray(payload.notes)) {
        status.style.color = '#ff5f56';
        status.textContent = 'Invalid payload format or metadata.';
        return;
      }

      let mergeCount = 0;
      for (const note of payload.notes) {
        const existingIdx = ctx.st.notes.findIndex(x => x.id === note.id);
        if (existingIdx !== -1) {
          ctx.st.notes[existingIdx] = note;
        } else {
          ctx.st.notes.push(note);
        }
        mergeCount++;
      }

      saveAndSync();
      ctx.toast(`Successfully imported and merged ${mergeCount} note(s)!`);
      close();

      // Automatically select first imported note
      if (payload.notes.length > 0) {
        ctx.selectNote(payload.notes[0].id);
      }
    } catch (e) {
      status.style.color = '#ff5f56';
      status.textContent = 'Failed to parse and decode payload.';
    }
  });

  cancelBtn.addEventListener('click', close);
}
