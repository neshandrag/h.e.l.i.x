import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';

// Cool-spectrum palette only (violet/blue family), consistent with the
// app's brand colors — no red, green, or yellow accents.
const CATEGORY_COLORS = {
  Projects: 'bg-periwinkle-400/15 text-periwinkle-400 border-periwinkle-400/30',
  Skills: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  Certifications: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
  Internships: 'bg-indigo-400/15 text-indigo-300 border-indigo-400/30',
  Achievements: 'bg-blue-400/15 text-blue-300 border-blue-400/30',
  Academics: 'bg-ink-600/40 text-ink-200 border-white/15',
};

function ScoreBar({ label, value }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-400 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
        />
      </div>
    </div>
  );
}

export default function DocumentCard({ document, onUpdated }) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const colorClass = CATEGORY_COLORS[document.category] ?? 'bg-ink-700 text-ink-200 border-white/10';

  const retryClassification = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRetrying(true);
    setRetryError('');
    try {
      const { data } = await api.post(`/documents/${document.id}/reclassify`);
      onUpdated?.(data.document);
    } catch (err) {
      setRetryError(err.response?.data?.error ?? 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="capsule-panel p-6 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${colorClass}`}>
          {document.category ?? 'Uncategorized'}
        </span>
        {document.needsReview && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-periwinkle-400/40 text-periwinkle-400 shrink-0">
            Needs review
          </span>
        )}
      </div>

      <p className="text-xs text-ink-400 line-clamp-2">
        {document.extractedText?.slice(0, 140) || 'No preview available.'}
      </p>

      <div className="flex flex-col gap-2 mt-1">
        <ScoreBar label="Verifiability" value={document.verifiabilityScore} />
        <ScoreBar label="Classification confidence" value={document.confidenceScore} />
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-violet-300 hover:text-violet-200 transition-colors"
        >
          View original ↗
        </a>

        {document.needsReview && (
          <button
            onClick={retryClassification}
            disabled={retrying}
            className="btn-glass text-[11px] px-3 py-1 rounded-full disabled:opacity-60"
          >
            {retrying ? 'Retrying…' : 'Retry classification'}
          </button>
        )}
      </div>

      {retryError && <p className="text-red-400 text-[11px]">{retryError}</p>}
    </motion.div>
  );
}
