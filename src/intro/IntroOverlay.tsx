import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Keycap } from '../components/Keycap';
import { profile } from '../data/portfolio';
import { introGate } from '../animations/introGate';
import { sceneState } from '../animations/sceneState';
import { deviceTier, reducedMotion, webglAvailable } from '../utils/env';
import type { ThunderIntro } from './thunder/ThunderIntro';
import './intro.css';

const SEEN = 'dr-intro-seen';
// ?introAt=4.5 starts the sequence at that second (and plays even if already seen): for reviewing a beat
const QS = new URLSearchParams(location.search);
const START_AT = Number(QS.get('introAt')) || 0;
const HOLD = QS.get('introHold') === '1';

/** whether the title sequence can play at all on this device */
export const introSupported = () => !reducedMotion() && webglAvailable();

function seenThisSession() {
  try { return sessionStorage.getItem(SEEN) === '1'; } catch { return false; }
}

/**
 * The full-screen title sequence. Plays once per browser session (Replay brings it back),
 * never under reduced motion or without WebGL. Skip with the button or Esc. When it ends,
 * the overlay fades out over the portfolio and the hero's own reveal takes over.
 */
export function IntroOverlay({ replay, onDone }: { replay: boolean; onDone: () => void }) {
  const [active] = useState(() => introSupported() && (replay || START_AT > 0 || !seenThisSession()));
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const credit = useRef<HTMLParagraphElement>(null);
  const subtitle = useRef<HTMLDivElement>(null);
  const engine = useRef<ThunderIntro | null>(null);
  const ending = useRef(false);
  const endRef = useRef<(fast: boolean) => void>(() => {});
  // skip: the fast fade claims the ending first, then the engine stops (its onComplete is then a no-op)
  const skip = () => { endRef.current(true); engine.current?.skip(); };

  useEffect(() => {
    if (!active) {
      introGate.open();
      onDone();
      return;
    }
    const html = document.documentElement;
    let cancelled = false;
    html.classList.add('is-locked');
    sceneState.introActive = true;
    if (replay) window.scrollTo({ top: 0, behavior: 'auto' });

    const end = (fast: boolean) => {
      if (ending.current) return;
      ending.current = true;
      try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode: it just plays again next visit */ }
      sceneState.introActive = false;
      html.classList.remove('is-locked');
      introGate.open(); // the hero begins underneath as the storm clears
      gsap.to(root.current, {
        opacity: 0, duration: fast ? 0.5 : 1.3, ease: 'power2.inOut',
        onComplete: () => { engine.current?.dispose(); engine.current = null; onDone(); },
      });
    };

    endRef.current = end;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skip(); };
    addEventListener('keydown', onKey);

    import('./thunder/ThunderIntro')
      .then(({ ThunderIntro }) => {
        if (cancelled || !canvas.current || !credit.current || !subtitle.current) return;
        engine.current = new ThunderIntro(canvas.current, {
          tier: deviceTier(),
          credit: credit.current,
          subtitle: subtitle.current,
          onComplete: () => end(false),
          startAt: START_AT,
          hold: HOLD,
        });
        engine.current.play();
      })
      .catch((err) => {
        console.warn('[intro] unavailable, continuing to the site', err);
        end(true);
      });

    return () => {
      cancelled = true;
      removeEventListener('keydown', onKey);
      engine.current?.dispose();
      engine.current = null;
      sceneState.introActive = false;
      html.classList.remove('is-locked');
    };
  }, [active, replay, onDone]);

  if (!active) return null;

  const [roleA, roleB] = profile.roles;
  return (
    <div className="thunder" ref={root} role="dialog" aria-modal="true" aria-label="Title sequence">
      <canvas ref={canvas} className="thunder__canvas" aria-hidden="true" />
      <div className="thunder__bars" aria-hidden="true" />
      <p className="thunder__credit" ref={credit} aria-hidden="true">
        A portfolio by {profile.firstName} {profile.lastName}
      </p>
      <div className="thunder__subtitle" ref={subtitle}>
        <span className="sr-only">{profile.firstName} {profile.lastName}. </span>
        <span className="thunder__rule" aria-hidden="true" />
        <span className="thunder__tag">{roleA} <i aria-hidden="true">|</i> {roleB}</span>
        <span className="thunder__rule" aria-hidden="true" />
      </div>
      <div className="thunder__skip">
        <Keycap size="sm" label="Skip intro" icon="»" onClick={skip} />
      </div>
    </div>
  );
}
