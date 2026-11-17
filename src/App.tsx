import { useCallback, useState } from 'react';
import { IntroOverlay, introSupported } from './intro/IntroOverlay';
import { StageContext, useCreateStage } from './hooks/useStage';
import { usePointerVars } from './hooks/usePointerVars';
import { Nav } from './components/Nav';
import { Hero } from './scenes/hero/Hero';
import { Universe } from './scenes/technology/Universe';
import { Journey } from './scenes/timeline/Journey';
import { Projects } from './scenes/projects/Projects';
import { ProjectDialog } from './scenes/projects/ProjectDialog';
import { About } from './scenes/about/About';
import { Finale } from './scenes/finale/Finale';
import { projects } from './data/portfolio';

export interface OpenProject {
  (id: string, origin?: DOMRect): void;
}

export default function App() {
  const { canvasRef, stage, failed } = useCreateStage();
  const [open, setOpen] = useState<{ id: string; origin?: DOMRect } | null>(null);
  // the title sequence: run 0 plays on first visit; Replay mounts a fresh run
  const [intro, setIntro] = useState({ run: 0, replay: false, showing: true });
  const introDone = useCallback(() => setIntro((s) => ({ ...s, showing: false })), []);
  const replayIntro = useCallback(() => setIntro((s) => ({ run: s.run + 1, replay: true, showing: true })), []);
  const [canReplay] = useState(introSupported);
  usePointerVars();

  const openProject = useCallback<OpenProject>((id, origin) => setOpen({ id, origin }), []);
  const project = open ? projects.find((p) => p.id === open.id) ?? null : null;

  return (
    <StageContext.Provider value={stage}>
      <a className="skip-link" href="#main">Skip to content</a>
      <canvas ref={canvasRef} className="stage" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main id="main">
        <Hero onReplay={canReplay ? replayIntro : undefined} />
        <Universe onOpenProject={openProject} flat={failed} />
        <Journey />
        <Projects onOpenProject={openProject} />
        <About />
        <Finale />
      </main>
      {intro.showing && <IntroOverlay key={intro.run} replay={intro.replay} onDone={introDone} />}
      <ProjectDialog project={project} origin={open?.origin} onClose={() => setOpen(null)} />
    </StageContext.Provider>
  );
}
