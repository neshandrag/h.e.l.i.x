import { motion } from 'framer-motion';

const CATEGORY_COLORS = {
  Projects: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30',
  Skills: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  Certifications: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  Internships: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  Achievements: 'bg-pink-400/15 text-pink-300 border-pink-400/30',
  Academics: 'bg-blue-400/15 text-blue-300 border-blue-400/30',
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
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
        />
      </div>
    </div>
  );
}

export default function DocumentCard({ document }) {
  const colorClass = CATEGORY_COLORS[document.category] ?? 'bg-ink-700 text-ink-200 border-white/10';

  return (
    <motion.a
      href={document.fileUrl}
      target="_blank"
      rel="noreferrer"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="glass-panel rounded-xl p-4 flex flex-col gap-3 hover:border-violet-400/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${colorClass}`}>
          {document.category ?? 'Uncategorized'}
        </span>
        {document.needsReview && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300">
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
    </motion.a>
  );
}
