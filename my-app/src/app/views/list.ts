import type { AppContext } from '../context';
import type { Note } from '../../types';
import { TAGS, IC } from '../../constants';
import { sharedNotebooks as NBS } from '../../store';
import { esc, strip, getReferencedNoteIds } from '../../utils';
import { sortItems, filterItems, noteItems } from '../components/flyout';

export function filtered(ctx: AppContext): Note[] {
  let arr = ctx.st.notes.filter(n => {
    if (ctx.st.quick === 'pinned' && !n.pinned) return false;
    if (ctx.st.nb !== 'all' && n.nb !== ctx.st.nb) return false;
    if (ctx.st.folder && n.parentId !== ctx.st.folder) return false;
    if (ctx.st.tag && !n.tags.includes(ctx.st.tag)) return false;
    if (ctx.st.q) {
      const hay = (n.title + ' ' + strip(n.body)).toLowerCase();
      if (!hay.includes(ctx.st.q)) return false;
    }
    return true;
  });
  arr.sort((a, b) => {
    const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (pinDiff !== 0) return pinDiff;
    if (ctx.st.sort === 'title') {
      return a.title.localeCompare(b.title);
    }
    return a.ord - b.ord;
  });
  return arr;
}

export function renderGridView(ctx: AppContext, arr: Note[]) {
  const sorted = [...arr].sort((a, b) => {
    let valA = '';
    let valB = '';
    if (ctx.st.gridSort === 'title') {
      valA = a.title;
      valB = b.title;
    } else if (ctx.st.gridSort === 'notebook') {
      const nbA = NBS.find(x => x.id === a.nb)?.name || '';
      const nbB = NBS.find(x => x.id === b.nb)?.name || '';
      valA = nbA;
      valB = nbB;
    } else if (ctx.st.gridSort === 'tags') {
      valA = a.tags.join(', ');
      valB = b.tags.join(', ');
    } else if (ctx.st.gridSort === 'date') {
      valA = a.date;
      valB = b.date;
    }
    return ctx.st.gridSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const sortInd = (col: string) => {
    if (ctx.st.gridSort !== col) return '';
    return ctx.st.gridSortAsc ? ' ▲' : ' ▼';
  };

  ctx.elements.lpScroll.innerHTML = `
    <table class="grid-table">
      <thead>
        <tr>
          <th data-col="title">Title${sortInd('title')}</th>
          <th data-col="notebook">Notebook${sortInd('notebook')}</th>
          <th data-col="tags">Tags${sortInd('tags')}</th>
          <th data-col="date">Date${sortInd('date')}</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(n => {
          const nb = NBS.find(x => x.id === n.nb) || NBS[0];
          const tagsText = n.tags.map(t => TAGS.find(x => x.id === t)?.name || t).join(', ');
          const selClass = n.id === ctx.st.sel ? 'sel' : '';
          return `
            <tr class="${selClass}" data-id="${n.id}">
              <td>${esc(n.title) || 'Untitled'}</td>
              <td><span class="dot" style="background:${nb.color}; display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:6px;"></span>${nb.name}</td>
              <td>${esc(tagsText) || '—'}</td>
              <td>${n.date}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  const ths = ctx.elements.lpScroll.querySelectorAll('.grid-table th');
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const col = (th as HTMLElement).dataset.col!;
      if (ctx.st.gridSort === col) {
        ctx.st.gridSortAsc = !ctx.st.gridSortAsc;
      } else {
        ctx.st.gridSort = col as any;
        ctx.st.gridSortAsc = true;
      }
      renderList(ctx);
    });
  });

  const rows = ctx.elements.lpScroll.querySelectorAll('.grid-table tbody tr');
  rows.forEach(row => {
    row.addEventListener('click', () => {
      ctx.selectNote((row as HTMLElement).dataset.id!);
    });
  });
}

