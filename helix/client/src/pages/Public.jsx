import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import HelixMark from '../components/HelixMark';

const TYPE_COLORS = {
  SKILL: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  PROJECT: 'bg-periwinkle-400/30 text-violet-500 border-periwinkle-400/60',
  CERTIFICATION: 'bg-violet-500/10 text-violet-500 border-violet-500/25',
  INTERNSHIP: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  ACHIEVEMENT: 'bg-periwinkle-400/40 text-violet-500 border-periwinkle-400/60',
  CAREER_PATH: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
};

const TIER_LABELS = {
  EXPOSURE: 'Exposure',
  WORKING_KNOWLEDGE: 'Working knowledge',
  DEMONSTRATED_MASTERY: 'Demonstrated mastery',
};

// Unauthenticated shareable profile page, /u/<username> — schema fields for
// this (User.username/publicSummary) predate this route; see public.service.js.
export default function Public() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/public/${username}`)
      .then(({ data }) => setProfile(data))
      .catch(() => setNotFound(true));
  }, [username]);

  if (notFound) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <p className="text-ink-400 text-sm">No profile found for @{username}.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <LoadingState label="Loading profile…" />
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen flex justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        <div className="capsule-panel p-9 shadow-[var(--shadow-glow)]">
          <div className="flex items-center gap-2 mb-6">
            <HelixMark className="w-9 h-9" />
            <span className="font-display text-lg font-semibold tracking-wide text-gradient">@{profile.username}</span>
          </div>

          {profile.summary && <p className="text-sm text-ink-300 mb-8">{profile.summary}</p>}

          {profile.entities.length === 0 ? (
            <p className="text-xs text-ink-400">Nothing published yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.entities.map((e) => (
                <div key={`${e.type}-${e.name}`} className="glass-panel rounded-[20px] p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm text-ink-50 truncate">{e.name}</span>
                    <span
                      className={`text-[10px] shrink-0 px-2 py-0.5 rounded-full border ${
                        TYPE_COLORS[e.type] ?? 'bg-ink-700 text-ink-400 border-ink-600'
                      }`}
                    >
                      {e.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-400">{TIER_LABELS[e.depthTier] ?? e.depthTier}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
