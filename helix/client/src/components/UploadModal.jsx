import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function UploadModal({ open, onClose, onUploaded }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = useCallback(
    async (file) => {
      setError('');
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const { data } = await api.post('/documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onUploaded?.(data.document);
        setUploading(false);
        onClose();
      } catch (err) {
        setError(err.response?.data?.error ?? 'Upload failed');
        setUploading(false);
      }
    },
    [onUploaded, onClose]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleClose = () => {
    if (uploading) return;
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/40 backdrop-blur-sm px-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="capsule-panel w-full max-w-md p-8 relative shadow-[var(--shadow-glow)]"
          >
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 text-ink-400 hover:text-ink-50 text-sm transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-50 mb-1">
              Upload a Document
            </h2>
            <p className="text-xs text-ink-400 mb-6">Supported formats: PDF, DOCX, PNG, JPG.</p>

            <AnimatePresence mode="wait">
              {uploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 text-center"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    {[0, 0.15, 0.3].map((delay) => (
                      <motion.span
                        key={delay}
                        className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
                        animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-ink-200">Extracting, classifying, and embedding…</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`rounded-[var(--radius-capsule-lg)] border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                    dragging ? 'border-violet-500 bg-violet-500/5' : 'border-ink-600'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  />
                  <p className="text-sm text-ink-50 font-medium">Drag and drop a file here</p>
                  <p className="text-xs text-ink-400 mt-1">or click to browse</p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className="text-red-400 text-xs mt-4 text-center">{error}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
