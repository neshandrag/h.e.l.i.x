import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import GraphView from '../components/GraphView';
import PageTransition from '../components/PageTransition';
import LoadingState from '../components/LoadingState';

// Same cool-spectrum palette as the document category badges — consistent
// across the whole app, no red/green/yellow.
const TYPE_COLORS = {
  skill: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  project: 'bg-periwinkle-400/15 text-periwinkle-400 border-periwinkle-400/30',
  certification: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
  internship: 'bg-indigo-400/15 text-indigo-300 border-indigo-400/30',
  achievement: 'bg-blue-400/15 text-blue-300 border-blue-400/30',
};

// Working Knowledge tier starts at depth score 2 (see scoring.service.js) —
// the meter shows progress toward that threshold.
const NEXT_TIER_SCORE = 2;

function GapRow({ gap, index }) {
  const pct = Math.min(100, Math.round((gap.depthScore / NEXT_TIER_SCORE) * 100));
  const typeClass = TYPE_COLORS[gap.type.toLowerCase()] ?? 'bg-ink-600/40 text-ink-200 border-white/15';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-panel rounded-[20px] p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-sm font-medium text-ink-50">{gap.name}</span>
        <span className={`text-[10px] shrink-0 px-2.5 py-0.5 rounded-full border ${typeClass}`}>{gap.type}</span>
      </div>

      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-1.5 flex-1 rounded-full bg-ink-700 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 + 0.1 }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
          />
        </div>
        <span className="text-[11px] text-ink-400 shrink-0">Depth {gap.depthScore.toFixed(1)}</span>
      </div>

      <p className="text-xs text-ink-400">Add a related project or internship to strengthen this.</p>
    </motion.div>
  );
}

function CoherencePanel({ coherence }) {
  if (!coherence) return null;
  const pct = Math.round(coherence.coherenceScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-[20px] p-5 mb-8"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-periwinkle-400">
          Path Coherence
        </h2>
        <span className="text-xs text-ink-300">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
        />
      </div>
      <p className="text-xs text-ink-400 mb-2">{coherence.narrative}</p>
      {coherence.discontinuities?.length > 0 && (
        <ul className="text-xs text-ink-400 list-disc list-inside space-y-1">
          {coherence.discontinuities.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export default function Graph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [gaps, setGaps] = useState([]);
  const [coherence, setCoherence] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/graph'), api.get('/graph/gaps'), api.get('/graph/coherence')]).then(
      ([g, gap, coh]) => {
        setGraph(g.data);
        setGaps(gap.data.gaps);
        setCoherence(coh.data);
        setLoading(false);
      }
    );
  }, []);

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold uppercase tracking-tight text-ink-100">
          Relationship Graph
        </h1>
        <p className="text-sm text-ink-400 mt-2">Your skills and achievements, connected.</p>
        <div className="glow-divider mt-6" />
      </header>

      {loading ? (
        <LoadingState label="Building your relationship graph…" />
      ) : (
        <>
          <CoherencePanel coherence={coherence} />
          <GraphView nodes={graph.nodes} edges={graph.edges} />

          {gaps.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-periwinkle-400 mb-1">
                Coverage Gaps
              </h2>
              <p className="text-xs text-ink-400 mb-4">
                These have exposure-level evidence only — add corroborating work to deepen them.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gaps.map((g, i) => (
                  <GapRow key={g.id} gap={g} index={i} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
