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

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    api
      .get('/documents')
      .then(({ data }) => setDocuments(data.documents))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const present = new Set(documents.map((d) => d.category ?? 'Uncategorized'));
    return ['All', ...Array.from(present)];
  }, [documents]);

  const filteredDocuments = useMemo(
    () =>
      activeCategory === 'All'
        ? documents
        : documents.filter((d) => (d.category ?? 'Uncategorized') === activeCategory),
    [documents, activeCategory]
  );

  return (
    <PageTransition>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold uppercase tracking-tight text-ink-100">
            Your Documents
          </h1>
          <p className="text-sm text-ink-400 mt-2">Organized, scored, and connected automatically.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {documents.length > 0 && (
            <CategoryFilterDropdown categories={categories} active={activeCategory} onChange={setActiveCategory} />
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setConnectOpen(true)}
            className="btn-glass shrink-0 rounded-full font-medium text-sm px-5 py-2.5"
          >
            Connect a source
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setModalOpen(true)}
            className="btn-glass-primary shrink-0 rounded-full font-medium text-sm px-5 py-2.5"
          >
            Upload a document
          </motion.button>
        </div>
      </header>

      <div className="glow-divider mb-8" />

      <UploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])}
      />
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />

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
              <DocumentCard
                key={doc.id}
                document={doc}
                onUpdated={(updated) =>
                  setDocuments((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))
                }
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </PageTransition>
  );
}
