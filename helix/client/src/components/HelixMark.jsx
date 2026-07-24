/**
 * Helix wordmark glyph — emerald accent to match the warm parchment theme
 * (--accent #2ECC71 → --accent-2 #A8E6C1 via scripts/recolor-icon.js).
 */
export default function HelixMark({ className = 'w-8 h-9' }) {
  return (
    <img
      src="/helix-icon-gradient.png"
      alt=""
      className={`${className} object-contain`}
      style={{ filter: 'drop-shadow(0 2px 8px rgba(46,204,113,0.28))' }}
      aria-hidden="true"
    />
  );
}
