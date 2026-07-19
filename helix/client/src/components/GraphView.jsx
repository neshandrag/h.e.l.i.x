import { useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

// Fixed to the app's brand tokens (violet-500, periwinkle-400, ink-400) — no color
// outside this palette is used anywhere in the graph.
const TIER_COLOR = {
  EXPOSURE: '#757c93',
  WORKING_KNOWLEDGE: '#7ba7fc',
  DEMONSTRATED_MASTERY: '#7c5cff',
};

const NODE_WIDTH = 190;
const NODE_HEIGHT = 68;

// Auto-layout with dagre, left-to-right — this mirrors the actual semantics
// of the edges (Certification -> Skill -> Project -> Internship), so the
// graph reads as a flow rather than a scattered grid, with generous spacing
// so labels and arrows never overlap a node.
function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 56, ranksep: 110, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      id: n.id,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { label: `${n.name}\n${n.depthTier.replace('_', ' ')}` },
      style: {
        background: '#12141f',
        color: '#e4e6ee',
        border: `1.5px solid ${TIER_COLOR[n.depthTier] ?? TIER_COLOR.EXPOSURE}`,
        borderRadius: 16,
        padding: 10,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'pre-line',
        textAlign: 'center',
        width: NODE_WIDTH,
        boxShadow: `0 0 18px -6px ${TIER_COLOR[n.depthTier] ?? TIER_COLOR.EXPOSURE}`,
      },
    };
  });
}

export default function GraphView({ nodes, edges }) {
  const flowNodes = useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);
  const flowEdges = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        label: e.type,
        animated: e.weight > 0.75,
        style: { stroke: '#7ba7fc', strokeWidth: Math.max(1, e.weight * 2) },
        labelStyle: { fill: '#bcc1d1', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#0c0e18', fillOpacity: 0.92 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#7ba7fc' },
      })),
    [edges]
  );

  return (
    <div className="h-[560px] overflow-hidden capsule-panel graph-canvas">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#1f2333" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
