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

const TIER_LABELS = {
  EXPOSURE: 'Exposure',
  WORKING_KNOWLEDGE: 'Working knowledge',
  DEMONSTRATED_MASTERY: 'Demonstrated mastery',
};

/** Turn a dumped LLM string into aligned paragraphs / lists. */
function AnswerBody({ text }) {
  const blocks = [];
  const lines = (text || '').replace(/\r\n/g, '\n').trim().split('\n');
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: 'p', text: paragraph.join(' ').trim() });
    paragraph = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) return;
    blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    const heading = line.match(/^\*\*(.+?)\*\*:?\s*$|^([A-Z][A-Za-z /]{2,40}):\s*$/);

    if (bullet || numbered) {
      flushParagraph();
      if (!list) list = { type: numbered ? 'ol' : 'ul', items: [] };
      list.items.push((bullet || numbered)[1].replace(/\*\*(.+?)\*\*/g, '$1'));
      continue;
    }

    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h', text: (heading[1] || heading[2]).replace(/\*\*/g, '') });
      continue;
    }

    flushList();
    paragraph.push(line.replace(/\*\*(.+?)\*\*/g, '$1'));
  }

  flushParagraph();
  flushList();

  if (blocks.length === 0) {
    return <p className="text-sm text-ink-50 leading-relaxed">{text}</p>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {blocks.map((block, i) => {
        if (block.type === 'h') {
          return (
            <h3
              key={i}
              className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 pt-1"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const Tag = block.type;
          return (
            <Tag
              key={i}
              className={`text-sm text-ink-50 leading-relaxed space-y-1.5 pl-5 ${
                block.type === 'ul' ? 'list-disc' : 'list-decimal'
              }`}
            >
              {block.items.map((item, j) => (
                <li key={j} className="pl-1">
                  {item}
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="text-sm text-ink-50 leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

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
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-500"
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
            className="flex flex-col gap-5"
          >
            <section className="capsule-panel p-7">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-4">
                Answer
              </p>
              <AnswerBody text={result.answer} />
            </section>

            {result.supportingDocuments?.length > 0 && (
              <section className="capsule-panel p-7">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-4">
                  Supporting evidence
                </p>
                <ul className="flex flex-col gap-3">
                  {result.supportingDocuments.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-4 border-b border-ink-600 last:border-0 pb-3 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink-50 font-medium">{d.category ?? 'Document'}</p>
                        <p className="text-xs text-ink-400 mt-0.5 line-clamp-2">
                          {(d.extractedText || '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Open original for details'}
                          {(d.extractedText || '').length > 120 ? '…' : ''}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className="font-mono text-[11px] tabular-nums text-ink-400">
                          {Math.round((d.similarity ?? 0) * 100)}% match
                        </span>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-violet-500 hover:text-violet-400"
                        >
                          View original ↗
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.supportingEntities?.length > 0 && (
              <section className="capsule-panel p-7">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-4">
                  Related skills & entities
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {result.supportingEntities.slice(0, 8).map((e) => (
                    <div
                      key={`${e.type}-${e.name}`}
                      className="flex items-center justify-between gap-3 rounded-[14px] border border-ink-600 bg-ink-700/60 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink-50 truncate">{e.name}</p>
                        <p className="text-[11px] text-ink-400">{e.type.replace('_', ' ')}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-violet-500">
                        {TIER_LABELS[e.depthTier] ?? e.depthTier}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
