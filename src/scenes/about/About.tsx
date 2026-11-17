import { useLayoutEffect, useRef, type PointerEvent } from 'react';
import { gsap } from 'gsap';
import { profile, stats, domains } from '../../data/portfolio';
import { reducedMotion } from '../../utils/env';
import './about.css';

// every skill once, keeping its strongest level
const toolkit = (() => {
  const m = new Map<string, 'practical' | 'familiar'>();
  domains.flatMap((d) => d.skills).forEach((s) => {
    if (m.get(s.name) !== 'practical') m.set(s.name, s.level);
  });
  return [...m].map(([name, level]) => ({ name, level }));
})();

/** a soft spotlight that follows the pointer across a tile (CSS reads --mx/--my) */
const spot = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

/** Scene 05. Editorial: who, what was studied, what is certified, how the work is approached. */
export function About() {
  const section = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.about__head .mask > *', {
        yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: section.current, start: 'top 75%', once: true },
      });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0, y: 40, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
      // numbers count up once, keeping their suffix/format ("8.22", "22+")
      gsap.utils.toArray<HTMLElement>('.stat__value').forEach((el) => {
        const text = el.dataset.value!;
        const n = parseFloat(text);
        const decimals = (text.split('.')[1] ?? '').replace(/\D/g, '').length;
        const suffix = text.replace(/^[\d.]+/, '');
        if (n >= 1900) return; // a year shouldn't count up from zero
        const o = { v: 0 };
        gsap.to(o, {
          v: n, duration: 1.8, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: () => { el.textContent = o.v.toFixed(decimals) + suffix; },
        });
      });
    }, section);
    return () => ctx.revert();
  }, []);

  const edu = profile.education;

  return (
    <section id="about" ref={section} className="about section" aria-labelledby="about-title">
      <div className="section__inner">
        <div className="about__head">
          <p className="eyebrow"><b>05</b> About</p>
          <h2 id="about-title" className="display">
            <span className="mask"><span>Beyond</span></span>
            <span className="mask"><span>the <em>code</em></span></span>
          </h2>
        </div>

        <div className="about__intro">
          <p className="about__lede" data-reveal>{profile.summary}</p>
          <dl className="stats" data-reveal>
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <dt>{s.label}</dt>
                <dd className="stat__value" data-value={s.value}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="about__grid">
          <article className="about__card" data-reveal>
            <h3 className="about__h">Education</h3>
            <p className="edu__school">{edu.school}</p>
            <p className="edu__degree">{edu.degree} <span>· {edu.specialisation}</span></p>
            <p className="edu__meta">{edu.place} · {edu.graduation} · CGPA {edu.cgpa}</p>
            <ul className="tags edu__tags">
              {edu.coursework.map((c) => <li className="tag" key={c}>{c}</li>)}
            </ul>
            <p className="edu__practice">{edu.practice}</p>
          </article>

          <article className="about__card" data-reveal>
            <h3 className="about__h">Experience</h3>
            {profile.experience.map((x) => (
              <div className="xp" key={x.role}>
                <p className="xp__period">{x.period}</p>
                <p className="xp__role">{x.role}</p>
                <p className="xp__where">{x.where}</p>
                <p className="xp__body">{x.body}</p>
              </div>
            ))}
          </article>
        </div>

        <div className="about__certs" data-reveal>
          <h3 className="about__h">Certifications</h3>
          <ul className="certs">
            {profile.certifications.map((c) => (
              <li className="cert" key={c.code} onPointerMove={spot}>
                <span className="cert__code">{c.code}</span>
                <span className="cert__name">{c.name}</span>
                <span className="cert__issuer">{c.issuer}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="about__split">
          <div data-reveal>
            <h3 className="about__h">Toolkit</h3>
            <p className="toolkit__legend">
              <span><i className="legend__p" /> Hands-on</span>
              <span><i className="legend__f" /> Familiar</span>
            </p>
            <ul className="tags toolkit">
              {toolkit.map((s) => (
                <li key={s.name} className={`tag tag--${s.level}`}>
                  {s.name}<span className="sr-only"> ({s.level === 'practical' ? 'hands-on' : 'familiar'})</span>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal>
            <h3 className="about__h">Interests</h3>
            <ul className="interests">
              {profile.interests.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </div>
        </div>

        <div className="about__philosophy">
          <h3 className="about__h" data-reveal>How I work</h3>
          <ol className="principles">
            {profile.philosophy.map((p, i) => (
              <li className="principle" key={p.title} data-reveal>
                <span className="principle__n">0{i + 1}</span>
                <h4>{p.title}</h4>
                <p>{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
