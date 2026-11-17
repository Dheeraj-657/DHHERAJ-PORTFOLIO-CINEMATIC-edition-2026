// The one WebGL stage behind the whole page.
//
// A single renderer, a single canvas (position: fixed) and a single loop (gsap.ticker,
// so DOM animations and the GPU share one requestAnimationFrame). Scenes don't own GL
// contexts; they feed the stage state (intro progress, which keycap is hovered) and read
// back what they need (keycap screen rects for the accessible DOM button layer).

import {
  AdditiveBlending, BufferAttribute, BufferGeometry, MathUtils, Mesh, PerspectiveCamera,
  PlaneGeometry, Points, Scene, ShaderMaterial, Vector2, WebGLRenderer,
} from 'three';
import { gsap } from 'gsap';
import { atmosphereVertex, atmosphereFragment, particleVertex, particleFragment } from '../shaders';
import { damp, nextPixelRatio, visibleFraction, clamp } from '../utils/math';
import type { Tech } from '../data/portfolio';
import { sceneState } from '../animations/sceneState';
import { UniverseRoom, type CardScreen } from './UniverseRoom';

export interface StageOptions {
  tier: 'low' | 'mid' | 'high';
  reduced: boolean;
  onContextLost: () => void;
}

type FrameListener = (stage: Stage) => void;

