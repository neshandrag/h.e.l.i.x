import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import PageTransition from '../components/PageTransition';

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
      <button
        onClick={generate}
        disabled={loading}
        className="text-[11px] px-2.5 py-1 rounded-full border border-violet-400/30 text-violet-300 hover:bg-violet-400/10 transition-colors"
      >
        {loading ? 'Generating…' : label}
      </button>
      {output && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-xs text-ink-300 mt-2 glass-panel rounded-lg p-3"
        >
          {output}
        </motion.p>
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
        <h1 className="text-2xl font-semibold text-ink-50">Digital journey timeline</h1>
        <p className="text-sm text-ink-400 mt-1">
          Your growth, narrated — and ready to reuse as a resume bullet or a post.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-ink-400">
          No milestones yet — generate one from a document on the Documents page.
        </p>
      ) : (
        <ol className="relative border-l border-white/10 ml-3">
          {events.map((event, i) => (
            <motion.li
              key={event.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="mb-8 ml-6"
            >
              <span className="absolute -left-[7px] w-3.5 h-3.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
              <p className="text-xs text-ink-400">
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
