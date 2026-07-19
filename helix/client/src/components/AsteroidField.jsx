import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Deterministic jagged-rock silhouette around a circle of radius ~50 (viewBox
// 0 0 100 100), so every asteroid reads as an irregular rock rather than a
// perfect circle, without needing an external image asset. More points +
// higher jitter than a simple polygon so the outline looks genuinely craggy.
function asteroidPath(seed, points = 14, jitter = 0.5) {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pts = [];
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const r = 42 * (1 - jitter / 2 + rand() * jitter);
    pts.push(`${(50 + r * Math.cos(angle)).toFixed(1)},${(50 + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// A few small crater circles for surface texture on the larger, closer rocks.
function craters(seed, count) {
  let s = seed + 999;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    cx: 30 + rand() * 40,
    cy: 25 + rand() * 40,
    r: 3 + rand() * 5,
    key: i,
  }));
}

const ASTEROIDS = [
  { seed: 11, size: 140, top: '8%', left: '5%', duration: 130, opacity: 0.6, detailed: true },
  { seed: 47, size: 64, top: '68%', left: '3%', duration: 95, opacity: 0.4, detailed: false },
  { seed: 23, size: 180, top: '56%', left: '85%', duration: 160, opacity: 0.55, detailed: true },
  { seed: 71, size: 50, top: '14%', left: '90%', duration: 80, opacity: 0.35, detailed: false },
  { seed: 5, size: 84, top: '85%', left: '50%', duration: 110, opacity: 0.3, detailed: false },
];

export default function AsteroidField() {
  const reduceMotion = useReducedMotion();
  const rocks = useMemo(
    () =>
      ASTEROIDS.map((a) => ({
        ...a,
        path: asteroidPath(a.seed),
        craters: a.detailed ? craters(a.seed, 3) : [],
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {rocks.map((rock, i) => (
        <motion.svg
          key={rock.seed}
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            top: rock.top,
            left: rock.left,
            width: rock.size,
            height: rock.size,
            opacity: rock.opacity,
            filter: rock.detailed ? 'none' : 'blur(1.5px)',
          }}
          animate={reduceMotion ? undefined : { rotate: i % 2 === 0 ? 360 : -360 }}
          transition={reduceMotion ? undefined : { duration: rock.duration, repeat: Infinity, ease: 'linear' }}
        >
          <defs>
            <radialGradient id={`asteroidBody${rock.seed}`} cx="32%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#565d80" />
              <stop offset="35%" stopColor="#2e3348" />
              <stop offset="75%" stopColor="#14161f" />
              <stop offset="100%" stopColor="#07080d" />
            </radialGradient>
          </defs>
          <path
            d={rock.path}
            fill={`url(#asteroidBody${rock.seed})`}
            stroke="rgba(123,167,252,0.22)"
            strokeWidth="1"
          />
          {rock.craters.map((c) => (
            <circle key={c.key} cx={c.cx} cy={c.cy} r={c.r} fill="rgba(0,0,0,0.35)" />
          ))}
        </motion.svg>
      ))}
    </div>
  );
}
