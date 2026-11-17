import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { profile } from '../../data/portfolio';
import { Keycap } from '../../components/Keycap';
import { reducedMotion } from '../../utils/env';
import './finale.css';

const LINES = [['The', 'next', 'system'], ['is', 'waiting', 'to', 'be', 'built.']];

/**
 * Scene 06. The statement assembles word by word as you scroll into it (scrubbed, so it
 * can be read at any speed), while the stage glows brighter blue. Then the ways to reach out.
 */
export function Finale() {
  const section = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.finale__word', { opacity: 0.08, yPercent: 30, filter: 'blur(8px)' }, {
        opacity: 1, yPercent: 0, filter: 'blur(0px)', ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: '.finale__statement', start: 'top 85%', end: 'bottom 70%', scrub: 0.6 },
      });
      gsap.from('.finale__cta > *', {
        opacity: 0, y: 30, duration: 1.1, ease: 'expo.out', stagger: 0.07,
        scrollTrigger: { trigger: '.finale__cta', start: 'top 90%', once: true },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard blocked (insecure context / permissions): the address is visible and selectable anyway
    }
  };

  const year = new Date().getFullYear();

  return (
    <section id="contact" ref={section} className="finale" aria-labelledby="finale-title">
      <div className="finale__inner">
        <p className="eyebrow"><b>06</b> Contact</p>

        <h2 id="finale-title" className="finale__statement">
          {LINES.map((line, li) => (
            <span className="finale__line" key={li}>
              {line.map((w, wi) => (
                <span className={`finale__word ${w === 'built.' ? 'is-hot' : ''}`} key={wi}>{w}</span>
              ))}
            </span>
          ))}
        </h2>

        <div className="finale__cta">
          <p className="finale__lede">{profile.availability}</p>

          <div className="finale__email">
            <a className="finale__address" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
            <Keycap size="sm" label={copied ? 'Copied' : 'Copy'} icon={copied ? '✓' : '⧉'} onClick={copyEmail} />
            <span className="sr-only" aria-live="polite">{copied ? 'Email address copied to clipboard' : ''}</span>
          </div>

          <div className="finale__actions">
            <Keycap primary label="Start a conversation" icon="✉" href={`mailto:${profile.email}?subject=${encodeURIComponent('Hello Dheeraj')}`} />
            <Keycap label="Resume (PDF)" icon="↓" href={profile.resume} newTab />
          </div>

          <ul className="finale__links" aria-label="Profiles">
            <li><Keycap size="sm" label="LinkedIn" icon="↗" href={profile.links.linkedin} newTab /></li>
            <li><Keycap size="sm" label="GitHub" icon="↗" href={profile.links.github} newTab /></li>
            <li><Keycap size="sm" label="ByteXL" icon="↗" href={profile.links.bytexl} newTab /></li>
          </ul>
        </div>
      </div>

      <footer className="footer">
        <p>© {year} {profile.firstName} {profile.lastName}. All rights reserved.</p>
        <p className="footer__built">Built with React, Three.js &amp; GSAP</p>
        <Keycap size="sm" label="Back to top" icon="↑" href="#intro" />
      </footer>
    </section>
  );
}
