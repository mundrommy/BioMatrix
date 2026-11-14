import { useEffect } from 'react';

/**
 * Visual-only mouse effects (no app logic):
 *  - ".panel-glow" elements get a soft spotlight that follows the cursor
 *  - ".tilt" cards lean slightly toward the cursor
 * Turned off for touch screens and for people who prefer reduced motion.
 */
export function UiEffects() {
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    if (reduce || !fine) return;

    let lastTilt: HTMLElement | null = null;
    const resetTilt = () => {
      if (lastTilt) {
        lastTilt.style.setProperty('--rx', '0deg');
        lastTilt.style.setProperty('--ry', '0deg');
        lastTilt = null;
      }
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;

      const glow = target.closest<HTMLElement>('.panel-glow');
      if (glow) {
        const r = glow.getBoundingClientRect();
        glow.style.setProperty('--mx', `${e.clientX - r.left}px`);
        glow.style.setProperty('--my', `${e.clientY - r.top}px`);
      }

      const tilt = target.closest<HTMLElement>('.tilt');
      if (tilt !== lastTilt) resetTilt();
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
        tilt.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
        lastTilt = tilt;
      }
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', resetTilt);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', resetTilt);
    };
  }, []);

  return null;
}
