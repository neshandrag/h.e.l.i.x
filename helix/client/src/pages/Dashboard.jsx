import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import UploadModal from '../components/UploadModal';
import ConnectModal from '../components/ConnectModal';
import DocumentCard from '../components/DocumentCard';
import CategoryFilterDropdown from '../components/CategoryFilterDropdown';
import PageTransition from '../components/PageTransition';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

function Stat({ label, value }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[14px] border border-ink-600 bg-white px-4 py-3.5 shadow-[var(--shadow-card)]"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-periwinkle-400" />
      <p className="pl-2 font-display text-2xl font-semibold tabular-nums tracking-tight text-ink-50">
        {value}
      </p>
      <p className="pl-2 text-[11px] text-ink-400 mt-1 tracking-wide">{label}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    api
      .get('/documents')
      .then(({ data }) => setDocuments(data.documents || []))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const present = new Set(documents.map((d) => d.category ?? 'Uncategorized'));
    return ['All', ...Array.from(present).sort()];
  }, [documents]);

  const filteredDocuments = useMemo(
    () =>
      activeCategory === 'All'
        ? documents
        : documents.filter((d) => (d.category ?? 'Uncategorized') === activeCategory),
    [documents, activeCategory]
  );

  const stats = useMemo(() => {
    const toPct = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return n > 1 ? n : n * 100;
    };
    const needsReview = documents.filter((d) => d.needsReview).length;
    const avgConf =
      documents.length === 0
        ? 0
        : Math.round(documents.reduce((s, d) => s + toPct(d.confidenceScore), 0) / documents.length);
    const avgVer =
      documents.length === 0
        ? 0
        : Math.round(documents.reduce((s, d) => s + toPct(d.verifiabilityScore), 0) / documents.length);
    return { total: documents.length, needsReview, avgConf, avgVer };
  }, [documents]);

  const upsertDocument = (doc) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx === -1) return [doc, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...doc, extractedText: doc.extractedText?.slice?.(0, 220) ?? next[idx].extractedText };
      return next;
    });
  };

  return (
    <PageTransition>
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold uppercase tracking-tight text-ink-100">
              Your Documents
            </h1>
            <p className="text-sm text-ink-400 mt-2">Organized, scored, and connected automatically.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {documents.length > 0 && (
              <CategoryFilterDropdown categories={categories} active={activeCategory} onChange={setActiveCategory} />
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setConnectOpen(true)}
              className="btn-glass shrink-0 rounded-full font-medium text-sm px-4 py-2.5"
            >
              Connect
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setModalOpen(true)}
              className="btn-glass-primary shrink-0 rounded-full font-medium text-sm px-4 py-2.5"
            >
              Upload
            </motion.button>
          </div>
        </div>

        {!loading && documents.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Stat label="Documents" value={stats.total} />
            <Stat label="Needs review" value={stats.needsReview} />
            <Stat label="Avg classification" value={`${stats.avgConf}%`} />
            <Stat label="Avg verifiability" value={`${stats.avgVer}%`} />
          </div>
        )}
      </header>

      <div className="glow-divider mb-8" />

      <UploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUploaded={(doc) => upsertDocument(doc)}
      />
      <ConnectModal
        open={connectOpen}
        onClose={() => {
          setConnectOpen(false);
          api.get('/documents').then(({ data }) => setDocuments(data.documents || []));
        }}
      />

      {loading ? (
        <LoadingState label="Loading your documents…" />
      ) : documents.length === 0 ? (
        <EmptyState label="No documents yet. Upload your first one to get started." />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState label="No documents in this category yet." />
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onUpdated={upsertDocument} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </PageTransition>
  );
}
