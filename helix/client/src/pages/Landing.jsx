import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import HelixMark from '../components/HelixMark';
import { useAuth } from '../context/AuthContext';

const MODULES = [
  {
    tag: '01',
    title: 'Ingestion',
    desc: 'Upload resumes, certificates, transcripts, and reports. Each document is parsed and structured automatically upon submission.',
  },
  {
    tag: '02',
    title: 'Categorization',
    desc: 'Every document is automatically classified into projects, skills, certifications, internships, or achievements.',
  },
  {
    tag: '03',
    title: 'Relationship Engine',
    desc: 'A continuously updated knowledge graph connects your evidence and quantifies how deep each skill truly runs.',
  },
  {
    tag: '04',
    title: 'Journey Timeline',
    desc: 'Milestones are narrated automatically and ready to reuse as a resume bullet or a professional update.',
  },
  {
    tag: '05',
    title: 'Smart Retrieval',
    desc: 'Ask a question in plain language and receive an evidence-based answer, not a list of files.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Landing() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative z-10">
      {/* ------------------------------------------------------------- nav */}
      <div className="px-4 pt-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between glass-panel rounded-full pl-6 pr-3 py-4">
          <div className="flex items-center gap-2.5">
            <HelixMark className="w-9 h-9" />
            <span className="font-display text-lg font-semibold tracking-wide text-gradient-brand">HELIX</span>
          </div>
          {user ? (
            <Link to="/dashboard" className="btn-glass-primary text-xs font-medium px-4 py-2.5 rounded-full">
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-glass text-xs px-4 py-2.5 rounded-full">
                Sign In
              </Link>
              <Link to="/register" className="btn-glass-primary text-xs font-medium px-4 py-2.5 rounded-full">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ hero */}
      <section className="relative px-4 pt-28 pb-24 sm:pt-36 sm:pb-32 text-center overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(156,133,255,0.16) 32%, rgba(123,167,252,0.08) 55%, rgba(123,167,252,0) 72%)',
            filter: 'blur(30px)',
          }}
          animate={reduceMotion ? undefined : { opacity: [0.6, 1, 0.6], scale: [0.94, 1.05, 0.94] }}
          transition={reduceMotion ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.span
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="eyebrow justify-center"
        >
          AI Digital Identity System
        </motion.span>

        <motion.h1
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={1}
          className="font-display mt-6 text-[2.6rem] leading-[1.05] sm:text-6xl md:text-7xl font-semibold uppercase tracking-tight max-w-4xl mx-auto text-ink-100"
        >
          Your achievements,
          <br />
          <span className="text-gradient">woven into a story</span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={2}
          className="mt-7 text-sm sm:text-base text-ink-300 max-w-xl mx-auto leading-relaxed"
        >
          Helix transforms your certificates, projects, and achievements into a living digital identity
          — automatically organized, connected, and told as your story.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={3}
          className="mt-10 flex items-center justify-center gap-3 flex-wrap"
        >
          <Link
            to={user ? '/dashboard' : '/register'}
            className="btn-glass-primary text-sm font-medium px-6 py-3 rounded-full transition-transform hover:scale-[1.03]"
          >
            {user ? 'Go to Dashboard' : 'Get Started'}
          </Link>
          {!user && (
            <Link to="/login" className="btn-glass text-sm font-medium px-6 py-3 rounded-full">
              Sign In
            </Link>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.9, ease: 'easeOut' }}
          className="glow-divider mt-20 max-w-md mx-auto"
        />
      </section>

      {/* --------------------------------------------------------- modules */}
      <section className="px-4 pb-28">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="eyebrow justify-center">The System</span>
            <h2 className="font-display mt-4 text-2xl sm:text-4xl font-semibold uppercase tracking-tight">
              Five modules. <span className="text-gradient">One identity.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m, i) => (
              <motion.div
                key={m.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                custom={i}
                variants={fadeUp}
              >
                <div className="capsule-panel p-7 h-full flex flex-col gap-4">
                  <span className="font-display text-3xl font-semibold text-gradient tracking-tight">{m.tag}</span>
                  <h3 className="font-display text-lg font-semibold tracking-wide uppercase">{m.title}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
