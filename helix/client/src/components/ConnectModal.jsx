import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

const MAX_SELECT = 10;

function GithubConnect() {
  const [username, setUsername] = useState('');
  const [step, setStep] = useState('username'); // username | pick | done
  const [repos, setRepos] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadRepos = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.get('/documents/github-repos', {
        params: { username: username.trim() },
      });
      setRepos(data.repos || []);
      setSelected(new Set());
      setStep('pick');
      if (!data.repos?.length) {
        setError('No public non-fork repositories found for that user.');
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not load GitHub repositories.');
      setStep('username');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < MAX_SELECT) {
        next.add(name);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(repos.slice(0, MAX_SELECT).map((r) => r.name)));
  };

  const clearSelection = () => setSelected(new Set());

  const importSelected = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setError('');
    try {
      const { data } = await api.post('/documents/github-import', {
        username: username.trim(),
        repos: [...selected],
      });
      setResult(data);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error ?? 'GitHub import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {step === 'username' && (
        <>
          <p className="text-xs text-ink-400 mb-4">
            Enter your GitHub username, then choose which public repos to add as evidence.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadRepos()}
              placeholder="GitHub username"
              className="flex-1 bg-ink-700 border border-ink-600 rounded-full px-4 py-2 text-sm outline-none placeholder:text-ink-500 focus:border-violet-500"
            />
            <button
              onClick={loadRepos}
              disabled={loading || !username.trim()}
              className="btn-glass-primary text-xs px-4 py-2 rounded-full disabled:opacity-60 shrink-0"
            >
              {loading ? 'Loading…' : 'Find repos'}
            </button>
          </div>
        </>
      )}

      {step === 'pick' && (
        <>
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs text-ink-400">
              @{username.trim()} · select up to {MAX_SELECT}
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('username');
                setRepos([]);
                setSelected(new Set());
              }}
              className="text-[11px] text-violet-500 hover:text-violet-400"
            >
              Change user
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button type="button" onClick={selectAllVisible} className="btn-glass text-[11px] px-2.5 py-1 rounded-full">
              Select first {Math.min(repos.length, MAX_SELECT)}
            </button>
            <button type="button" onClick={clearSelection} className="btn-glass text-[11px] px-2.5 py-1 rounded-full">
              Clear
            </button>
          </div>

          <ul className="max-h-56 overflow-y-auto flex flex-col gap-1.5 mb-4 pr-1">
            {repos.map((repo) => {
              const checked = selected.has(repo.name);
              const disabled = !checked && selected.size >= MAX_SELECT;
              return (
                <li key={repo.name}>
                  <label
                    className={`flex items-start gap-3 rounded-[12px] border px-3 py-2.5 cursor-pointer transition-colors ${
                      checked
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : disabled
                          ? 'border-ink-600 opacity-50 cursor-not-allowed'
                          : 'border-ink-600 hover:border-ink-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(repo.name)}
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink-50 truncate">{repo.name}</span>
                      <span className="block text-[11px] text-ink-400 mt-0.5 line-clamp-2">
                        {repo.description || 'No description'}
                        {repo.language ? ` · ${repo.language}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            onClick={importSelected}
            disabled={importing || selected.size === 0}
            className="btn-glass-primary w-full text-xs px-4 py-2.5 rounded-full disabled:opacity-60"
          >
            {importing
              ? `Importing ${selected.size}…`
              : `Import ${selected.size || 0} selected`}
          </button>
        </>
      )}

      {step === 'done' && result && (
        <div className="rounded-[14px] border border-ink-600 bg-ink-700/40 p-4">
          <p className="text-sm text-ink-50 mb-1">Import complete</p>
          <p className="text-[11px] text-ink-400">
            Imported {result.imported.length} repo{result.imported.length === 1 ? '' : 's'}
            {result.skipped.length > 0 ? `, skipped ${result.skipped.length}` : ''}.
          </p>
          {result.imported.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {result.imported.map((row) => (
                <li key={row.documentId} className="text-[11px] text-ink-400">
                  <span className="text-ink-50">{row.repo}</span>
                  {row.category ? ` · ${row.category}` : ''}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setStep('pick');
              setResult(null);
            }}
            className="btn-glass text-[11px] px-3 py-1.5 rounded-full mt-4"
          >
            Import more
          </button>
        </div>
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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/40 backdrop-blur-sm px-4"
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
              Import from GitHub
            </h2>
            <p className="text-xs text-ink-400 mb-6">Pick the repositories you want as evidence.</p>

            <GithubConnect />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
