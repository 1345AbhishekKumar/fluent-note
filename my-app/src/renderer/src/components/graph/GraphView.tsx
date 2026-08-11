import React, { useEffect, useRef } from 'react';
import * as d3Force from 'd3-force';
import * as d3Zoom from 'd3-zoom';
import * as d3Selection from 'd3-selection';
import type { Note } from '../../../../shared/schemas';

interface GraphNode extends d3Force.SimulationNodeDatum {
  id: string;
  title: string;
  nb: string;
}

interface GraphLink extends d3Force.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphViewProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  theme?: 'light' | 'dark';
}

export const GraphView: React.FC<GraphViewProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  theme = 'dark'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 500;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Build nodes & title lookup map
    const titleToIdMap = new Map<string, string>();
    const graphNodes: GraphNode[] = notes.map((n) => {
      titleToIdMap.set((n.title || '').toLowerCase().trim(), n.id);
      return { id: n.id, title: n.title || 'Untitled', nb: n.nb };
    });

    const graphLinks: GraphLink[] = [];
    notes.forEach((n) => {
      const body = n.body || '';
      const matches = body.matchAll(/\[\[(.*?)\]\]/g);
      for (const match of matches) {
        if (match[1]) {
          const targetTitleLower = match[1].trim().toLowerCase();
          const targetId = titleToIdMap.get(targetTitleLower);
          if (targetId && targetId !== n.id) {
            graphLinks.push({ source: n.id, target: targetId });
          }
        }
      }
    });

    // Setup d3 force simulation
    const simulation = d3Force
      .forceSimulation<GraphNode>(graphNodes)
      .force('link', d3Force.forceLink<GraphNode, GraphLink>(graphLinks).id((d) => d.id).distance(90))
      .force('charge', d3Force.forceManyBody().strength(-200))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('collide', d3Force.forceCollide(24));

    let transform = d3Zoom.zoomIdentity;

    const render = () => {
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      const isDark = theme === 'dark';
      const edgeColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
      const nodeColor = isDark ? '#60cdff' : '#0067c0';
      const selectedColor = '#ffb900';
      const textColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';

      // Draw edges
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 1.5;
      graphLinks.forEach((link) => {
        const s = link.source as GraphNode;
        const t = link.target as GraphNode;
        if (s.x != null && s.y != null && t.x != null && t.y != null) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      graphNodes.forEach((node) => {
        if (node.x == null || node.y == null) return;
        const isSelected = node.id === selectedNoteId;
        const radius = isSelected ? 8 : 5;

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? selectedColor : nodeColor;
        ctx.fill();
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
        ctx.stroke();

        // Draw title label
        ctx.font = '11px sans-serif';
        ctx.fillStyle = textColor;
        ctx.fillText(node.title, node.x + 10, node.y + 4);
      });

      ctx.restore();
    };

    simulation.on('tick', render);

    // Click handler for node selection
    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (event.clientX - rect.left - transform.x) / transform.k;
      const clickY = (event.clientY - rect.top - transform.y) / transform.k;

      for (const node of graphNodes) {
        if (node.x != null && node.y != null) {
          const dx = clickX - node.x;
          const dy = clickY - node.y;
          if (dx * dx + dy * dy <= 100) {
            onSelectNote(node.id);
            break;
          }
        }
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      simulation.stop();
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [notes, selectedNoteId, theme, onSelectNote]);

  return (
    <div className="graph-view-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }}
      />
    </div>
  );
};
