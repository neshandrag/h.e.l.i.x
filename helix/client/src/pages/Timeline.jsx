import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import PageTransition from '../components/PageTransition';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

const CATEGORY_TONE = {
  Certifications: 'border-violet-500/35 text-violet-500 bg-violet-500/10',
  Internships: 'border-violet-500/35 text-violet-500 bg-violet-500/10',
  Projects: 'border-periwinkle-400/50 text-violet-500 bg-periwinkle-400/25',
  Achievements: 'border-periwinkle-400/50 text-violet-500 bg-periwinkle-400/20',
  Skills: 'border-ink-600 text-ink-400 bg-ink-700/60',
  Academics: 'border-ink-600 text-ink-400 bg-ink-700/60',
};

function GenerateButton({ eventId, kind, label }) {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/timeline/${eventId}/generate`, { kind });
      setOutput((data.content || '').trim());
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not generate — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="btn-glass text-[11px] px-3 py-1.5 rounded-full disabled:opacity-60"
      >
        {loading ? 'Generating…' : label}
      </button>
      {error && <p className="text-red-400 text-[11px] mt-2">{error}</p>}
      {output && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-ink-50 leading-relaxed whitespace-pre-wrap rounded-[12px] border border-ink-600 bg-ink-700/50 px-3 py-2.5"
        >
          {output}
        </motion.p>
      )}
    </div>
  );
}

function groupByYear(events) {
  const map = new Map();
  for (const event of events) {
    const year = new Date(event.eventDate).getFullYear();
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(event);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({
      year,
      items: items.slice().sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate)),
    }));
}

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/timeline')
      .then(({ data }) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => groupByYear(events), [events]);

  return (
    <PageTransition>
      <header className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold uppercase tracking-tight text-ink-100">
          Digital Journey Timeline
        </h1>
        <p className="text-sm text-ink-400 mt-2">Your growth, narrated automatically.</p>
        <div className="glow-divider mt-6" />
      </header>

      {loading ? (
        <LoadingState label="Loading timeline…" />
      ) : events.length === 0 ? (
        <EmptyState label="No milestones yet. Upload a certificate, internship, or project — they appear here by date." />
      ) : (
        <div className="relative">
          {/* Chart axis */}
          <div className="hidden sm:block absolute left-[4.75rem] top-2 bottom-2 w-px bg-gradient-to-b from-violet-400/70 via-periwinkle-400/40 to-transparent" />

          <div className="flex flex-col gap-10">
            {years.map((group) => (
              <section key={group.year} className="relative">
                <div className="flex items-center gap-3 mb-5 sm:mb-6">
                  <div className="sm:w-[4.25rem] shrink-0">
                    <span className="inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-1 rounded-full bg-violet-500 text-white font-display text-sm font-semibold tabular-nums shadow-[0_6px_16px_rgba(46,204,113,0.28)]">
                      {group.year}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-ink-600" />
                  <span className="text-[11px] text-ink-400 shrink-0">
                    {group.items.length} milestone{group.items.length === 1 ? '' : 's'}
                  </span>
                </div>

                <ol className="flex flex-col gap-4">
                  {group.items.map((event, i) => {
                    const tone = CATEGORY_TONE[event.category] ?? CATEGORY_TONE.Academics;
                    return (
                      <motion.li
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.3) }}
                        className="grid grid-cols-1 sm:grid-cols-[4.25rem_1fr] gap-3 sm:gap-4 items-start"
                      >
                        <div className="relative hidden sm:flex justify-center pt-5">
                          <span className="relative z-10 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-violet-500 to-periwinkle-400 ring-[6px] ring-[var(--bg)]" />
                        </div>

                        <article className="capsule-panel p-4 sm:p-5">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <time className="font-display text-[11px] uppercase tracking-[0.12em] text-ink-400">
                              {new Date(event.eventDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </time>
                            {event.category && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tone}`}>
                                {event.category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink-50 leading-relaxed">{event.narrative}</p>
                          <div className="flex flex-col sm:flex-row gap-3 mt-3">
                            <GenerateButton eventId={event.id} kind="resumeBullet" label="Generate resume bullet" />
                            <GenerateButton eventId={event.id} kind="linkedinPost" label="Generate LinkedIn post" />
                          </div>
                        </article>
                      </motion.li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
