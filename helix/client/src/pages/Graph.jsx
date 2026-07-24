import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import GraphView from '../components/GraphView';
import PageTransition from '../components/PageTransition';
import LoadingState from '../components/LoadingState';

const TYPE_COLORS = {
  skill: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  project: 'bg-periwinkle-400/30 text-violet-500 border-periwinkle-400/60',
  certification: 'bg-violet-500/10 text-violet-500 border-violet-500/25',
  internship: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  achievement: 'bg-periwinkle-400/40 text-violet-500 border-periwinkle-400/60',
  career_path: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
};

function GapRow({ gap, index }) {
  const typeClass = TYPE_COLORS[gap.type.toLowerCase()] ?? 'bg-ink-700 text-ink-400 border-ink-600';
  const score = Number(gap.depthScore) || 0;
  const nextPct = gap.nextPct ?? Math.min(100, Math.round((score / 2) * 100));
  const pointsToNext = gap.pointsToNext ?? Math.max(0, Number((2 - score).toFixed(1)));
  const evidence = gap.evidenceCount ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="capsule-panel p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-50 truncate">{gap.name}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">
            Weak evidence
            {evidence > 0 ? ` · ${evidence} source${evidence === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        <span className={`text-[10px] shrink-0 px-2.5 py-0.5 rounded-full border ${typeClass}`}>
          {gap.type.replaceAll('_', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] text-ink-400">Progress to working knowledge</span>
        <span className="font-mono text-[11px] tabular-nums text-ink-50">
          {score.toFixed(1)} <span className="text-ink-400">/ 2.0</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${nextPct}%` }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.04 + 0.08 }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
        />
      </div>

      <p className="text-xs text-ink-400">
        {pointsToNext > 0
          ? 'Add a related project or internship to strengthen this.'
          : 'Almost there — one more supporting document will deepen this.'}
      </p>
    </motion.div>
  );
}

function CoherenceModal({ open, onClose, coherence }) {
  if (!coherence) return null;
  const pct = Math.round((coherence.coherenceScore ?? 0) * 100);
  const label = pct >= 75 ? 'Strong path' : pct >= 45 ? 'Building path' : 'Early path';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/40 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="capsule-panel w-full max-w-lg max-h-[88vh] overflow-y-auto p-7 relative shadow-[var(--shadow-glow)]"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 text-ink-400 hover:text-ink-50 text-sm transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-50 mb-5 pr-8">
              Path Coherence
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative w-24 h-24 shrink-0 mx-auto sm:mx-0">
                <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-ink-600" />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-violet-500"
                    strokeDasharray={2 * Math.PI * 40}
                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - pct / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-lg font-semibold tabular-nums text-ink-50">{pct}%</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-500 mb-2">
                  {label}
                </span>
                <p className="text-sm text-ink-50 leading-relaxed">{coherence.narrative}</p>
              </div>
            </div>

            {(coherence.discontinuities?.length > 0 || coherence.inflectionPoints?.length > 0) && (
              <div className="grid grid-cols-1 gap-4 mt-5 pt-5 border-t border-ink-600">
                {coherence.discontinuities?.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink-400 mb-2">Gaps in the path</p>
                    <ul className="space-y-1.5">
                      {coherence.discontinuities.map((d) => (
                        <li key={d} className="text-xs text-ink-50 leading-relaxed pl-3 border-l-2 border-violet-500/40">
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {coherence.inflectionPoints?.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink-400 mb-2">Turning points</p>
                    <ul className="space-y-2">
                      {coherence.inflectionPoints.map((p) => (
                        <li key={`${p.date}-${p.description}`} className="text-xs">
                          <span className="font-mono text-violet-500">{p.date}</span>
                          <span className="text-ink-50 block mt-0.5 leading-relaxed">{p.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Graph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [gaps, setGaps] = useState([]);
  const [coherence, setCoherence] = useState(null);
  const [coherenceOpen, setCoherenceOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/graph'), api.get('/graph/gaps'), api.get('/graph/coherence')])
      .then(([g, gap, coh]) => {
        setGraph(g.data);
        setGaps(gap.data.gaps || []);
        setCoherence(coh.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const coherencePct = coherence ? Math.round((coherence.coherenceScore ?? 0) * 100) : null;

  return (
    <PageTransition>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold uppercase tracking-tight text-ink-100">
            Relationship Graph
          </h1>
          <p className="text-sm text-ink-400 mt-2">Your skills and achievements, connected.</p>
        </div>
        {!loading && coherence && (
          <button
            type="button"
            onClick={() => setCoherenceOpen(true)}
            className="btn-glass text-xs px-4 py-2 rounded-full inline-flex items-center gap-2"
          >
            Path Coherence
            <span className="font-mono tabular-nums text-violet-500">{coherencePct}%</span>
          </button>
        )}
      </header>
      <div className="glow-divider mb-6" />

      {loading ? (
        <LoadingState label="Building your relationship graph…" />
      ) : (
        <>
          <GraphView nodes={graph.nodes} edges={graph.edges} />

          {gaps.length > 0 && (
            <div className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-violet-500">
                    Coverage Gaps
                  </h2>
                  <p className="text-xs text-ink-400 mt-1">
                    Skills with only light proof so far. Strengthen them with a project or internship.
                  </p>
                </div>
                <span className="text-[11px] text-ink-400 tabular-nums">
                  {gaps.length} gap{gaps.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gaps.map((g, i) => (
                  <GapRow key={g.id} gap={g} index={i} />
                ))}
              </div>
            </div>
          )}

          <CoherenceModal
            open={coherenceOpen}
            onClose={() => setCoherenceOpen(false)}
            coherence={coherence}
          />
        </>
      )}
    </PageTransition>
  );
}
