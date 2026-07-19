import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import PageTransition from '../components/PageTransition';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

function GenerateButton({ eventId, kind, label }) {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/timeline/${eventId}/generate`, { kind });
      setOutput(data.content);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button onClick={generate} disabled={loading} className="btn-glass text-[11px] px-2.5 py-1 rounded-full">
        {loading ? 'Generating…' : label}
      </button>
      {output && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
          <div className="glass-panel rounded-[var(--radius-capsule)] p-4">
            <p className="text-xs text-ink-300">{output}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/timeline')
      .then(({ data }) => setEvents(data.events))
      .finally(() => setLoading(false));
  }, []);

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
        <LoadingState label="Assembling your timeline…" />
      ) : events.length === 0 ? (
        <EmptyState label="No milestones recorded yet. Generate one from a document on the Documents page." />
      ) : (
        <ol className="relative ml-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-violet-400/60 before:via-periwinkle-400/50 before:to-transparent">
          {events.map((event, i) => (
            <motion.li
              key={event.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative mb-8 ml-6"
            >
              <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400 shadow-[0_0_10px_2px_rgba(123,167,252,0.55)]" />
              <p className="text-xs text-ink-400 font-display tracking-wide uppercase">
                {new Date(event.eventDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
              </p>
              <p className="text-sm text-ink-50 mt-1">{event.narrative}</p>
              <div className="flex gap-2">
                <GenerateButton eventId={event.id} kind="resumeBullet" label="Generate resume bullet" />
                <GenerateButton eventId={event.id} kind="linkedinPost" label="Generate LinkedIn post" />
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </PageTransition>
  );
}
