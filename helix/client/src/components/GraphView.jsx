import { useMemo, useEffect, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useNodesInitialized,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

const TIER_COLOR = {
  EXPOSURE: '#AAAAAA',
  WORKING_KNOWLEDGE: '#38B673',
  DEMONSTRATED_MASTERY: '#2ECC71',
};

const TIER_LABEL = {
  EXPOSURE: 'Exposure',
  WORKING_KNOWLEDGE: 'Working knowledge',
  DEMONSTRATED_MASTERY: 'Mastery',
};

const TYPE_ORDER = {
  CERTIFICATION: 0,
  SKILL: 1,
  PROJECT: 2,
  INTERNSHIP: 3,
  ACHIEVEMENT: 4,
  CAREER_PATH: 5,
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 68;

function GraphNode({ data }) {
  const accent = TIER_COLOR[data.depthTier] ?? TIER_COLOR.EXPOSURE;
  return (
    <div
      className="rounded-[14px] bg-white px-3 py-2.5 text-center shadow-[0_8px_24px_-12px_rgba(31,31,31,0.14)]"
      style={{
        width: NODE_WIDTH,
        border: `1.5px solid ${accent}`,
        borderTopWidth: 3,
        borderTopColor: accent,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-2 !h-2" />
      <p className="text-[12px] font-medium text-ink-50 leading-snug line-clamp-2">{data.name}</p>
      <p className="text-[10px] text-ink-400 mt-1 tracking-wide">
        {data.typeLabel}
        <span className="mx-1 text-ink-600">·</span>
        {TIER_LABEL[data.depthTier] ?? data.depthTier}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { helix: GraphNode };

function formatEdgeLabel(type) {
  if (!type) return '';
  return String(type).replaceAll('_', ' ').toLowerCase();
}

/** Merge duplicate A→B edges so lines don’t stack on the same path. */
function consolidateEdges(edges) {
  const map = new Map();
  for (const e of edges) {
    if (!e.source || !e.target || e.source === e.target) continue;
    const key = `${e.source}::${e.target}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: e.id || key,
        source: e.source,
        target: e.target,
        weight: e.weight ?? 1,
        labels: [formatEdgeLabel(e.type)],
      });
    } else {
      existing.weight = Math.max(existing.weight, e.weight ?? 1);
      const label = formatEdgeLabel(e.type);
      if (label && !existing.labels.includes(label)) existing.labels.push(label);
    }
  }
  return [...map.values()];
}

/** Fan out edges that share an undirected pair so reverse links don’t overlap. */
function withLaneOffsets(edges) {
  const groups = new Map();
  for (const e of edges) {
    const undirected = [e.source, e.target].sort().join('::');
    if (!groups.has(undirected)) groups.set(undirected, []);
    groups.get(undirected).push(e);
  }

  const result = [];
  for (const group of groups.values()) {
    const n = group.length;
    group.forEach((e, i) => {
      const lane = n === 1 ? 0 : i - (n - 1) / 2;
      result.push({ ...e, lane });
    });
  }
  return result;
}

function OffsetSmoothStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  data,
}) {
  const offset = (data?.lane ?? 0) * 28;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sourceX + offset,
    sourceY,
    targetX: targetX + offset,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
    offset: 28 + Math.abs(offset),
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute text-[9px] font-semibold uppercase tracking-wide text-ink-400 bg-white/95 border border-ink-600 px-1.5 py-0.5 rounded-md"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = { offsetSmooth: OffsetSmoothStepEdge };

function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    nodesep: 56,
    ranksep: 88,
    edgesep: 40,
    marginx: 28,
    marginy: 28,
    ranker: 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  const sorted = [...nodes].sort(
    (a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) || a.name.localeCompare(b.name)
  );

  sorted.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));

  edges.forEach((e) => {
    if (!g.hasNode(e.source) || !g.hasNode(e.target)) return;
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    const minlen = Math.max(
      1,
      Math.abs((TYPE_ORDER[tgt?.type] ?? 0) - (TYPE_ORDER[src?.type] ?? 0))
    );
    g.setEdge(e.source, e.target, { minlen, weight: Math.max(0.1, e.weight ?? 1) });
  });

  dagre.layout(g);

  const placed = sorted.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'helix',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        name: n.name,
        depthTier: n.depthTier,
        typeLabel: String(n.type || '').replaceAll('_', ' ').toLowerCase(),
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  // Nudge nodes that still sit too close in the same horizontal band.
  const byY = [...placed].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  for (let i = 1; i < byY.length; i += 1) {
    const prev = byY[i - 1];
    const cur = byY[i];
    const sameBand = Math.abs(cur.position.y - prev.position.y) < NODE_HEIGHT * 0.6;
    if (sameBand && cur.position.x - prev.position.x < NODE_WIDTH + 28) {
      cur.position.x = prev.position.x + NODE_WIDTH + 36;
    }
  }

  return byY;
}

function FitViewOnce() {
  const ready = useNodesInitialized();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!ready) return undefined;
    const id = requestAnimationFrame(() => fitView({ padding: 0.18, duration: 220 }));
    return () => cancelAnimationFrame(id);
  }, [ready, fitView]);

  return null;
}

function GraphCanvas({ nodes, edges }) {
  const consolidated = useMemo(() => withLaneOffsets(consolidateEdges(edges)), [edges]);
  const flowNodes = useMemo(() => layoutGraph(nodes, consolidated), [nodes, consolidated]);
  const flowEdges = useMemo(
    () =>
      consolidated.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'offsetSmooth',
        label: e.labels.filter(Boolean).join(' · '),
        data: { lane: e.lane },
        animated: e.weight > 1.25,
        style: {
          stroke: '#2ECC71',
          strokeWidth: Math.min(2.8, 1.2 + e.weight * 0.5),
          opacity: 0.85,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2ECC71', width: 18, height: 18 },
      })),
    [consolidated]
  );

  return (
    <div className="h-[420px] overflow-hidden capsule-panel graph-canvas">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable
        elementsSelectable={false}
        panOnScroll
        minZoom={0.25}
        maxZoom={1.6}
        defaultEdgeOptions={{ type: 'offsetSmooth' }}
      >
        <Background color="#E4DFD4" gap={22} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
        <FitViewOnce />
      </ReactFlow>
    </div>
  );
}

function GraphViewInner({ nodes, edges }) {
  if (!nodes?.length) {
    return (
      <div className="h-[420px] flex items-center justify-center capsule-panel text-sm text-ink-400">
        No entities yet — upload documents to build your graph.
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <GraphCanvas nodes={nodes} edges={edges || []} />
    </ReactFlowProvider>
  );
}

export default memo(GraphViewInner);
