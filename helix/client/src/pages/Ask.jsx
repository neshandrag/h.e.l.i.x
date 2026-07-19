import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import PageTransition from '../components/PageTransition';
import LoadingState from '../components/LoadingState';

const SUGGESTIONS = [
  'Show my AI projects',
  'Show my latest resume',
  'Am I ready for a Data Science internship?',
];

export default function Ask() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const ask = async (q) => {
    const value = q ?? question;
    if (!value.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/search/ask', { question: value });
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold uppercase tracking-tight text-ink-100">
          Ask Your Identity
        </h1>
        <p className="text-sm text-ink-400 mt-2">Ask anything. Get evidence-based answers.</p>
        <div className="glow-divider mt-6" />
      </header>

      <div className="glass-panel rounded-full pl-6 pr-2 py-2 flex items-center gap-2 mb-3 mt-6">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="e.g. Am I ready for an ML internship?"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-400"
        />
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => ask()}
          disabled={loading}
          className="btn-glass-primary rounded-full text-sm font-medium px-5 py-2.5 disabled:opacity-60"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
            className="btn-glass text-[11px] px-2.5 py-1 rounded-full"
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Reasoning over your evidence…" />}

      <AnimatePresence>
        {!loading && result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="capsule-panel p-7"
          >
            <p className="text-sm text-ink-50 leading-relaxed">{result.answer}</p>

            {result.supportingDocuments?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-ink-400 mb-2">Supporting Evidence</p>
                <div className="flex flex-col gap-1.5">
                  {result.supportingDocuments.map((d) => (
                    <a
                      key={d.id}
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-violet-300 hover:text-violet-200 truncate"
                    >
                      [{d.category}] similarity {(d.similarity * 100).toFixed(0)}% — view original ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
