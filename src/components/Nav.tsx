import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Keycap } from './Keycap';
import { profile, sections } from '../data/portfolio';
import './nav.css';

/** Fixed header: monogram, section links with scroll-spy, resume. Collapses to a sheet on small screens. */
/**
 * Scroll to a section. A pinned section (Journey) is held at its pin's END while you are below it,
 * so a plain #hash jump would land on its last milestone; its .pin-spacer wrapper marks the true start.
 */
function goTo(e: React.MouseEvent, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const anchor = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const top = anchor.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', `#${id}`);
}

export function Nav() {
  const [active, setActive] = useState<string>('intro');
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`nav ${open ? 'is-open' : ''}`} data-intro="nav">
      <button
        ref={toggleRef}
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="nav-links"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
      </button>
      <nav id="nav-links" className="nav__links" aria-label="Sections">
        <ol>
          {sections.slice(1).map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? 'true' : undefined}
                onClick={(e) => { setOpen(false); goTo(e, s.id); }}
              >
                <span className="nav__num">0{i + 2}</span>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
        <Keycap className="nav__resume" size="sm" label="Resume" icon="↓" href={profile.resume} newTab />
      </nav>
    </header>
  );
}
