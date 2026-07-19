import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function SplashScreen({ onDone }) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const holdTime = reduceMotion ? 150 : 1500;
    const timer = setTimeout(() => setVisible(false), holdTime);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -60 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.55, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900"
        >
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center w-28 h-28 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,92,255,0.35) 0%, rgba(124,92,255,0) 72%)',
              }}
            >
              <motion.img
                src="/helix-icon-gradient.png"
                alt=""
                className="w-20 h-20 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(124,92,255,0.5))' }}
                initial={{ y: 6 }}
                animate={{ y: reduceMotion ? 0 : [6, -4, 6] }}
                transition={{ duration: 2.2, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.55, duration: 0.5 }}
              className="mt-5 font-display text-sm tracking-[0.4em] uppercase text-ink-200"
            >
              Helix
            </motion.p>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 96, opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.75, duration: 0.5, ease: 'easeOut' }}
              className="mt-3 h-px glow-divider"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
