import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import DocumentCard from '../components/DocumentCard';
import PageTransition from '../components/PageTransition';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

const SUGGESTIONS = ['my certificates', 'AI projects', 'internship documents', 'latest resume'];

// Module 5, standard path (plan.md Section 6): "show all my certificates" /
// "show my AI projects" — plain semantic search over documents, originals
// always one click away. Complements Ask.jsx's advisory GraphRAG path.
export default function Search() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const runSearch = async (q = query) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/search', { query: q, limit: 12 });
      setResults(data.results);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="glass-panel rounded-full pl-6 pr-2 py-2 flex items-center gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="e.g. AI projects, React internship, AWS certification"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-500"
        />
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => runSearch()}
          disabled={loading}
          className="btn-glass-primary rounded-full text-sm font-medium px-5 py-2.5 disabled:opacity-60 shrink-0"
        >
          {loading ? 'Searching…' : 'Search'}
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => runSearch(s)}
            className="btn-glass text-[11px] px-3 py-1.5 rounded-full text-ink-400 hover:text-ink-50"
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

      {loading && <LoadingState label="Searching your documents…" />}

      {!loading && searched && results.length === 0 && (
        <EmptyState label="No matching documents found." />
      )}

      {!loading && results.length > 0 && (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {results.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </PageTransition>
  );
}
