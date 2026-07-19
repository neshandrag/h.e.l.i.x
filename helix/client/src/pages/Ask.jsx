import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import PageTransition from '../components/PageTransition';

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
        <h1 className="text-2xl font-semibold text-ink-50">Ask your identity</h1>
        <p className="text-sm text-ink-400 mt-1">
          Natural-language retrieval over your documents and growth graph — evidence-based, not a plain file list.
        </p>
      </header>

      <div className="glass-panel rounded-2xl p-4 flex gap-2 mb-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="e.g. Am I ready for an ML internship?"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-400"
        />
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => ask()}
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-ink-950 text-sm font-medium px-4 py-2 disabled:opacity-60"
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
            className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-ink-300 hover:border-violet-400/40 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-panel rounded-2xl p-6"
          >
            <p className="text-sm text-ink-50 leading-relaxed">{result.answer}</p>

            {result.supportingDocuments?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-ink-400 mb-2">Supporting evidence</p>
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
