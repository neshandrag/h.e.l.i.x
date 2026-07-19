import { motion } from 'framer-motion';

export default function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex items-center gap-1.5">
        {[0, 0.15, 0.3].map((delay) => (
          <motion.span
            key={delay}
            className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-periwinkle-400"
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay }}
          />
        ))}
      </div>
      <p className="text-sm text-ink-400">{label}</p>
    </div>
  );
}
