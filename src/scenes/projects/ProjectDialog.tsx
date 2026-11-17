import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { X } from 'lucide-react';
import type { Project } from '../../data/portfolio';
import { Keycap } from '../../components/Keycap';
import { ProjectArt } from './ProjectArt';
import { reducedMotion } from '../../utils/env';
import './dialog.css';

/**
 * Detail view. A native <dialog> (focus trap, Esc, inert background for free) whose
 * panel grows out of the card that opened it, a FLIP from the card's rect to its own.
 */
export function ProjectDialog({ project, origin, onClose }: { project: Project | null; origin?: DOMRect; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const opener = useRef<Element | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dialog.current;
    const p = panel.current;
    if (!project || !d || !p) return;
    opener.current = document.activeElement;
    closing.current = false;
    document.documentElement.classList.add('is-locked');
    d.showModal();
    closeBtn.current?.focus();
    p.scrollTop = 0;

    if (!reducedMotion()) {
      const to = p.getBoundingClientRect();
      const tl = gsap.timeline();
      if (origin && to.width > 0) {
        tl.fromTo(p, {
          x: origin.left + origin.width / 2 - (to.left + to.width / 2),
          y: origin.top + origin.height / 2 - (to.top + to.height / 2),
          scaleX: origin.width / to.width,
          scaleY: origin.height / to.height,
          opacity: 0.3,
        }, { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.85, ease: 'expo.out' });
      } else {
        tl.fromTo(p, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
      }
      tl.from(p.querySelectorAll('[data-stagger]'), { opacity: 0, y: 18, duration: 0.7, ease: 'expo.out', stagger: 0.05 }, '-=0.45');
      return () => { tl.kill(); };
    }
  }, [project, origin]);

  const close = () => {
    const d = dialog.current;
    const p = panel.current;
    if (!d || closing.current) return;
    closing.current = true;
    const finish = () => {
      d.close();
      document.documentElement.classList.remove('is-locked');
      gsap.set(p, { clearProps: 'all' });
      (opener.current as HTMLElement | null)?.focus?.();
      onClose();
    };
    if (reducedMotion() || !p) return finish();
    gsap.to(p, { opacity: 0, y: 24, scale: 0.97, duration: 0.35, ease: 'power2.in', onComplete: finish });
  };

  return (
    <dialog
      ref={dialog}
      className="pd"
      aria-labelledby="pd-title"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === dialog.current) close(); }}
    >
      {project && (
        <div className="pd__panel" ref={panel}>
          <button className="pd__close" ref={closeBtn} onClick={close}>
            <X size={20} aria-hidden /><span className="sr-only">Close project details</span>
          </button>

          <div className="pd__art" data-stagger>
            <ProjectArt project={project} fit="meet" />
          </div>

          <div className="pd__content">
            <header className="pd__head">
              <p className="pd__cat" data-stagger>{project.category}</p>
              <h2 id="pd-title" className="pd__title" data-stagger>{project.title}</h2>
              <dl className="pd__meta" data-stagger>
                <div><dt>Status</dt><dd>{project.status}</dd></div>
                {project.year && <div><dt>Year</dt><dd>{project.year}</dd></div>}
              </dl>
            </header>

            <p className="pd__summary" data-stagger>{project.summary}</p>

            {(project.problem || project.solution) && (
              <div className="pd__ps" data-stagger>
                {project.problem && <section><h3>Problem</h3><p>{project.problem}</p></section>}
                {project.solution && <section><h3>Solution</h3><p>{project.solution}</p></section>}
              </div>
            )}

            <section className="pd__block" data-stagger>
              <h3>Key features</h3>
              <ul className="pd__features">
                {project.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </section>

            <section className="pd__block" data-stagger>
              <h3>Technology</h3>
              <ul className="tags">
                {project.stack.map((t) => <li className="tag" key={t}>{t}</li>)}
              </ul>
            </section>

            {project.note && <p className="pd__note" data-stagger>{project.note}</p>}

            {(project.repo || project.demo || project.doc) && (
              <div className="pd__actions" data-stagger>
                {project.demo && <Keycap primary label="Live demo" icon="↗" href={project.demo} newTab />}
                {project.repo && <Keycap label="View on GitHub" icon="↗" href={project.repo} newTab />}
                {project.doc && <Keycap label={project.doc.label} icon="▤" href={project.doc.url} newTab />}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
