import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const STAR_COUNT = 420;

// A mix of star tints (cool white, pale blue, warm gold) reads as a real
// photographed sky rather than a flat single-color dot field.
const STAR_COLORS = ['#f5f6fa', '#f5f6fa', '#cbd5ff', '#e8d9ff', '#ffe8c2'];

function seededStars(count) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    // Bias density toward the diagonal Milky Way band so the field feels
    // clustered like a real photograph rather than uniformly scattered.
    const alongBand = Math.random() > 0.4;
    const t = Math.random();
    const top = alongBand ? Math.max(0, Math.min(100, (1 - t) * 100 + (Math.random() - 0.5) * 34)) : Math.random() * 100;
    const left = alongBand ? Math.max(0, Math.min(100, t * 100 + (Math.random() - 0.5) * 34)) : Math.random() * 100;

    const bright = Math.random() > 0.92;
    const size = bright ? Math.random() * 1.6 + 2 : Math.random() * 1.7 + 0.4;
    stars.push({
      id: i,
      top,
      left,
      size,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      maxOpacity: bright ? 1 : Math.random() * 0.55 + 0.35,
      glow: bright || Math.random() > 0.9,
    });
  }
  return stars;
}

const NEBULAE = [
  {
    top: '-10%',
    left: '-8%',
    width: '55vw',
    height: '55vw',
    background: 'radial-gradient(circle, rgba(124,92,255,0.20) 0%, rgba(124,92,255,0) 70%)',
    animation: 'drift-a 70s ease-in-out infinite',
  },
  {
    top: '20%',
    right: '-12%',
    width: '48vw',
    height: '48vw',
    background: 'radial-gradient(circle, rgba(123,167,252,0.16) 0%, rgba(123,167,252,0) 70%)',
    animation: 'drift-b 85s ease-in-out infinite',
  },
  {
    bottom: '-15%',
    left: '25%',
    width: '42vw',
    height: '42vw',
    background: 'radial-gradient(circle, rgba(142,162,255,0.13) 0%, rgba(142,162,255,0) 70%)',
    animation: 'drift-a 95s ease-in-out infinite reverse',
  },
];

export default function StarfieldBackground() {
  const reduceMotion = useReducedMotion();
  const stars = useMemo(() => seededStars(STAR_COUNT), []);

  return (
    <div className="starfield-root" aria-hidden="true">
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 50%', willChange: 'transform' }}
        animate={reduceMotion ? undefined : { scale: [1, 1.22, 1] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 46, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }
        }
      >
        <div className="dust-lane" />
        <div className="core-glow" />

        {NEBULAE.map((n, i) => (
          <div
            key={i}
            className="nebula-blob"
            style={{
              top: n.top,
              left: n.left,
              right: n.right,
              bottom: n.bottom,
              width: n.width,
              height: n.height,
              background: n.background,
              animation: reduceMotion ? 'none' : n.animation,
            }}
          />
        ))}

        {stars.map((s) => (
          <span
            key={s.id}
            className="starfield-star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              background: s.color,
              boxShadow: s.glow ? `0 0 ${s.size * 3}px ${s.size}px ${s.color}55` : 'none',
              opacity: s.maxOpacity,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
