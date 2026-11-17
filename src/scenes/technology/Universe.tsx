import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { X, ArrowUpRight } from 'lucide-react';
import { domains, projects, techs, type Tech } from '../../data/portfolio';
import { useStageContext } from '../../hooks/useStage';
import type { OpenProject } from '../../App';
import { reducedMotion } from '../../utils/env';
import { iconFor, displayColor } from './icons';
import './universe.css';

type Selection = { kind: 'tech'; index: number } | { kind: 'domain'; id: string } | null;

const usedIn = (t: Tech) =>
  projects.filter((p) => p.stack.some((s) => t.matches.some((m) => s.toLowerCase() === m.toLowerCase())));

/**
 * Scene 02. The technologies float as 3D logo keycaps in a dark room (drawn by the shared
 * Stage, see gl/UniverseRoom.ts). Each keycap is overlaid by a real <button> that tracks its
 * projected rect every frame, so the scene is keyboard and screen-reader operable. The
 * domain index on the left flank highlights every keycap in that domain.
 */
export function Universe({ onOpenProject, flat }: { onOpenProject: OpenProject; flat: boolean }) {
  const stage = useStageContext();
  const section = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const keyRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Selection>(null);

  // hand the room to the stage once, then follow it every frame
  useEffect(() => {
    if (!stage || !field.current) return;
    stage.buildUniverse(techs);
    stage.bindSections({
      universe: field.current,
      journey: document.getElementById('journey'),
      finale: document.getElementById('contact'),
    });
    const fieldEl = field.current;
    // beside the room (wide screens) the domain index needs a clear strip; below it (phones) it doesn't
    const index = section.current!.querySelector<HTMLElement>('.universe__index')!;
    const measure = () => stage.setLeftReserve(
      matchMedia('(max-width: 860px)').matches ? 0 : (index.getBoundingClientRect().right + 12) / innerWidth,
    );
    measure();
    document.fonts.ready.then(measure);
    addEventListener('resize', measure);
    const off = stage.onFrame((s) => {
      const r = fieldEl.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      s.cardScreens.forEach((c, i) => {
        const el = keyRefs.current[i];
        if (!el) return;
        el.style.width = `${c.w.toFixed(1)}px`;
        el.style.height = `${c.h.toFixed(1)}px`;
        el.style.transform = `translate3d(${(c.x - r.left - c.w / 2).toFixed(1)}px, ${(c.y - r.top - c.h / 2).toFixed(1)}px, 0)`;
      });
    });
    return () => { off(); removeEventListener('resize', measure); };
  }, [stage]);

  // selection → which keycaps light up, and whether the room slides aside for the panel
  useEffect(() => {
    if (!stage) return;
    const lit = !sel ? [] : sel.kind === 'tech' ? [sel.index]
      : techs.map((t, i) => (t.domain === sel.id ? i : -1)).filter((i) => i >= 0);
    stage.setFocus(lit, !!sel);
  }, [stage, sel]);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.universe__head .mask > *', {
        yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: section.current, start: 'top 75%', once: true },
      });
      // the flank text arrives as the room settles (~2s)
      gsap.from('.universe__index li, .universe__hint > *', {
        opacity: 0, x: -14, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 1.6,
        scrollTrigger: { trigger: field.current, start: 'top 55%', once: true },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  const close = () => {
    if (sel?.kind === 'tech') keyRefs.current[sel.index]?.focus();
    setSel(null);
  };

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      // Esc belongs to the project dialog while it is open
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      close();
    };
    addEventListener('keydown', onKey);
    if (matchMedia('(max-width: 860px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }
    return () => removeEventListener('keydown', onKey);
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const tech = sel?.kind === 'tech' ? techs[sel.index] : null;
  const domain = sel?.kind === 'domain'
    ? domains.find((d) => d.id === sel.id) ?? null
    : tech ? domains.find((d) => d.id === tech.domain) ?? null : null;

  return (
    <section
      id="universe"
      ref={section}
      className={`universe section ${flat ? 'universe--flat' : ''} ${sel ? 'has-active' : ''}`}
      aria-labelledby="universe-title"
    >
      <div className="section__inner universe__head">
        <p className="eyebrow"><b>02</b> Technology</p>
        <h2 id="universe-title" className="display">
          <span className="mask"><span>The engineering</span></span>
          <span className="mask"><span><em>universe</em></span></span>
        </h2>
        <p className="lede">
          The tools behind the work, from models and agents to APIs, data and cloud. Select a keycap
          to see how deep it goes and where it has shipped, or pick a domain to light up its stack.
        </p>
      </div>

      <div className="universe__stage">
        <div className="universe__field" ref={field}>
          <ul className="keys" aria-label="Technologies">
            {techs.map((t, i) => {
              const icon = iconFor(t.icon);
              const on = sel?.kind === 'tech' && sel.index === i;
              return (
                <li key={t.id}>
                  <button
                    ref={(el) => { keyRefs.current[i] = el; }}
                    className={`key ${on ? 'is-active' : ''}`}
                    aria-expanded={on}
                    aria-controls="universe-panel"
                    aria-label={`${t.label}, ${t.level === 'practical' ? 'hands-on' : 'familiar'}`}
                    onPointerEnter={() => stage?.setHovered(i)}
                    onPointerLeave={() => stage?.setHovered(-1)}
                    onFocus={() => stage?.setHovered(i)}
                    onBlur={() => stage?.setHovered(-1)}
                    onClick={() => setSel(on ? null : { kind: 'tech', index: i })}
                  >
                    {/* visible only in the no-WebGL fallback; the 3D keycap shows the same face */}
                    <span className="key__face" aria-hidden="true">
                      {icon ? (
                        <svg viewBox="0 0 24 24" width="36" height="36"><path d={icon.path} fill={displayColor(icon.hex)} /></svg>
                      ) : (
                        <span className="key__type">{t.label}</span>
                      )}
                      {icon && <span className="key__label">{t.label}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <nav className="universe__index" aria-label="Domains">
            <ol>
              {domains.map((d, i) => {
                const on = sel?.kind === 'domain' && sel.id === d.id;
                return (
                  <li key={d.id}>
                    <button
                      className={on ? 'is-active' : undefined}
                      aria-pressed={on}
                      aria-controls="universe-panel"
                      onClick={() => setSel(on ? null : { kind: 'domain', id: d.id })}
                    >
                      <span>0{i + 1}</span>{d.short}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <p className="universe__hint" aria-hidden="true">
            <span><i className="legend__p" /> Hands-on</span>
            <span><i className="legend__f" /> Familiar</span>
          </p>
        </div>

        <div
          id="universe-panel"
          ref={panelRef}
          className="universe__panel"
          role="region"
          aria-label="Technology details"
          aria-live="polite"
        >
          {sel && domain && (
            <div className="panel" key={tech ? tech.id : domain.id}>
              <div className="panel__top">
                <p className="eyebrow">
                  {tech
                    ? <><b>{tech.level === 'practical' ? 'Hands-on' : 'Familiar'}</b> {domain.short}</>
                    : <><b>Domain</b> {domain.short}</>}
                </p>
                <button className="panel__close" onClick={close}>
                  <X size={18} aria-hidden /><span className="sr-only">Close details</span>
                </button>
              </div>
              <h3 className="panel__title">{tech ? tech.label : domain.name}</h3>
              <p className="panel__desc">{domain.description}</p>

              {tech ? (
                <TechProjects tech={tech} onOpenProject={onOpenProject} />
              ) : (
                <>
                  <div className="panel__group">
                    <h4>Hands-on</h4>
                    <ul className="tags">
                      {domain.skills.filter((s) => s.level === 'practical').map((s) => <li key={s.name} className="tag tag--practical">{s.name}</li>)}
                    </ul>
                  </div>
                  {domain.skills.some((s) => s.level === 'familiar') && (
                    <div className="panel__group">
                      <h4>Familiar</h4>
                      <ul className="tags">
                        {domain.skills.filter((s) => s.level === 'familiar').map((s) => <li key={s.name} className="tag tag--familiar">{s.name}</li>)}
                      </ul>
                    </div>
                  )}
                  <ProjectList ids={domain.projects} onOpenProject={onOpenProject} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TechProjects({ tech, onOpenProject }: { tech: Tech; onOpenProject: OpenProject }) {
  const list = usedIn(tech);
  if (!list.length) return <p className="panel__note">On the resume; no project on this site uses it yet.</p>;
  return <ProjectList ids={list.map((p) => p.id)} onOpenProject={onOpenProject} />;
}

function ProjectList({ ids, onOpenProject }: { ids: string[]; onOpenProject: OpenProject }) {
  const list = projects.filter((p) => ids.includes(p.id));
  if (!list.length) return null;
  return (
    <div className="panel__group">
      <h4>In projects</h4>
      <ul className="panel__projects">
        {list.map((p) => (
          <li key={p.id}>
            <button onClick={(e) => onOpenProject(p.id, e.currentTarget.getBoundingClientRect())}>
              <span>{p.title}</span>
              <ArrowUpRight size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
