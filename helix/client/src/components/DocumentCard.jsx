import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';

const CATEGORY_COLORS = {
  Projects: 'bg-periwinkle-400/30 text-violet-500 border-periwinkle-400/60',
  Skills: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  Certifications: 'bg-violet-500/10 text-violet-500 border-violet-500/25',
  Internships: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  Achievements: 'bg-periwinkle-400/40 text-violet-500 border-periwinkle-400/60',
  Academics: 'bg-ink-700 text-ink-400 border-ink-600',
};

const SOURCE_LABEL = {
  MANUAL_UPLOAD: 'Upload',
  GITHUB: 'GitHub',
  TELEGRAM: 'Telegram',
  EMAIL: 'Email',
};

const PREFERRED_PHRASES = [
  /to whomsoever it may concern/i,
  /this is to certify/i,
  /certificate of/i,
  /has successfully completed/i,
  /internship/i,
  /offer letter/i,
  /project report/i,
  /repository:/i,
];

function toPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const pct = n > 1 ? n : n * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function ScoreMeter({ label, value }) {
  const pct = toPercent(value);
  const tone = pct >= 70 ? 'text-violet-500' : pct >= 40 ? 'text-ink-50' : 'text-ink-400';

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide text-ink-400">{label}</span>
        <span className={`text-[11px] font-mono font-semibold tabular-nums ${tone}`}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
        />
      </div>
    </div>
  );
}

function readabilityScore(text) {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const words = text.split(/\s+/).filter(Boolean);
  const letterRatio = letters / Math.max(1, text.length);
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(1, words.length);
  let score = letterRatio * 40 + Math.min(words.length, 18) * 2;

  if (avgWordLen >= 3 && avgWordLen <= 10) score += 12;
  if (/www\.|https?:\/\/|\.com\b/i.test(text)) score -= 25;
  if (/=|™|�/.test(text)) score -= 15;
  if (PREFERRED_PHRASES.some((re) => re.test(text))) score += 35;
  const weirdTokens = words.filter((w) => w.length <= 2 || /[^A-Za-z']/.test(w)).length;
  score -= weirdTokens * 1.5;

  return score;
}

function cleanPreviewText(raw, category) {
  if (!raw?.trim()) {
    return category ? `${category} document` : 'No preview available.';
  }

  const normalized = raw
    .replace(/\u0000/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const chunks = normalized
    .split(/(?<=[.!?])\s+|(?=\bTO WHOMSOEVER\b)|(?=\bThis is to certify\b)/i)
    .map((c) => c.trim())
    .filter((c) => c.length >= 20);

  const candidates = chunks.length > 0 ? chunks : [normalized];
  const best = [...candidates].sort((a, b) => readabilityScore(b) - readabilityScore(a))[0];

  if (!best || readabilityScore(best) < 18) {
    return category ? `${category} document` : 'Document uploaded — open original to view.';
  }

  const sentence = best.replace(/\s+/g, ' ').trim();
  return sentence.length > 130 ? `${sentence.slice(0, 127).trim()}…` : sentence;
}

export default function DocumentCard({ document, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const colorClass = CATEGORY_COLORS[document.category] ?? 'bg-ink-700 text-ink-400 border-ink-600';
  const preview = cleanPreviewText(document.extractedText, document.category);
  const source = SOURCE_LABEL[document.sourceChannel] ?? 'Upload';
  const when = document.documentDate || document.createdAt;

  const reclassify = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/documents/${document.id}/reclassify`);
      onUpdated?.(data.document);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not reclassify');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="capsule-panel p-5 flex flex-col gap-3.5 h-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${colorClass}`}>
            {document.category ?? 'Uncategorized'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-ink-600 text-ink-400">
            {source}
          </span>
          {document.needsReview && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-500/35 text-violet-500">
              Needs review
            </span>
          )}
        </div>
        <time className="text-[10px] text-ink-400 shrink-0 tabular-nums">
          {when
            ? new Date(when).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : ''}
        </time>
      </div>

      <p className="text-xs text-ink-300 leading-relaxed line-clamp-3 flex-1">{preview}</p>

      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-ink-600">
        <ScoreMeter label="Classification" value={document.confidenceScore} />
        <ScoreMeter label="Verifiability" value={document.verifiabilityScore} />
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors"
        >
          View original ↗
        </a>
        {document.needsReview && (
          <button
            type="button"
            onClick={reclassify}
            disabled={busy}
            className="btn-glass text-[10px] px-2.5 py-1 rounded-full disabled:opacity-60"
          >
            {busy ? 'Classifying…' : 'Reclassify'}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-[11px]">{error}</p>}
    </motion.div>
  );
}
