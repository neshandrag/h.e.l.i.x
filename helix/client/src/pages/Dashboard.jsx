import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import UploadDropzone from '../components/UploadDropzone';
import DocumentCard from '../components/DocumentCard';
import PageTransition from '../components/PageTransition';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/documents')
      .then(({ data }) => setDocuments(data.documents))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-50">Your documents</h1>
        <p className="text-sm text-ink-400 mt-1">
          Every upload is auto-categorized, scored, and linked into your growth graph.
        </p>
      </header>

      <div className="mb-8">
        <UploadDropzone onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])} />
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-ink-400">No documents yet — upload your first one above.</p>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </PageTransition>
  );
}
