import { useEffect } from 'react';
import { gsap } from 'gsap';
import { reducedMotion, coarsePointer } from '../utils/env';

/**
 * Publishes the damped pointer position as CSS custom properties (--px, --py in -1..1) on <html>,
 * so any DOM layer can do parallax in pure CSS. Runs on the shared gsap ticker.
 */
export function usePointerVars() {
  useEffect(() => {
    if (reducedMotion() || coarsePointer()) return;
    const root = document.documentElement.style;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const move = (e: PointerEvent) => {
      target.x = (e.clientX / innerWidth) * 2 - 1;
      target.y = (e.clientY / innerHeight) * 2 - 1;
    };
    const tick = () => {
      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      if (Math.abs(dx) + Math.abs(dy) < 0.0005) return;
      cur.x += dx * 0.08;
      cur.y += dy * 0.08;
      root.setProperty('--px', cur.x.toFixed(4));
      root.setProperty('--py', cur.y.toFixed(4));
    };
    addEventListener('pointermove', move, { passive: true });
    gsap.ticker.add(tick);
    return () => { removeEventListener('pointermove', move); gsap.ticker.remove(tick); };
  }, []);
}
