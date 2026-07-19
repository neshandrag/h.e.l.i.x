/**
 * Helix wordmark glyph — the rocket-launch icon. Pre-recolored (violet→blue
 * brand gradient applied to the source silhouette, transparency derived from
 * luminance) at build time via scripts/recolor-icon.js, then used as a plain
 * image — more reliably rendered across browsers than a live CSS mask.
 */
export default function HelixMark({ className = 'w-8 h-9' }) {
  return (
    <img
      src="/helix-icon-gradient.png"
      alt=""
      className={`${className} object-contain`}
      style={{ filter: 'drop-shadow(0 0 7px rgba(167,139,250,0.55))' }}
      aria-hidden="true"
    />
  );
}
