import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GraduationCap, Award, Code2, GitPullRequest, Rocket } from 'lucide-react';
import { Keycap } from '../../components/Keycap';
import { milestones, type Milestone } from '../../data/portfolio';
import { railPosition, damp } from '../../utils/math';
import { reducedMotion } from '../../utils/env';
import './journey.css';

const KIND: Record<Milestone['kind'], { label: string; Icon: typeof Award }> = {
  education: { label: 'Education', Icon: GraduationCap },
  certification: { label: 'Certification', Icon: Award },
  project: { label: 'Projects', Icon: Code2 },
  experience: { label: 'Experience', Icon: GitPullRequest },
  future: { label: 'Ahead', Icon: Rocket },
};

const N = milestones.length;
const WIDE = '(min-width: 861px)';

/**
 * Scene 03. A light travels a rail of milestones. Four inputs drive one continuous
 * position: pointer (desktop: x across the stage), scroll (desktop: the section pins
 * and scrubs), keyboard (arrow keys / Home / End on the tablist) and tap.
 * The light eases toward that position; the nearest milestone is the active one.
 */
export function Journey() {
  const section = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const pos = useRef({ current: 0, target: 0 });
  const pin = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);

  // one ticker callback eases the light and publishes the active milestone
  useEffect(() => {
    const reduced = reducedMotion();
    let last = -1;
    const tick = (_t: number, dMs: number) => {
      const p = pos.current;
      p.current = reduced ? p.target : damp(p.current, p.target, 6, Math.min(dMs / 1000, 0.1));
      railRef.current?.style.setProperty('--pos', ((p.current + 0.5) / N).toFixed(4));
      const idx = Math.round(p.current);
      if (idx !== last) { last = idx; setActive(idx); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // desktop: pin the section and let scroll walk the timeline
  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add(WIDE, () => {
      // ~22% of a screen per milestone, and the pin always comes to rest ON a milestone
      pin.current = ScrollTrigger.create({
        trigger: section.current,
        start: 'top top',
        end: `+=${N * 22}%`,
        pin: true,
        // directional: false, so arriving from below (nav link, fast scroll up) lands on the nearest milestone, not the last
        snap: { snapTo: 1 / (N - 1), directional: false, duration: { min: 0.2, max: 0.5 }, delay: 0.06, ease: 'power2.inOut' },
        onUpdate: (self) => { pos.current.target = self.progress * (N - 1); },
      });
      return () => { pin.current = null; };
    });
    const ctx = gsap.context(() => {
      gsap.from('.journey__head .mask > *', {
        yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: section.current, start: 'top 75%', once: true },
      });
      gsap.from('.rail__track', {
        scaleX: 0, duration: 1.6, ease: 'expo.inOut',
        scrollTrigger: { trigger: section.current, start: 'top 60%', once: true },
      });
    }, section);
    return () => { mm.revert(); ctx.revert(); };
  }, []);

  const go = (i: number, focus = false) => {
    const idx = Math.max(0, Math.min(N - 1, i));
    pos.current.target = idx;
    if (focus) tabs.current[idx]?.focus();
    // while pinned, move the scroll position too, so the next wheel tick continues from here
    const st = pin.current;
    if (st && st.isActive) {
      window.scrollTo({ top: st.start + ((st.end - st.start) * idx) / (N - 1), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
    // portrait: the card sits under the rail, so bring it into view on tap
    if (!focus && !matchMedia(WIDE).matches) {
      document.getElementById('ms-panel')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !matchMedia(WIDE).matches || !railRef.current) return;
    const r = railRef.current.getBoundingClientRect();
    pos.current.target = railPosition(e.clientX, r.left, r.width, N);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowRight: active + 1, ArrowDown: active + 1, ArrowLeft: active - 1, ArrowUp: active - 1, Home: 0, End: N - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    go(map[e.key], true);
  };

  const m = milestones[active];
  const { label, Icon } = KIND[m.kind];

  return (
    <section id="journey" ref={section} className="journey" aria-labelledby="journey-title">
      <div className="journey__frame">
        <div className="journey__head">
          <p className="eyebrow"><b>03</b> Journey</p>
          <h2 id="journey-title" className="display">
            <span className="mask"><span>My <em>journey</em></span></span>
          </h2>
          <p className="journey__hint" aria-hidden="true">
            <span className="hint-wide">Move across the line · scroll · ← → keys</span>
            <span className="hint-narrow">Tap a milestone</span>
          </p>
        </div>

        <div className="journey__stage" ref={stageRef}>
          <div
            className="rail"
            ref={railRef}
            role="tablist"
            style={{ ['--n' as string]: N }}
            onPointerMove={onPointerMove}
            aria-label="Milestones"
            onKeyDown={onKeyDown}
          >
            <div className="rail__track" aria-hidden="true">
              <div className="rail__fill" />
              <div className="rail__head" />
            </div>
            {milestones.map((ms, i) => (
              <button
                key={ms.id}
                ref={(el) => { tabs.current[i] = el; }}
                role="tab"
                id={`ms-tab-${ms.id}`}
                aria-selected={i === active}
                aria-controls="ms-panel"
                tabIndex={i === active ? 0 : -1}
                className={`stop stop--${ms.kind} ${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}
                style={{ ['--i' as string]: i }}
                onClick={() => go(i)}
              >
                <span className="stop__date">{ms.date ?? 'TBA'}</span>
                <span className="stop__dot" aria-hidden="true" />
                <span className="stop__title">{ms.title}</span>
              </button>
            ))}
          </div>

          <article
            className="ms-card"
            id="ms-panel"
            role="tabpanel"
            aria-labelledby={`ms-tab-${m.id}`}
            aria-live="polite"
          >
            <div className="ms-card__inner" key={m.id}>
              <p className="ms-card__kind">
                <Icon size={15} aria-hidden /> {label}
                <span className="ms-card__count">{String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</span>
              </p>
              <p className={`ms-card__date ${m.date ? '' : 'is-unknown'}`}>{m.date ?? 'Date to be added'}</p>
              <h3 className="ms-card__title">{m.title}</h3>
              <p className="ms-card__sub">{m.subtitle}</p>
              <p className="ms-card__body">{m.body}</p>
            </div>
            <div className="ms-card__nav">
              <Keycap label="Previous milestone" icon="←" iconOnly disabled={active === 0} onClick={() => go(active - 1)} />
              <Keycap label="Next milestone" icon="→" iconOnly disabled={active === N - 1} onClick={() => go(active + 1)} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