export function renderGraphView(ctx: AppContext, arr: Note[]) {
  const nodes = arr.map(n => ({
    id: n.id,
    title: n.title || 'Untitled',
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    vx: 0,
    vy: 0
  }));

  const edges: { source: string, target: string }[] = [];
  for (const n of arr) {
    const refs = getReferencedNoteIds(n, arr);
    for (const refId of refs) {
      if (arr.some(x => x.id === refId)) {
        edges.push({ source: n.id, target: refId });
      }
    }
  }

  ctx.elements.lpScroll.innerHTML = `
    <svg class="graph-svg">
      <g class="edges-group"></g>
      <g class="nodes-group"></g>
    </svg>
  `;

  const svg = ctx.elements.lpScroll.querySelector('.graph-svg') as SVGSVGElement;
  if (!svg) return;

  const edgesGroup = svg.querySelector('.edges-group') as SVGSVGElement;
  const nodesGroup = svg.querySelector('.nodes-group') as SVGSVGElement;

  const width = ctx.elements.lpScroll.clientWidth || 300;
  const height = ctx.elements.lpScroll.clientHeight || 380;
  
  nodes.forEach(n => {
    n.x = width / 2 + (Math.random() - 0.5) * 150;
    n.y = height / 2 + (Math.random() - 0.5) * 150;
  });

  function tick() {
    const k = 0.08;
    const gravity = 0.03;
    const rep = 800;
    const naturalLength = 60;

    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 220) {
          const force = rep / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    for (const edge of edges) {
      const s = nodes.find(n => n.id === edge.source);
      const t = nodes.find(n => n.id === edge.target);
      if (s && t) {
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - naturalLength) * k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }
    }

    for (const n of nodes) {
      n.vx += (width / 2 - n.x) * gravity;
      n.vy += (height / 2 - n.y) * gravity;

      n.x += n.vx;
      n.y += n.vy;

      n.vx *= 0.82;
      n.vy *= 0.82;
    }

    for (const n of nodes) {
      if (n.x < 15) n.x = 15;
      if (n.x > width - 15) n.x = width - 15;
      if (n.y < 15) n.y = 15;
      if (n.y > height - 15) n.y = height - 15;
    }

    draw();
  }

  function draw() {
    edgesGroup.innerHTML = edges.map(edge => {
      const s = nodes.find(n => n.id === edge.source);
      const t = nodes.find(n => n.id === edge.target);
      if (!s || !t) return '';
      return `<line class="graph-edge" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}"></line>`;
    }).join('');

    nodesGroup.innerHTML = nodes.map(n => {
      const activeClass = n.id === ctx.st.sel ? 'active' : '';
      const color = n.id === ctx.st.sel ? 'var(--accent)' : 'var(--text2)';
      return `
        <g class="graph-node ${activeClass}" data-id="${n.id}" transform="translate(${n.x}, ${n.y})">
          <circle r="${n.id === ctx.st.sel ? 7 : 5}" fill="${color}"></circle>
          <text dx="9" dy="4">${esc(n.title)}</text>
        </g>
      `;
    }).join('');

    nodesGroup.querySelectorAll('.graph-node').forEach(nodeGroup => {
      const nodeId = (nodeGroup as HTMLElement).dataset.id!;
      
      nodeGroup.addEventListener('mousedown', e => {
        e.preventDefault();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        ctx.selectNote(nodeId);
        
        function onMouseMove(moveEvent: MouseEvent) {
          const svgRect = svg.getBoundingClientRect();
          node!.x = moveEvent.clientX - svgRect.left;
          node!.y = moveEvent.clientY - svgRect.top;
          node!.vx = 0;
          node!.vy = 0;
          tick();
        }
        
        function onMouseUp() {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          let ticks = 60;
          function animate() {
            if (ticks-- > 0) {
              tick();
              requestAnimationFrame(animate);
            }
          }
          animate();
        }
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  let ticks = 120;
  function run() {
    if (ticks-- > 0 && ctx.st.view === 'graph') {
      tick();
      requestAnimationFrame(run);
    }
  }
  run();
}

export function renderList(ctx: AppContext) {
  const arr = filtered(ctx);
  if (ctx.st.q) {
    ctx.elements.lpTitle.textContent = `Results for “${ctx.st.q}”`;
  } else if (ctx.st.quick === 'pinned') {
    ctx.elements.lpTitle.textContent = 'Pinned';
  } else if (ctx.st.nb !== 'all') {
    const foundNb = NBS.find(n => n.id === ctx.st.nb);
    ctx.elements.lpTitle.textContent = foundNb ? foundNb.name : 'Notebook';
  } else if (ctx.st.tag) {
    const foundTag = TAGS.find(t => t.id === ctx.st.tag);
    ctx.elements.lpTitle.textContent = foundTag ? '#' + foundTag.name : 'Tag';
  } else {
    ctx.elements.lpTitle.textContent = 'All notes';
  }

  ctx.elements.lpSub.textContent = `${arr.length} note${arr.length === 1 ? '' : 's'}`;
  ctx.elements.actFilter.classList.toggle('on', !!ctx.st.tag);

  if (!arr.length) {
    ctx.elements.lpScroll.innerHTML = `<div class="lp-empty">No notes here.${ctx.st.q || ctx.st.tag ? '<br><button data-clear="1">Clear filters</button>' : ''}</div>`;
    return;
  }

  if (ctx.st.view === 'grid') {
    renderGridView(ctx, arr);
  } else if (ctx.st.view === 'graph') {
    renderGraphView(ctx, arr);
  } else {
    ctx.elements.lpScroll.innerHTML = arr.map(n => {
      const nb = NBS.find(x => x.id === n.nb) || NBS[0];
      const tg = TAGS.find(x => x.id === n.tags[0]);
      return `<button class="note-card rv ${n.id === ctx.st.sel ? 'sel' : ''}" data-id="${n.id}">
        <div class="nc-top"><span class="nc-title">${esc(n.title) || 'Untitled'}</span>${n.pinned ? `<span class="nc-pin ic">${IC.pin}</span>` : ''}</div>
        <div class="nc-snip">${esc(strip(n.body)) || 'No additional text'}</div>
        <div class="nc-meta"><span>${n.date}</span><span class="nc-nb"><span class="dot" style="background:${nb.color}"></span>${nb.name}</span>${tg ? `<span class="nc-tag"><span class="dot" style="background:${tg.color}"></span>${tg.name}</span>` : ''}</div>
      </button>`;
    }).join('');
  }
}

export function initListEvents(ctx: AppContext) {
  ctx.elements.lpScroll.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-clear]')) {
      ctx.st.q = '';
      ctx.st.tag = null;
      ctx.elements.searchIn.value = '';
      ctx.renderSidebar();
      ctx.renderList();
      return;
    }
    const c = target.closest('.note-card') as HTMLElement;
    if (c) ctx.selectNote(c.dataset.id!);
  });

  ctx.elements.lpScroll.addEventListener('contextmenu', e => {
    const target = e.target as HTMLElement;
    const c = target.closest('.note-card') as HTMLElement;
    if (!c) return;
    e.preventDefault();
    const n = ctx.st.notes.find(x => x.id === c.dataset.id);
    if (n) {
      ctx.openFlyAt(e.clientX, e.clientY, noteItems(ctx, n));
    }
  });

  ctx.elements.actSort.addEventListener('click', () => ctx.openFly(ctx.elements.actSort, sortItems(ctx)));
  ctx.elements.actFilter.addEventListener('click', () => ctx.openFly(ctx.elements.actFilter, filterItems(ctx)));
  ctx.elements.newNoteBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', ctx.newNote);
  });
}
