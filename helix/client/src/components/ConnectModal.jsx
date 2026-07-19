import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

function TelegramConnect() {
  const [state, setState] = useState('idle'); // idle | loading | ready | error
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const getCode = async () => {
    setState('loading');
    setError('');
    try {
      const { data } = await api.post('/auth/telegram/link-code');
      setCode(data.code);
      setState('ready');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Telegram ingestion is not configured on this server.');
      setState('error');
    }
  };

  return (
    <div className="glass-panel rounded-[20px] p-5">
      <h3 className="text-sm font-medium text-ink-50 mb-1">Connect Telegram</h3>
      <p className="text-xs text-ink-400 mb-4">
        Forward certificates and documents to a bot and they'll be classified and added automatically.
      </p>

      {state === 'ready' ? (
        <div className="text-center">
          <p className="text-xs text-ink-400 mb-2">Send this to the Helix bot in Telegram:</p>
          <p className="font-mono text-lg tracking-widest text-periwinkle-400 mb-1">/link {code}</p>
          <p className="text-[11px] text-ink-500">Expires in 10 minutes</p>
        </div>
      ) : (
        <button
          onClick={getCode}
          disabled={state === 'loading'}
          className="btn-glass text-xs px-4 py-2 rounded-full disabled:opacity-60"
        >
          {state === 'loading' ? 'Generating…' : 'Generate link code'}
        </button>
      )}

      {error && <p className="text-red-400 text-[11px] mt-3">{error}</p>}
    </div>
  );
}

function GithubConnect() {
  const [username, setUsername] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const importProfile = async () => {
    if (!username.trim()) return;
    setState('loading');
    setError('');
    try {
      const { data } = await api.post('/documents/github-import', { username: username.trim() });
      setResult(data);
      setState('done');
    } catch (err) {
      setError(err.response?.data?.error ?? 'GitHub import is not configured on this server.');
      setState('error');
    }
  };

  return (
    <div className="glass-panel rounded-[20px] p-5">
      <h3 className="text-sm font-medium text-ink-50 mb-1">Import from GitHub</h3>
      <p className="text-xs text-ink-400 mb-4">
        Pulls your recent public repos — READMEs and language stats become skill/project evidence.
      </p>

      <div className="flex items-center gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && importProfile()}
          placeholder="GitHub username"
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm outline-none placeholder:text-ink-500 focus:border-violet-400/50"
        />
        <button
          onClick={importProfile}
          disabled={state === 'loading'}
          className="btn-glass-primary text-xs px-4 py-2 rounded-full disabled:opacity-60 shrink-0"
        >
          {state === 'loading' ? 'Importing…' : 'Import'}
        </button>
      </div>

      {state === 'done' && (
        <p className="text-[11px] text-ink-400 mt-3">
          Imported {result.imported.length} repo{result.imported.length === 1 ? '' : 's'}
          {result.skipped.length > 0 ? `, skipped ${result.skipped.length}` : ''}.
        </p>
      )}

      {error && <p className="text-red-400 text-[11px] mt-3">{error}</p>}
    </div>
  );
}

export default function ConnectModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onClose}
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
              onClick={onClose}
              className="absolute top-5 right-5 text-ink-400 hover:text-ink-50 text-sm transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-50 mb-1">
              Connect a Source
            </h2>
            <p className="text-xs text-ink-400 mb-6">Low-friction ingestion channels, in addition to manual upload.</p>

            <div className="flex flex-col gap-4">
              <TelegramConnect />
              <GithubConnect />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
