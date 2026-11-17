import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles/global.css'; // first, so scene styles can override the base layer
import App from './App';

gsap.registerPlugin(ScrollTrigger);

// pins are measured at mount; web fonts arriving later change section heights, so re-measure once they land
document.fonts.ready.then(() => ScrollTrigger.refresh());

// a scroll-choreographed page manages its own position; restoring an old offset mid-intro is jarring
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
