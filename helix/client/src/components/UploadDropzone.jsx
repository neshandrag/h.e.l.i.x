import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function UploadDropzone({ onUploaded }) {
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
      } catch (err) {
        setError(err.response?.data?.error ?? 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      animate={{ borderColor: dragging ? 'rgba(124,92,255,0.8)' : 'rgba(255,255,255,0.12)' }}
      className="glass-panel rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />

      <AnimatePresence mode="wait">
        {uploading ? (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-violet-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            />
            <p className="text-sm text-ink-200">Extracting, classifying, and embedding…</p>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-3xl mb-2">📎</p>
            <p className="text-sm text-ink-50 font-medium">Drop a certificate, resume, or report here</p>
            <p className="text-xs text-ink-400 mt-1">PDF, DOCX, PNG, JPG — auto-categorized on upload</p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </motion.div>
  );
}
