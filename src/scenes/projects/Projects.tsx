import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { projects } from '../../data/portfolio';
import { GithubIcon } from '../../components/BrandIcons';
import { ProjectArt } from './ProjectArt';
import type { OpenProject } from '../../App';
import { reducedMotion } from '../../utils/env';
import './projects.css';

// resting depth per card (px along Z): breaks the grid into a field of screens at different distances
const DEPTH = [0, -110, -40, -150, -70, -10, -130, -50];

/**
 * Scene 04. The projects as floating screens in a CSS 3D space. The whole plane leans
 * with the pointer; the hovered/focused card comes forward while the others fall back.
 * Cards are DOM, so they stay readable, selectable and accessible.
 */
export function Projects({ onOpenProject }: { onOpenProject: OpenProject }) {
  const section = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.projects__head .mask > *', {
        yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: section.current, start: 'top 75%', once: true },
      });
      // cards arrive out of the dark, each from deeper than its resting place
      gsap.set('.deck__slot', { opacity: 0, z: -500, rotateX: 18 });
      ScrollTrigger.batch('.deck__slot', {
        start: 'top 92%',
        once: true,
        onEnter: (els) => gsap.to(els, {
          opacity: 1, z: 0, rotateX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.09, overwrite: true,
        }),
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section id="projects" ref={section} className="projects section" aria-labelledby="projects-title">
      <div className="section__inner">
        <div className="projects__head">
          <p className="eyebrow"><b>04</b> Projects</p>
          <h2 id="projects-title" className="display">
            <span className="mask"><span>Ideas into</span></span>
            <span className="mask"><span><em>engineering</em></span></span>
          </h2>
          <p className="lede">
            AI security, generative AI, 3D on the web, system design and the fundamentals underneath.
            Open any screen for the problem, the approach and the stack.
          </p>
        </div>

        <div className="deck">
          <ul className="deck__plane">
            {projects.map((p, i) => (
              <li className="deck__slot" key={p.id}>
                <article className="card" style={{ ['--z' as string]: `${DEPTH[i % DEPTH.length]}px` }} aria-labelledby={`card-${p.id}`}>
                  <div className="card__art">
                    <ProjectArt project={p} />
                    <span className="card__index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="card__body">
                    <p className="card__cat">{p.category}</p>
                    <h3 className="card__title" id={`card-${p.id}`}>
                      <button
                        className="card__open"
                        onClick={(e) => onOpenProject(p.id, e.currentTarget.closest('.card')!.getBoundingClientRect())}
                      >
                        {p.title}
                      </button>
                    </h3>
                    <p className="card__summary">{p.summary}</p>
                    <ul className="tags card__tags" aria-label="Technologies">
                      {p.stack.slice(0, 4).map((t) => <li className="tag" key={t}>{t}</li>)}
                      {p.stack.length > 4 && <li className="tag">+{p.stack.length - 4}</li>}
                    </ul>
                    <div className="card__foot">
                      <span className="card__cta" aria-hidden="true">View project <ArrowUpRight size={15} /></span>
                      {p.repo ? (
                        <a className="card__gh" href={p.repo} target="_blank" rel="noreferrer">
                          <GithubIcon size={15} /> <span>GitHub</span>
                          <span className="sr-only">: {p.title} repository (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className="card__status">{p.status}</span>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
