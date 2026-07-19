import { motion } from 'framer-motion';

const dotTransition = (delay) => ({
  duration: 0.9,
  repeat: Infinity,
  ease: 'easeInOut',
  delay,
});

export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex items-center gap-1.5">
        {[0, 0.15, 0.3].map((delay) => (
          <motion.span
            key={delay}
            className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
            animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
            transition={dotTransition(delay)}
          />
        ))}
      </div>
      <p className="text-sm text-ink-400">{label}</p>
    </div>
  );
}
