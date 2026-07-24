import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const TIER_LABELS = {
  EXPOSURE: 'Exposure',
  WORKING_KNOWLEDGE: 'Working knowledge',
  DEMONSTRATED_MASTERY: 'Demonstrated mastery',
};

function Stat({ label, value }) {
  return (
    <div className="rounded-[14px] border border-ink-600 bg-ink-700/50 px-3.5 py-3 text-center">
      <p className="font-mono text-lg font-semibold tabular-nums text-ink-50">{value}</p>
      <p className="text-[11px] text-ink-400 mt-0.5">{label}</p>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-ink-600 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-ink-400 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-ink-50 text-right min-w-0">{children}</div>
    </div>
  );
}

export default function ProfileModal({ open, onClose }) {
  const { user: authUser, setUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [claimState, setClaimState] = useState('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data.user);
        setUsername(data.user.username ?? '');
        setUserProfile?.({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          githubUsername: data.user.githubUsername,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error ?? 'Could not load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, setUserProfile]);

  const claim = async () => {
    if (!username.trim()) return;
    setClaimState('loading');
    setError('');
    try {
      const { data } = await api.post('/public/username', { username: username.trim().toLowerCase() });
      setProfile((prev) => (prev ? { ...prev, username: data.username } : prev));
      setUsername(data.username);
      setUserProfile?.({
        id: profile?.id ?? authUser?.id,
        email: profile?.email ?? authUser?.email,
        username: data.username,
        githubUsername: profile?.githubUsername ?? authUser?.githubUsername,
      });
      setClaimState('done');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not claim that username');
      setClaimState('error');
    }
  };

  const shareUrl = profile?.username ? `${window.location.origin}/u/${profile.username}` : '';

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy link');
    }
  };

  const initial = (profile?.email || authUser?.email || '?').slice(0, 1).toUpperCase();

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
            className="capsule-panel w-full max-w-lg max-h-[88vh] overflow-y-auto p-7 relative shadow-[var(--shadow-glow)]"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-ink-400 hover:text-ink-50 text-sm transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-50 mb-5 pr-8">
              Your profile
            </h2>

            {loading && <p className="text-sm text-ink-400">Loading your identity…</p>}

            {!loading && profile && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center font-display text-lg font-bold text-violet-500">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-50 truncate">{profile.email}</p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {profile.username ? `@${profile.username}` : 'No public username yet'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <Stat label="Documents" value={profile.counts.documents} />
                  <Stat label="Entities" value={profile.counts.entities} />
                  <Stat label="Milestones" value={profile.counts.timelineEvents} />
                </div>

                <section>
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-1">
                    Account
                  </p>
                  <div className="rounded-[14px] border border-ink-600 px-3.5">
                    <Row label="Email">{profile.email}</Row>
                    <Row label="Member since">
                      {new Date(profile.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Row>
                    <Row label="GitHub">
                      {profile.githubUsername ? (
                        <a
                          href={`https://github.com/${profile.githubUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-500 hover:text-violet-400"
                        >
                          @{profile.githubUsername}
                        </a>
                      ) : (
                        <span className="text-ink-400">Not connected</span>
                      )}
                    </Row>
                    <Row label="Telegram">
                      {profile.telegramLinked ? (
                        <span className="text-violet-500">Linked</span>
                      ) : (
                        <span className="text-ink-400">Not linked</span>
                      )}
                    </Row>
                  </div>
                </section>

                <section>
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-2">
                    Public profile
                  </p>
                  {shareUrl && (
                    <div className="rounded-[14px] border border-ink-600 bg-ink-700/40 p-3.5 mb-3">
                      <p className="text-xs text-ink-400 mb-1.5">Shareable link</p>
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-sm text-violet-500 break-all hover:text-violet-400"
                      >
                        {shareUrl}
                      </a>
                      <div className="flex gap-2 mt-3">
                        <button onClick={copyLink} className="btn-glass text-[11px] px-3 py-1.5 rounded-full">
                          {copied ? 'Copied' : 'Copy link'}
                        </button>
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-glass text-[11px] px-3 py-1.5 rounded-full"
                        >
                          Open ↗
                        </a>
                      </div>
                    </div>
                  )}

                  {!profile.username && (
                    <div className="rounded-[14px] border border-ink-600 p-3.5">
                      <p className="text-xs text-ink-400 mb-3">
                        Claim a username to publish a read-only public page.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && claim()}
                          placeholder="your-username"
                          className="flex-1 bg-ink-700 border border-ink-600 rounded-full px-4 py-2 text-sm outline-none placeholder:text-ink-500 focus:border-violet-500"
                        />
                        <button
                          onClick={claim}
                          disabled={claimState === 'loading'}
                          className="btn-glass-primary text-xs px-4 py-2 rounded-full disabled:opacity-60 shrink-0"
                        >
                          {claimState === 'loading' ? 'Saving…' : 'Claim'}
                        </button>
                      </div>
                    </div>
                  )}

                  {profile.publicSummary && (
                    <p className="text-xs text-ink-400 leading-relaxed mt-3 border border-ink-600 rounded-[14px] p-3.5">
                      {profile.publicSummary}
                    </p>
                  )}
                </section>

                {profile.documentsByCategory?.length > 0 && (
                  <section>
                    <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-2">
                      Documents by category
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.documentsByCategory.map((row) => (
                        <span
                          key={row.category}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-ink-600 bg-ink-700/50 text-ink-50"
                        >
                          {row.category} · {row.count}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {profile.entitiesByType?.length > 0 && (
                  <section>
                    <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-2">
                      Entities by type
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.entitiesByType.map((row) => (
                        <span
                          key={row.type}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-ink-600 bg-ink-700/50 text-ink-50"
                        >
                          {row.type.replaceAll('_', ' ')} · {row.count}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {profile.topEntities?.length > 0 && (
                  <section>
                    <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-2">
                      Top skills & entities
                    </p>
                    <ul className="flex flex-col gap-2">
                      {profile.topEntities.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-3 rounded-[14px] border border-ink-600 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-ink-50 truncate">{e.name}</p>
                            <p className="text-[11px] text-ink-400">{e.type.replaceAll('_', ' ')}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] text-violet-500">
                              {TIER_LABELS[e.depthTier] ?? e.depthTier}
                            </p>
                            <p className="font-mono text-[11px] tabular-nums text-ink-400">
                              {Number(e.depthScore).toFixed(1)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {profile.recentDocuments?.length > 0 && (
                  <section>
                    <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500 mb-2">
                      Recent documents
                    </p>
                    <ul className="flex flex-col gap-2">
                      {profile.recentDocuments.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-3 rounded-[14px] border border-ink-600 px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-ink-50">{d.category ?? 'Uncategorized'}</p>
                            <p className="text-[11px] text-ink-400">
                              {d.sourceChannel?.replaceAll('_', ' ') ?? 'Upload'}
                              {d.needsReview ? ' · Needs review' : ''}
                            </p>
                          </div>
                          <span className="text-[11px] text-ink-400 shrink-0">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {error && <p className="text-red-400 text-[11px] mt-3">{error}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
