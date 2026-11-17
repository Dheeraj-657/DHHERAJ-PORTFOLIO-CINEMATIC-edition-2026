import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Stage } from '../gl/Stage';
import { deviceTier, reducedMotion, webglAvailable } from '../utils/env';

export const StageContext = createContext<Stage | null>(null);

/** the shared WebGL stage, or null while booting / when WebGL is unavailable */
export const useStageContext = () => useContext(StageContext);

/** Creates the one Stage for the page and tears it down on unmount (no leaked contexts under StrictMode). */
export function useCreateStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [failed, setFailed] = useState(() => !webglAvailable());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (failed || !canvas) return;
    let s: Stage | null = null;
    let cancelled = false;
    // three.js is ~135 kB gzipped: load it after first paint so the DOM content never waits on it
    import('../gl/Stage')
      .then(({ Stage }) => {
        if (cancelled) return;
        s = new Stage(canvas, {
          tier: deviceTier(),
          reduced: reducedMotion(),
          onContextLost: () => { setStage(null); setFailed(true); },
        });
        setStage(s);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[stage] WebGL unavailable, using the static fallback', err);
        setFailed(true);
      });
    return () => { cancelled = true; s?.dispose(); setStage(null); };
  }, [failed]);

  useEffect(() => {
    document.documentElement.classList.toggle('no-webgl', failed);
    // the fallback layout has different section heights: re-measure scroll pins
    if (failed) requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [failed]);

  return { canvasRef, stage, failed };
}
