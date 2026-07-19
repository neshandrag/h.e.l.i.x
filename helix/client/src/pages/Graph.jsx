import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import GraphView from '../components/GraphView';
import PageTransition from '../components/PageTransition';

export default function Graph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/graph'), api.get('/graph/gaps')]).then(([g, gap]) => {
      setGraph(g.data);
      setGaps(gap.data.gaps);
      setLoading(false);
    });
  }, []);

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-50">Relationship graph</h1>
        <p className="text-sm text-ink-400 mt-1">
          Skills, projects, certifications, and internships — connected, weighted, and decaying over time.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : (
        <>
          <GraphView nodes={graph.nodes} edges={graph.edges} />

          {gaps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-xl p-5 mt-6"
            >
              <h2 className="text-sm font-semibold text-amber-300 mb-2">Coverage gaps</h2>
              <ul className="flex flex-col gap-1.5">
                {gaps.map((g) => (
                  <li key={g.id} className="text-xs text-ink-300">
                    <span className="text-ink-50">{g.name}</span> ({g.type.toLowerCase()}) — exposure only,
                    depth score {g.depthScore.toFixed(1)}. Add a project or internship to strengthen this.
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </>
      )}
    </PageTransition>
  );
}
