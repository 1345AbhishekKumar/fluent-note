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
  modal.className = 'p2p-modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
  
  modal.innerHTML = `
    <div class="p2p-card" style="width: 400px; max-width: 90vw; padding: 20px; background:var(--bg); border:1px solid var(--divider); border-radius:8px; box-shadow: 0 8px 32px rgba(0,0,0,0.24); display:flex; flex-direction:column; gap:12px;">
      <div class="p2p-title" style="font-weight: 600; font-size: 16px; color:var(--text);">Share Sub-graph Closure</div>
      <div class="p2p-closure-info" style="font-size: 13px; line-height: 1.4; color:var(--text2);">
        <strong>Sharing:</strong> ${esc(sharingName)}<br>
        <strong>Sub-graph closure:</strong> ${closureCount} note(s) in selection.<br>
        ${closureSet.truncatedIds.size > 0 
          ? `<span style="color:#ff5f56; font-weight:600;">⚠️ ${closureSet.truncatedIds.size} external references will be truncated.</span>` 
          : '<span style="color:#6ccb5f; font-weight:600;">✔️ All connected notes are inside boundary.</span>'}
      </div>
      
      ${renderBoundaryGraph(closureSet.sharedIds, closureSet.truncatedIds, ctx.st.notes)}
      
      <div>
        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--text2);">Simulated \`.researcher-share\` Payload:</label>
        <textarea readonly class="p2p-payload-box" style="width: 100%; height: 60px; font-family: monospace; font-size: 10px; background: var(--bg3); color: var(--text); border: 1px solid var(--divider); border-radius: 4px; padding: 6px; resize: none; word-break: break-all; outline:none;">${encryptedPayload}</textarea>
      </div>
      
      <div class="p2p-progress-track" style="width:100%; height:4px; background:var(--divider); border-radius:2px; display:none; overflow:hidden;">
        <div class="p2p-progress-bar" style="width:0%; height:100%; background:var(--accent); transition:width 1.5s ease-in-out;"></div>
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button class="p2p-copy-btn" style="flex: 1; padding: 8px; border-radius: 4px; background: var(--accent); color: white; border: none; font-weight: 600; cursor: pointer;">Copy Payload</button>
        <button class="p2p-sim-btn" style="flex: 1; padding: 8px; border-radius: 4px; background: var(--bg3); color: var(--text); border: 1px solid var(--divider); font-weight: 600; cursor: pointer;">P2P Transfer</button>
      </div>
      
      <div class="p2p-status" style="font-size: 11px; color: var(--text2); text-align: center; min-height: 16px;">Ready to copy or transfer.</div>
      
      <button class="p2p-close-btn" style="width: 100%; padding: 8px; border-radius: 4px; background: var(--bg3); border: 1px solid var(--divider); color: var(--text); font-weight: 600; cursor: pointer;">Close</button>
    </div>
  `;

  ctx.root.appendChild(modal);

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

  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
}

export function openImportDialog(ctx: AppContext) {
  const modal = document.createElement('div');
  modal.className = 'p2p-modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';

  modal.innerHTML = `
    <div class="p2p-card" style="width: 400px; max-width: 90vw; padding: 20px; background:var(--bg); border:1px solid var(--divider); border-radius:8px; box-shadow: 0 8px 32px rgba(0,0,0,0.24); display:flex; flex-direction:column; gap:12px;">
      <div class="p2p-title" style="font-weight: 600; font-size: 16px; color:var(--text);">Import Sub-graph Share</div>
      <div>
        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--text2);">Paste \`.researcher-share\` Payload:</label>
        <textarea class="p2p-import-box" placeholder="RESEARCHER_SHARE_..." style="width: 100%; height: 100px; font-family: monospace; font-size: 10px; background: var(--bg3); color: var(--text); border: 1px solid var(--divider); border-radius: 4px; padding: 6px; resize: none; word-break: break-all; outline:none;"></textarea>
      </div>
      
      <div class="p2p-import-status" style="font-size: 11px; color: #ff5f56; min-height: 16px;"></div>
      
      <div style="display: flex; gap: 8px;">
        <button class="p2p-merge-btn" style="flex: 1; padding: 8px; border-radius: 4px; background: var(--accent); color: white; border: none; font-weight: 600; cursor: pointer;">Merge into Vault</button>
        <button class="p2p-cancel-btn" style="flex: 1; padding: 8px; border-radius: 4px; background: var(--bg3); color: var(--text); border: 1px solid var(--divider); font-weight: 600; cursor: pointer;">Cancel</button>
      </div>
    </div>
  `;

  ctx.root.appendChild(modal);

  const importBox = modal.querySelector('.p2p-import-box') as HTMLTextAreaElement;
  const mergeBtn = modal.querySelector('.p2p-merge-btn') as HTMLElement;
  const cancelBtn = modal.querySelector('.p2p-cancel-btn') as HTMLElement;
  const status = modal.querySelector('.p2p-import-status') as HTMLElement;

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
      modal.remove();

      // Automatically select first imported note
      if (payload.notes.length > 0) {
        ctx.selectNote(payload.notes[0].id);
      }
    } catch (e) {
      status.style.color = '#ff5f56';
      status.textContent = 'Failed to parse and decode payload.';
    }
  });

  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
}
