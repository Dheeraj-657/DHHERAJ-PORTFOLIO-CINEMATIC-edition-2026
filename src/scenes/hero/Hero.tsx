import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Keycap } from '../../components/Keycap';
import { profile } from '../../data/portfolio';
import { sceneState } from '../../animations/sceneState';
import { reducedMotion } from '../../utils/env';
import { introGate } from '../../animations/introGate';
import './hero.css';

const NAME = profile.firstName.toUpperCase();

/**
 * Scene 01. Black → ambient light → dust → the name rises letter by letter → identity
 * → statement → navigation. Any input during the intro fast-forwards it rather than
 * making a visitor wait.
 */
export function Hero({ onReplay }: { onReplay?: () => void }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current!;
    const html = document.documentElement;

    if (reducedMotion()) {
      sceneState.glow = 1;
      sceneState.particles = 1;
      html.classList.remove('intro-pending');
      return;
    }

    let cancelled = false;
    const ctx = gsap.context(() => {});
    const q = gsap.utils.selector(el);
    const hurryEvents = ['wheel', 'touchstart', 'keydown'] as const;
    let hurry = () => {};

    const start = () => {
      if (cancelled) return;
      ctx.add(() => {
        const tl = gsap.timeline({ delay: 0.45 });
        tl.to(sceneState, { glow: 1, duration: 2.6, ease: 'power2.inOut' }, 0)
          .to(sceneState, { particles: 1, duration: 3.2, ease: 'power2.out' }, 0.8)
          .from(q('.hero__char'), {
            yPercent: 118, rotateX: -70, opacity: 0, filter: 'blur(10px)',
            duration: 1.6, ease: 'expo.out', stagger: 0.07,
          }, 1.25)
          .from(q('.hero__flare'), { scaleX: 0, opacity: 0, duration: 1.8, ease: 'expo.inOut' }, 1.6)
          .from(q('.hero__rule'), { scaleX: 0, duration: 1.3, ease: 'expo.inOut' }, 2.1)
          .from(q('.hero__role > span'), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09 }, 2.35)
          .from(q('.hero__statement .w > span'), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, 2.8)
          // clearProps: a leftover transform would make the header the containing block of the fixed mobile menu
          .from('[data-intro="nav"]', { y: -24, opacity: 0, duration: 1.1, ease: 'expo.out', clearProps: 'transform' }, 3.3)
          .from(q('[data-intro="hud"]'), { opacity: 0, y: 12, duration: 1, ease: 'power2.out', stagger: 0.08 }, 3.4);

        // the from() calls above have already applied their start states, so the page can be unhidden
        html.classList.remove('intro-pending');

        hurry = () => { if (tl.progress() < 1) tl.timeScale(4); };
        hurryEvents.forEach((t) => addEventListener(t, hurry, { once: true, passive: true }));

        // scroll-out: the title recedes into the dark as the universe approaches
        gsap.to(q('.hero__content'), {
          yPercent: -18, opacity: 0, scale: 0.94, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to(q('.hero__hud'), {
          opacity: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: '30% top', scrub: true },
        });
      });
    };

    // hold on true black until the display face is ready (bounded, so a slow font never blocks the site)
    // and until the title sequence has handed over (opens at once if it doesn't play)
    Promise.all([Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1400))]), introGate.ready]).then(start);

    return () => {
      cancelled = true;
      hurryEvents.forEach((t) => removeEventListener(t, hurry));
      ctx.revert();
    };
  }, []);

  return (
    <section id="intro" ref={root} className="hero" aria-labelledby="hero-title">
      <div className="hero__content">
        <p className="hero__kicker" data-intro="hud">
          <span>Portfolio</span><span aria-hidden="true">/</span><span>Edition {new Date().getFullYear()}</span>
        </p>

        <h1 id="hero-title" className="hero__name">
          <span className="sr-only">{profile.firstName} {profile.lastName}</span>
          <span className="hero__word" aria-hidden="true">
            {NAME.split('').map((c, i) => (
              <span className="hero__char" key={i} style={{ ['--i' as string]: i - (NAME.length - 1) / 2 }}>{c}</span>
            ))}
          </span>
          <span className="hero__flare" aria-hidden="true" />
        </h1>

        <div className="hero__rule" aria-hidden="true" />

        <p className="hero__roles">
          {profile.roles.map((r) => (
            <span className="hero__role" key={r}><span>{r}</span></span>
          ))}
        </p>

        <p className="hero__statement">
          {profile.statement.split(' ').map((w, i) => (
            <span className="w mask" key={i}><span className={/intelligent/i.test(w) ? 'hot' : undefined}>{w}</span></span>
          ))}
        </p>
      </div>

      <div className="hero__hud">
        <div className="hero__left" data-intro="hud">
          <p className="hero__meta">
            {profile.education.school}<br />
            B.Tech CSE · {profile.education.specialisation}
          </p>
          {onReplay && <Keycap size="sm" label="Replay intro" icon="↻" onClick={onReplay} />}
        </div>
        <span className="hero__cue" data-intro="hud">
          <Keycap label="Enter the universe" icon="↓" href="#universe" />
        </span>
        <p className="hero__meta hero__meta--right" data-intro="hud">
          {profile.lastName}<br />
          {profile.location}
        </p>
      </div>
    </section>
  );
}