const PARTICLES = { low: 900, mid: 1800, high: 4200 };
const MAX_PR = { low: 1, mid: 1.5, high: 2 };
const CAM_START = 6;
const CAM_TRAVEL = 92;       // world units the camera dollies across the full page
const UNI_DEPTH = 9;         // distance of the universe room's front plane from the camera

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly camera: PerspectiveCamera;

  private scene = new Scene();
  private atmosphere: ShaderMaterial;
  private particleMat: ShaderMaterial;
  private room: UniverseRoom | null = null;
  private disposables: { dispose(): void }[] = [];

  private sections: { universe?: HTMLElement; journey?: HTMLElement; finale?: HTMLElement } = {};
  private listeners = new Set<FrameListener>();
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private uniVisible = 0;
  private finale = 0;
  private cool = 0;
  private uniShift = 0;
  private uniScale = 1;
  private shiftLeft = false;
  private time = 0;
  private pr: number;
  private frameAcc = 0;
  private frameCount = 0;
  private lastScroll = -1;
  private dirty = true;
  private alive = true;

  constructor(private canvas: HTMLCanvasElement, private opts: StageOptions) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: opts.tier === 'high',
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setClearColor(0x050505, 1);
    this.pr = Math.min(window.devicePixelRatio || 1, MAX_PR[opts.tier]);
    this.renderer.setPixelRatio(this.pr);

    this.camera = new PerspectiveCamera(50, 1, 0.1, 120);
    this.camera.position.set(0, 0, CAM_START);
    this.scene.add(this.camera);

    // backdrop
    this.atmosphere = new ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uGlow: { value: 0 }, uWarm: { value: 1 }, uScroll: { value: 0 }, uCool: { value: 0 },
        uShafts: { value: opts.tier === 'low' ? 0 : 1 },
        uRes: { value: new Vector2(1, 1) }, uPointer: { value: new Vector2() },
      },
    });
    const backdrop = new Mesh(new PlaneGeometry(2, 2), this.atmosphere);
    backdrop.frustumCulled = false;
    backdrop.renderOrder = -10;
    this.scene.add(backdrop);
    this.disposables.push(backdrop.geometry, this.atmosphere);

    // dust
    this.particleMat = this.buildParticles(PARTICLES[opts.tier]);

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    canvas.addEventListener('webglcontextlost', this.onLost);
    gsap.ticker.add(this.tick);
  }

  // ── public API ────────────────────────────────────────────────────────────

  bindSections(s: { universe?: HTMLElement | null; journey?: HTMLElement | null; finale?: HTMLElement | null }) {
    this.sections = { universe: s.universe ?? undefined, journey: s.journey ?? undefined, finale: s.finale ?? undefined };
  }

  /** builds the logo room once (idempotent: React StrictMode re-runs effects) */
  buildUniverse(techs: Tech[]) {
    if (this.room) return;
    const room = new UniverseRoom(techs, { tier: this.opts.tier, reduced: this.opts.reduced });
    room.group.visible = false;
    this.camera.add(room.group);
    this.room = room;
    this.layoutRoom();
    // faces carry real type: paint them once the web fonts are in
    document.fonts.ready.then(() => { if (this.alive) { room.paintFaces(); this.dirty = true; } });
  }

  /** keycap rects in viewport px, refreshed every rendered frame */
  get cardScreens(): CardScreen[] { return this.room?.screens ?? []; }

  setHovered(i: number) { this.room?.setHovered(i); this.dirty = true; }

  /** highlight a set of keycaps; `shift` slides the room left to make space for the detail panel */
  setFocus(indices: number[], shift: boolean) {
    this.room?.setFocus(indices);
    this.shiftLeft = shift;
    this.dirty = true;
  }

  onFrame(fn: FrameListener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    gsap.ticker.remove(this.tick);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.room?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.listeners.clear();
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private buildParticles(count: number) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    const red = new Float32Array(count);
    const zMin = -(CAM_TRAVEL + 60);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = zMin + Math.random() * (CAM_START + 4 - zMin);
      seed[i] = Math.random();
      size[i] = 0.03 + Math.pow(Math.random(), 3) * 0.11;
      red[i] = Math.random();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
    geo.setAttribute('aSize', new BufferAttribute(size, 1));
    geo.setAttribute('aRed', new BufferAttribute(red, 1));
    const mat = new ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uPR: { value: this.pr }, uScale: { value: 400 },
        uReveal: { value: 0 }, uRedMix: { value: 0.07 },
      },
    });
    const points = new Points(geo, mat);
    points.frustumCulled = false;
    this.scene.add(points);
    this.disposables.push(geo, mat);
    return mat;
  }

  private halfExtents() {
    const halfH = Math.tan(MathUtils.degToRad(this.camera.fov / 2)) * UNI_DEPTH;
    return { halfH, halfW: halfH * this.camera.aspect };
  }

  private leftReserve = 0;

  /** the DOM domain index takes this fraction of the screen's left edge: keep keycaps clear of it */
  setLeftReserve(f: number) {
    if (Math.abs(f - this.leftReserve) < 0.004) return;
    this.leftReserve = f;
    this.layoutRoom();
    this.dirty = true;
  }

  private layoutRoom() {
    const { halfW, halfH } = this.halfExtents();
    this.room?.layout(halfW, halfH, UNI_DEPTH, this.leftReserve);
  }

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.atmosphere.uniforms.uRes.value.set(w, h);
    // world-size → pixel-size factor for point sprites
    this.particleMat.uniforms.uScale.value = h / (2 * Math.tan(MathUtils.degToRad(this.camera.fov / 2)));
    this.layoutRoom();
    this.dirty = true;
  };

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    this.dirty = true;
  };

  private onLost = (e: Event) => {
    e.preventDefault();
    this.dispose();
    this.opts.onContextLost();
  };

  private tick = (_time: number, deltaMs: number) => {
    if (!this.alive || sceneState.introActive) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    const reduced = this.opts.reduced;
    const vh = window.innerHeight;

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    const scroll = clamp(window.scrollY / maxScroll);
    if (scroll !== this.lastScroll) { this.lastScroll = scroll; this.dirty = true; }

    // reduced motion: the scene is a still image, re-rendered only when something changes
    if (reduced && !this.dirty) return;
    if (!reduced) this.time += dt;

    const p = this.pointer;
    p.x = reduced ? 0 : damp(p.x, p.tx, 3, dt);
    p.y = reduced ? 0 : damp(p.y, p.ty, 3, dt);

    // camera: dolly through the dust with scroll, sway with the pointer
    const cam = this.camera;
    cam.position.z = CAM_START - (reduced ? 0 : scroll * CAM_TRAVEL);
    cam.position.x = p.x * 0.35;
    cam.position.y = p.y * 0.22;
    cam.rotation.y = -p.x * 0.035;
    cam.rotation.x = p.y * 0.025;

    // section-driven state
    const uniEl = this.sections.universe;
    let uniRect: DOMRect | null = null;
    if (uniEl) {
      uniRect = uniEl.getBoundingClientRect();
      this.uniVisible = this.ease(this.uniVisible, visibleFraction(uniRect.top, uniRect.height, vh), 8, dt);
    }
    const finEl = this.sections.finale;
    if (finEl) {
      const r = finEl.getBoundingClientRect();
      this.finale = clamp(visibleFraction(r.top, r.height, vh) * 1.2);
    }

    const jEl = this.sections.journey;
    if (jEl) {
      const r = jEl.getBoundingClientRect();
      this.cool = this.ease(this.cool, clamp(visibleFraction(r.top, r.height, vh) * 1.6), 4, dt);
    }

    const a = this.atmosphere.uniforms;
    a.uTime.value = this.time;
    a.uGlow.value = sceneState.glow;
    a.uWarm.value = 1 + this.finale * 0.9;
    a.uScroll.value = scroll;
    a.uCool.value = this.cool;
    a.uPointer.value.set(p.x, p.y);

    const pu = this.particleMat.uniforms;
    pu.uTime.value = this.time;
    pu.uReveal.value = sceneState.particles;
    pu.uRedMix.value = 0.07 + this.finale * 0.28 + this.cool * 0.06; // share of blue sparks in the dust

    this.updateRoom(dt, uniRect, vh);

    this.renderer.render(this.scene, cam);
    this.dirty = false;
    this.listeners.forEach((fn) => fn(this));
    this.adapt(deltaMs);
  };

  /** damped in motion mode, immediate in reduced-motion mode (where frames are only rendered on change) */
  private ease(cur: number, target: number, rate: number, dt: number) {
    return this.opts.reduced ? target : damp(cur, target, rate, dt);
  }

  private updateRoom(dt: number, rect: DOMRect | null, vh: number) {
    const room = this.room;
    if (!room) return;
    const show = rect !== null && this.uniVisible > 0.01;
    room.group.visible = show;
    if (!show || !rect) return;

    // the opening is time-based, not scroll-scrubbed: it starts once, when the room is
    // 20% on screen, so a fast flick can't skip it and a slow drag can't smear it
    if (!room.started && this.uniVisible > 0.2) room.start();

    // the room lives in camera space, offset so it scrolls with its section
    const { halfW, halfH } = this.halfExtents();
    const worldPerPx = (2 * halfH) / vh;
    const sectionCentre = rect.top + rect.height / 2 - vh / 2;
    const wide = this.camera.aspect >= 0.9;
    // with the detail panel open the room steps back and aside, rather than sliding off the left edge
    const aside = this.shiftLeft && wide;
    this.uniShift = this.ease(this.uniShift, aside ? -halfW * 0.17 : 0, 4, dt);
    this.uniScale = this.ease(this.uniScale, aside ? 0.84 : 1, 4, dt);
    room.group.position.set(this.uniShift, -sectionCentre * worldPerPx, -UNI_DEPTH);
    room.group.scale.setScalar(this.uniScale);
    room.group.rotation.set(-this.pointer.y * 0.06, this.pointer.x * 0.1, 0);

    room.update(dt, this.time, this.camera, window.innerWidth, vh);
    // keep rendering while the opening plays, even in reduced-motion mode's on-demand loop
    if (this.uniVisible < 0.999) this.dirty = true;
  }

  /** adaptive resolution: every ~90 frames, step the pixel ratio toward what the GPU sustains */
  private adapt(deltaMs: number) {
    if (this.opts.reduced || document.hidden) return;
    this.frameAcc += deltaMs;
    if (++this.frameCount < 90) return;
    const avg = this.frameAcc / this.frameCount;
    this.frameAcc = 0;
    this.frameCount = 0;
    const max = Math.min(window.devicePixelRatio || 1, MAX_PR[this.opts.tier]);
    const next = nextPixelRatio(this.pr, avg, max);
    if (next !== this.pr) {
      this.pr = next;
      this.renderer.setPixelRatio(next);
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.particleMat.uniforms.uPR.value = next;
    }
  }
}
