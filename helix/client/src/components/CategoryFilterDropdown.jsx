import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CategoryFilterDropdown({ categories, active, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((o) => !o)}
        className="btn-glass flex items-center gap-2 rounded-full text-xs px-4 py-2.5"
      >
        <span className="text-ink-50 font-medium">{active}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-ink-400 text-[10px]"
        >
          ▾
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="capsule-panel absolute right-0 sm:left-0 top-[calc(100%+8px)] z-20 min-w-[10rem] p-1.5 overflow-hidden"
          >
            {categories.map((cat) => {
              const isActive = cat === active;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    onChange(cat);
                    setOpen(false);
                  }}
                  className={`w-full text-left text-xs px-3.5 py-2 rounded-[18px] transition-colors ${
                    isActive ? 'btn-glass-active text-ink-50' : 'text-ink-400 hover:text-ink-50 hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
