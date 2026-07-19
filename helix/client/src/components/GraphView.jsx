import { useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

const TIER_COLOR = {
  EXPOSURE: '#6b7186',
  WORKING_KNOWLEDGE: '#22d3ee',
  DEMONSTRATED_MASTERY: '#7c5cff',
};

function layoutNodes(nodes) {
  const perRow = 4;
  return nodes.map((n, i) => ({
    id: n.id,
    position: { x: (i % perRow) * 220, y: Math.floor(i / perRow) * 140 },
    data: { label: `${n.name}\n${n.depthTier.replace('_', ' ')}` },
    style: {
      background: '#12141f',
      color: '#f4f5f9',
      border: `1.5px solid ${TIER_COLOR[n.depthTier] ?? '#6b7186'}`,
      borderRadius: 12,
      padding: 10,
      fontSize: 12,
      whiteSpace: 'pre-line',
      textAlign: 'center',
      width: 180,
    },
  }));
}

export default function GraphView({ nodes, edges }) {
  const flowNodes = useMemo(() => layoutNodes(nodes), [nodes]);
  const flowEdges = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type,
        animated: e.weight > 0.75,
        style: { stroke: '#7c5cff', strokeWidth: Math.max(1, e.weight * 2) },
        labelStyle: { fill: '#b7bccb', fontSize: 10 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#7c5cff' },
      })),
    [edges]
  );

  return (
    <div className="h-[560px] rounded-2xl overflow-hidden glass-panel">
      <ReactFlow nodes={flowNodes} edges={flowEdges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#262a3c" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
