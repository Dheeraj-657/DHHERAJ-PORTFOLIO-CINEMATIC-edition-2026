// THUNDERFORGE: the opening title sequence.
//
// Two lightning storms strike in from opposite sides of a cloud-filled sky, collide at the
// centre, and the energy of the impact forges DHEERAJ as extruded chrome type. Everything is
// real-time and procedural: storm (fbm shader lit by the bolts), lightning (midpoint-displaced
// ribbons, re-struck every few frames), sparks and smoke (GPU particles), chrome (PBR +
// environment map) and a final grade (bloom, shockwave refraction, flash, grain).
//
// One timeline, `T`, drives every element from a single clock. No audio by design.

import {
  ACESFilmicToneMapping, AdditiveBlending, DoubleSide, BufferAttribute, BufferGeometry, CanvasTexture, Color,
  DirectionalLight, ExtrudeGeometry, Group, Mesh, MeshPhysicalMaterial, NormalBlending,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, Points, Scene, ShaderMaterial,
  SRGBColorSpace, Vector2, Vector3, Vector4, WebGLRenderer, MathUtils, type Texture,
} from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import typeface from '../../assets/name-typeface.json';
import { strike, boltPoints, rng, type V3, type Strike } from './lightning';
import {
  cloudVertex, cloudFragment, boltVertex, boltFragment, sparkVertex, sparkFragment,
  smokeVertex, smokeFragment, fxShader,
} from './shaders';

/** the beats, in seconds */
export const T = {
  credit: 0.5, creditOut: 2.4,
  approach: 1.1,     // bolts start crawling in from the edges
  arcs: 3.5,         // heads close enough to jump arcs between them
  hold: 4.05,        // anticipation: the energy sucks back for a breath
  impact: 4.5,
  gather: 4.95,      // sparks turn and spiral into the letter shapes
  reveal: 5.1, revealEnd: 6.8,
  cool: 8.3,         // molten → chrome
  sweep: 6.9, sweepEnd: 8.2,
  subtitle: 7.3,
  pulse: 8.6,
  end: 10.0,
};

const NAME = 'DHEERAJ';
const TEXT_SIZE = 3;
const TEXT_DEPTH = 1.05;
const BLUE = new Color('#6fb6ff');
const VIOLET = new Color('#b9a2ff');
const ICE = new Color('#cfe6ff');
const MAX_SEGMENTS = 7000;

export interface ThunderOptions {
  tier: 'low' | 'mid' | 'high';
  /** DOM nodes the sequence drives (crisp text stays in the DOM) */
  credit: HTMLElement;
  subtitle: HTMLElement;
  onComplete: () => void;
  /** start partway in (seconds); used by ?introAt= for reviewing a beat */
  startAt?: number;
  /** freeze the clock at `startAt` (review only) */
  hold?: boolean;
}

interface BoltState {
  strike: Strike | null;
  next: number;      // time of the next re-strike
  flicker: number;
  seed: number;
  from: V3;
  to: V3;
}

const span = (t: number, a: number, b: number) => MathUtils.clamp((t - a) / (b - a), 0, 1);
const smooth = (x: number) => x * x * (3 - 2 * x);

export class ThunderIntro {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(38, 1, 0.1, 200);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private fx: ShaderPass;
  private disposables: { dispose(): void }[] = [];
  private t = 0;
  private disposed = false;
  private completed = false;
  private raf = 0;
  private last = 0;
  private rand = rng(20261117);

  // storm
  private clouds: ShaderMaterial;
  // lightning
  private boltGeo = new BufferGeometry();
  private boltPos = new Float32Array(MAX_SEGMENTS * 6 * 3);
  private boltSide = new Float32Array(MAX_SEGMENTS * 6);
  private boltI = new Float32Array(MAX_SEGMENTS * 6);
  private boltCol = new Float32Array(MAX_SEGMENTS * 6 * 3);
  private segs = 0;
  private left: BoltState;
  private right: BoltState;
  private bridges: BoltState[] = [];
  private letterArcs: { pts: number[]; born: number; life: number }[] = [];
  private nextLetterArc = 0;
  // title
  private title = new Group();
  private titleMat: MeshPhysicalMaterial;
  private titleU = { uReveal: { value: 0 }, uHeat: { value: 1 }, uSweep: { value: -20 }, uSweepAmt: { value: 0 }, uPulse: { value: 0 } };
  private titleW = 1;
  private titleH = 1;
  private edgePts: number[][] = []; // per-letter front-surface sample points (for arcs)
  // particles
  private sparks: ShaderMaterial;
  private smoke: ShaderMaterial;
  // lights
  private lightL = new PointLight(BLUE, 0, 40, 1.6);
  private lightR = new PointLight(VIOLET, 0, 40, 1.6);
  private impactLight = new PointLight('#e8f1ff', 0, 60, 1.4);
  private sweepLight = new PointLight('#ffffff', 0, 30, 1.6);
  private forgeLight = new PointLight('#ff9a4a', 0, 25, 1.6);
  private flashes: { at: number; uv: [number, number]; power: number }[];
  private zFit = 16;
  private tmp = new Vector3();

  constructor(private canvas: HTMLCanvasElement, private opts: ThunderOptions) {
    const hi = opts.tier === 'high';
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? 1.75 : opts.tier === 'mid' ? 1.4 : 1));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.setClearColor(0x000000, 1);

    // chrome reflects a soft studio room: dark metal with crisp highlights
    const pmrem = new PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    this.scene.environment = env;
    this.disposables.push(env, pmrem);

    this.clouds = this.buildStorm(hi ? 5 : 3);
    this.titleMat = this.buildTitle();
    this.buildBolts();
    this.sparks = this.buildSparks(hi ? 4200 : opts.tier === 'mid' ? 2400 : 1100);
    this.smoke = this.buildSmoke(hi ? 70 : 36);

    const key = new DirectionalLight('#dfe8ff', 0.9);
    key.position.set(-5, 7, 12);
    const rimL = new PointLight('#3d8bff', 160, 40, 1.6);
    rimL.position.set(-11, 3, -4);
    const rimR = new PointLight('#9a7bff', 140, 40, 1.6);
    rimR.position.set(11, 2, -4);
    this.impactLight.position.set(0, 0.4, 4);
    this.forgeLight.position.set(0, 0, 5);
    this.scene.add(key, rimL, rimR, this.lightL, this.lightR, this.impactLight, this.sweepLight, this.forgeLight);

    this.left = { strike: null, next: 0, flicker: 0, seed: 1, from: [-30, 9, -8], to: [-22, 4, -4] };
    this.right = { strike: null, next: 0, flicker: 0, seed: 2, from: [30, 8, -8], to: [22, 3, -4] };
    for (let i = 0; i < 3; i++) this.bridges.push({ strike: null, next: 0, flicker: 0, seed: 10 + i, from: [0, 0, 0], to: [0, 0, 0] });

    // distant cloud-to-cloud flashes, scheduled so the sky is never static
    this.flashes = [
      { at: 0.35, uv: [0.78, 0.82], power: 0.9 }, { at: 1.4, uv: [0.2, 0.75], power: 1.2 },
      { at: 2.2, uv: [0.62, 0.9], power: 0.7 }, { at: 3.0, uv: [0.35, 0.86], power: 1.0 },
      { at: 6.4, uv: [0.85, 0.7], power: 0.6 }, { at: 7.9, uv: [0.12, 0.8], power: 0.7 },
      { at: 9.2, uv: [0.7, 0.85], power: 0.5 },
    ];

    // post: bloom carries the electricity; the fx pass carries the impact
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new Vector2(256, 256), 0.8, 0.55, 0.72);
    this.composer.addPass(this.bloom);
    this.fx = new ShaderPass(fxShader);
    this.composer.addPass(this.fx);
    this.composer.addPass(new OutputPass());

    this.resize();
    addEventListener('resize', this.resize);
    this.t = opts.startAt ?? 0;
    if (opts.hold) (window as unknown as { __thunder: unknown }).__thunder = this; // review hook
  }

  play() {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      const dt = Math.min((now - this.last) / 1000, 1 / 20);
      this.last = now;
      if (!this.opts.hold) this.t += dt;
      this.frame(dt);
      if (this.t >= T.end) this.finish();
      // keeps rendering after completion: the overlay fades over a live scene, not a frozen frame
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** end now (Skip / Esc): signals completion; the scene keeps animating under the fade */
  skip() { this.finish(); }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.resize);
    this.disposables.forEach((d) => d.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    // the intro's context is not reused: hand the GPU memory back straight away
    this.renderer.forceContextLoss();
  }

  // ── build ────────────────────────────────────────────────────────────────

  private buildStorm(octaves: number) {
    const mat = new ShaderMaterial({
      vertexShader: cloudVertex,
      fragmentShader: cloudFragment,
      defines: { OCTAVES: octaves },
      depthTest: false, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uAspect: { value: 1 }, uCam: { value: new Vector3() }, uAmbient: { value: 0 },
        uL: { value: Array.from({ length: 5 }, () => new Vector4(0, 0, 0, 0.3)) },
        uLC: { value: Array.from({ length: 5 }, () => new Color(0, 0, 0)) },
      },
    });
    const m = new Mesh(new PlaneGeometry(2, 2), mat);
    m.frustumCulled = false;
    m.renderOrder = -10;
    this.scene.add(m);
    this.disposables.push(m.geometry, mat);
    return mat;
  }

  private buildTitle() {
    const font = new FontLoader().parse(typeface as never);
    const res = (typeface as { resolution: number }).resolution;
    const glyphs = (typeface as { glyphs: Record<string, { ha: number }> }).glyphs;
    const mat = new MeshPhysicalMaterial({
      color: '#59616d', metalness: 1, roughness: 0.24, clearcoat: 0.5, clearcoatRoughness: 0.14,
      envMapIntensity: 0.55,
    });
    // the forge: dissolve-in along a noise field, a glowing seam at the dissolve edge,
    // molten heat that cools to chrome, a light sweep and a final pulse
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.titleU);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWPos;
          uniform float uReveal, uHeat, uSweep, uSweepAmt, uPulse;
          float fh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float fn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float forge = fn(vWPos * 1.6) * 0.7 + fn(vWPos * 5.0) * 0.3;
          float edge = uReveal * 1.3 - forge;
          if (edge < 0.0) discard;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float seam = 1.0 - smoothstep(0.0, 0.09, edge);
          vec3 molten = mix(vec3(1.0, 0.36, 0.08), vec3(1.0, 0.82, 0.55), uHeat);
          totalEmissiveRadiance += molten * uHeat * uHeat * 0.85 * (0.55 + 0.45 * fn(vWPos * 3.0));
          totalEmissiveRadiance += vec3(0.55, 0.8, 1.0) * seam * 2.6;
          float band = exp(-pow(vWPos.x * 0.85 + vWPos.y * 0.45 - uSweep, 2.0) * 2.2);
          totalEmissiveRadiance += vec3(0.85, 0.92, 1.0) * band * uSweepAmt * 0.55;
          totalEmissiveRadiance += vec3(0.35, 0.65, 1.0) * uPulse * 1.2;`);
    };
    this.disposables.push(mat);

    let x = 0;
    const meshes: Mesh[] = [];
    for (const ch of NAME) {
      const shapes = font.generateShapes(ch, TEXT_SIZE);
      const geo = new ExtrudeGeometry(shapes, {
        depth: TEXT_DEPTH, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.075, bevelSegments: 4, curveSegments: 10,
      });
      geo.translate(x, 0, 0);
      x += (glyphs[ch].ha / res) * TEXT_SIZE + TEXT_SIZE * 0.07; // a little extra tracking: monumental, not cramped
      const mesh = new Mesh(geo, mat);
      meshes.push(mesh);
      this.title.add(mesh);
      this.disposables.push(geo);
    }
    // centre the word, front faces slightly toward camera
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    meshes.forEach((m) => {
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox!;
      minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x);
      minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
    });
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    meshes.forEach((m) => m.geometry.translate(-cx, -cy, -TEXT_DEPTH / 2));
    this.titleW = maxX - minX;
    this.titleH = maxY - minY;
    this.scene.add(this.title);

    // sample each letter's front surface: spark targets and the anchors for crawling arcs
    const p = new Vector3(), n = new Vector3();
    meshes.forEach((m) => {
      const s = new MeshSurfaceSampler(m).build();
      const pts: number[] = [];
      for (let k = 0; pts.length < 240 * 3 && k < 4000; k++) {
        s.sample(p, n);
        if (n.z > 0.5) pts.push(p.x, p.y, p.z + 0.02);
      }
      this.edgePts.push(pts);
    });
    return mat;
  }

  private buildBolts() {
    const g = this.boltGeo;
    g.setAttribute('position', new BufferAttribute(this.boltPos, 3));
    g.setAttribute('aSide', new BufferAttribute(this.boltSide, 1));
    g.setAttribute('aI', new BufferAttribute(this.boltI, 1));
    g.setAttribute('aCol', new BufferAttribute(this.boltCol, 3));
    const mat = new ShaderMaterial({
      vertexShader: boltVertex, fragmentShader: boltFragment,
      // ribbons wind whichever way the bolt turns: both faces must draw
      transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
    });
    const mesh = new Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    this.scene.add(mesh);
    this.disposables.push(g, mat);
  }

  private buildSparks(count: number) {
    const vel = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    const all = this.edgePts.flat();
    const nT = all.length / 3;
    for (let i = 0; i < count; i++) {
      // radial burst, flattened toward the screen plane so it reads as a disc of fire
      const a = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() ** 1.6 * 22;
      const up = (Math.random() - 0.4) * 0.6;
      vel[i * 3] = Math.cos(a) * speed;
      vel[i * 3 + 1] = Math.sin(a) * speed * 0.75 + up * speed;
      vel[i * 3 + 2] = (Math.random() - 0.3) * speed * 0.5;
      const k = Math.floor(Math.random() * nT) * 3;
      target[i * 3] = all[k]; target[i * 3 + 1] = all[k + 1]; target[i * 3 + 2] = all[k + 2];
      const gathers = Math.random() < 0.62;
      seed[i * 4] = gathers ? Math.random() * 1.1 : 99;
      seed[i * 4 + 1] = 0.018 + Math.random() ** 3 * 0.07;
      seed[i * 4 + 2] = 0.5 + Math.random() * 1.6;
      seed[i * 4 + 3] = Math.random();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aVel', new BufferAttribute(vel, 3));
    geo.setAttribute('aTarget', new BufferAttribute(target, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seed, 4));
    const mat = new ShaderMaterial({
      vertexShader: sparkVertex, fragmentShader: sparkFragment,
      transparent: true, blending: AdditiveBlending, depthWrite: false,
      uniforms: { uT: { value: -1 }, uG: { value: 0 }, uPR: { value: 1 }, uScale: { value: 500 }, uFade: { value: 1 } },
    });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    this.scene.add(pts);
    this.disposables.push(geo, mat);
    return mat;
  }

  private buildSmoke(count: number) {
    const pos = new Float32Array(count * 3);
    const dir = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 2.2;
      // most smoke behind the letters, a little drifting in front and clearing early
      const front = Math.random() < 0.18;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.6;
      pos[i * 3 + 2] = front ? 2 + Math.random() * 2 : -1.5 - Math.random() * 4;
      dir[i * 3] = Math.cos(a) * (1.2 + Math.random() * 2);
      dir[i * 3 + 1] = Math.sin(a) * 0.7 + 0.2;
      dir[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      seed[i * 4] = 3 + Math.random() * 6;
      seed[i * 4 + 1] = 0.6 + Math.random() * 1.4;
      seed[i * 4 + 2] = Math.random() * 6.28;
      seed[i * 4 + 3] = front ? 0.35 : 0.5 + Math.random() * 0.5;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aDir', new BufferAttribute(dir, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seed, 4));
    const tex = smokeTexture();
    const mat = new ShaderMaterial({
      vertexShader: smokeVertex, fragmentShader: smokeFragment,
      transparent: true, blending: NormalBlending, depthWrite: false,
      uniforms: { uT: { value: -1 }, uPR: { value: 1 }, uScale: { value: 500 }, uTex: { value: tex }, uLight: { value: new Color(0, 0, 0) }, uFade: { value: 1 } },
    });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 4;
    this.scene.add(pts);
    this.disposables.push(geo, mat, tex);
    return mat;
  }

  // ── per frame ────────────────────────────────────────────────────────────

  private resize = () => {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.clouds.uniforms.uAspect.value = w / h;
    this.fx.uniforms.uAspect.value = w / h;
    const pr = this.renderer.getPixelRatio();
    const scale = h / (2 * Math.tan(MathUtils.degToRad(this.camera.fov / 2)));
    this.sparks.uniforms.uPR.value = pr;
    this.sparks.uniforms.uScale.value = scale;
    this.smoke.uniforms.uPR.value = pr;
    this.smoke.uniforms.uScale.value = scale;
    // the hero framing: the word fills ~80% of the width (90% in portrait), never too tall
    const tanH = Math.tan(MathUtils.degToRad(this.camera.fov / 2));
    const fill = this.camera.aspect < 1 ? 0.9 : 0.8;
    const zW = this.titleW / (fill * 2 * tanH * this.camera.aspect);
    const zH = this.titleH / (0.42 * 2 * tanH);
    this.zFit = Math.max(zW, zH) + TEXT_DEPTH / 2;
  };

  private frame(dt: number) {
    const t = this.t;
    const now = performance.now() / 1000;

    // ── camera: wide establishing → push toward the strike → impact → orbit → hero
    const shake = t > T.impact ? 0.38 * Math.exp(-(t - T.impact) * 4.2) : 0;
    const wide = this.zFit * 2.1;
    let z: number, x = 0, y = 0.6;
    if (t < T.impact) {
      const k = smooth(span(t, 0, T.impact));
      z = MathUtils.lerp(wide, this.zFit * 1.35, k);
      y = MathUtils.lerp(1.6, 0.4, k);
    } else {
      const k = smooth(span(t, T.impact + 0.15, T.revealEnd + 0.8));
      z = MathUtils.lerp(this.zFit * 1.2, this.zFit, k) - 0.6 * Math.exp(-(t - T.impact) * 6); // jolt in on impact
      const orbit = (1 - smooth(span(t, T.reveal, T.cool))) * 2.6;
      x = Math.sin((t - T.reveal) * 0.5) * orbit * 0.6;
      y = 0.25 * (1 - k);
      // the hand-over: the camera eases back as the title becomes the site's hero
      z += Math.max(0, t - T.end) ** 1.5 * 2.2;
    }
    this.camera.position.set(
      x + (Math.random() - 0.5) * shake,
      y + (Math.random() - 0.5) * shake,
      z,
    );
    this.camera.lookAt(0, 0, 0);

    // ── lightning
    this.segs = 0;
    const approach = span(t, T.approach, T.hold);
    const accel = approach ** 2.2; // they gather speed as they close in
    const before = t < T.impact + 0.18;
    const holdDip = t > T.hold && t < T.impact ? 0.35 + 0.65 * smooth(span(t, T.impact - 0.12, T.impact)) : 1;
    const charge = 0.6 + 1.4 * smooth(span(t, T.arcs, T.impact)); // brighter, thicker as they near
    const after = t >= T.impact ? Math.max(0, 1 - (t - T.impact) / 0.18) : 1;
    if (t > T.approach - 0.2 && before) {
      const hL: V3 = [MathUtils.lerp(-15, -0.9, accel), MathUtils.lerp(4.5, 0.35, accel), MathUtils.lerp(-4, 0, accel)];
      const hR: V3 = [MathUtils.lerp(15, 0.9, accel), MathUtils.lerp(3.8, 0.35, accel), MathUtils.lerp(-4, 0, accel)];
      const iL = this.updateBolt(this.left, [-30, 8, -9], hL, now, 7, 8);
      const iR = this.updateBolt(this.right, [30, 7.5, -9], hR, now, 7, 9);
      const intro = smooth(span(t, T.approach - 0.2, T.approach + 0.6));
      this.drawStrike(this.left.strike!, BLUE, 0.34 * charge, iL * intro * holdDip * after * charge);
      this.drawStrike(this.right.strike!, VIOLET, 0.34 * charge, iR * intro * holdDip * after * charge);
      this.lightL.position.set(...hL);
      this.lightR.position.set(...hR);
      this.lightL.intensity = 320 * iL * intro * holdDip * after;
      this.lightR.intensity = 320 * iR * intro * holdDip * after;

      // arcs leap between the two heads as they close
      if (t > T.arcs) {
        const n = 1 + Math.floor(smooth(span(t, T.arcs, T.impact)) * 2.99);
        for (let i = 0; i < n; i++) {
          const b = this.bridges[i];
          const iB = this.updateBolt(b, hL, hR, now, 5, 2, 0.45);
          this.drawStrike(b.strike!, ICE, 0.16, iB * 0.9 * holdDip * after);
        }
      }
    } else {
      this.lightL.intensity = this.lightR.intensity = 0;
    }

    // ── impact: flash, shockwave, light, then the forge
    const sinceImpact = t - T.impact;
    const flash = sinceImpact >= 0 ? 0.58 * Math.exp(-sinceImpact * 14) : 0; // peak under 60%, gone in ~0.25s
    const pulse = t > T.pulse ? Math.exp(-(t - T.pulse) * 3.2) * smooth(span(t, T.pulse, T.pulse + 0.06)) : 0;
    this.impactLight.intensity = sinceImpact >= 0 ? 1600 * Math.exp(-sinceImpact * 7) : 0;
    this.fx.uniforms.uFlash.value = flash + pulse * 0.08;
    this.fx.uniforms.uShockR.value = sinceImpact >= 0 ? sinceImpact * 1.25 : -1;
    this.fx.uniforms.uShockA.value = sinceImpact >= 0 ? 0.028 * Math.exp(-sinceImpact * 1.8) : 0;
    this.fx.uniforms.uAberr.value = 0.0015 + shake * 0.02;
    this.fx.uniforms.uExposure.value = smooth(span(t, 0, 1.0));
    this.fx.uniforms.uTime.value = t;
    this.bloom.strength = 0.75 + 1.6 * Math.exp(-Math.max(0, sinceImpact) * 2.5) * (sinceImpact >= 0 ? 1 : 0) + pulse * 0.9 + (t < T.impact ? 0.5 * charge * approach : 0);

    // sparks and smoke
    this.sparks.uniforms.uT.value = sinceImpact;
    this.sparks.uniforms.uG.value = Math.max(0, t - T.gather);
    this.sparks.uniforms.uFade.value = 1 - smooth(span(t, T.revealEnd - 0.2, T.cool - 0.6));
    this.smoke.uniforms.uT.value = sinceImpact;
    this.smoke.uniforms.uFade.value = 1 - 0.55 * smooth(span(t, T.revealEnd, T.end));
    const smokeLit = Math.min(1, 0.6 * Math.exp(-Math.max(0, sinceImpact) * 2.5) + 0.12 * this.titleU.uHeat.value);
    (this.smoke.uniforms.uLight.value as Color).setRGB(0.3 * smokeLit, 0.38 * smokeLit, 0.55 * smokeLit);

    // the title: forged, cooled, swept, pulsed
    this.titleU.uReveal.value = smooth(span(t, T.reveal, T.revealEnd));
    this.titleU.uHeat.value = 1 - smooth(span(t, T.reveal + 0.4, T.cool));
    this.titleU.uSweep.value = MathUtils.lerp(-14, 14, smooth(span(t, T.sweep, T.sweepEnd)));
    this.titleU.uSweepAmt.value = Math.sin(Math.PI * span(t, T.sweep, T.sweepEnd));
    this.titleU.uPulse.value = pulse;
    this.forgeLight.intensity = 110 * this.titleU.uHeat.value * this.titleU.uReveal.value;
    this.sweepLight.position.set(this.titleU.uSweep.value * 0.9, 3, 5);
    this.sweepLight.intensity = 140 * this.titleU.uSweepAmt.value;

    // crawling arcs on the letters: dense while forging (tracing the shapes), sparse after
    if (t > T.reveal + 0.2) {
      const rate = t < T.cool ? 0.05 : 0.38;
      if (now > this.nextLetterArc) {
        this.nextLetterArc = now + rate * (0.5 + Math.random());
        const li = Math.floor(Math.random() * this.edgePts.length);
        const lj = Math.random() < 0.3 ? Math.min(this.edgePts.length - 1, li + 1) : li; // sometimes jump to the next letter
        const pa = pick(this.edgePts[li]), pb = pick(this.edgePts[lj]);
        if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 2.6) {
          this.letterArcs.push({ pts: boltPoints(pa, pb, 4, 0.4, Math.random), born: now, life: 0.08 + Math.random() * 0.14 });
        }
      }
      this.letterArcs = this.letterArcs.filter((a) => now - a.born < a.life);
      for (const a of this.letterArcs) this.addPath(a.pts, 0.07, 0.9 * (1 - (now - a.born) / a.life) + 0.3, ICE);
      if (pulse > 0.05) {
        // the final synchronized pulse: arcs light across every letter at once
        for (const pts of this.edgePts) this.addPath(boltPoints(pick(pts), pick(pts), 4, 0.4, Math.random), 0.07, pulse * 1.4, ICE);
      }
    }

    this.boltGeo.setDrawRange(0, this.segs * 6);
    for (const k of ['position', 'aSide', 'aI', 'aCol']) (this.boltGeo.getAttribute(k) as BufferAttribute).needsUpdate = true;

    // ── storm lighting: bolt heads, impact, distant flashes and the forge all light the clouds
    const cl = this.clouds.uniforms;
    cl.uTime.value = t;
    cl.uAmbient.value = 0.6 + 0.6 * smooth(span(t, 0, 2));
    (cl.uCam.value as Vector3).copy(this.camera.position);
    const L = cl.uL.value as Vector4[];
    const LC = cl.uLC.value as Color[];
    this.toUv(this.lightL.position, L[0]); L[0].z = this.lightL.intensity / 220; L[0].w = 0.45; LC[0].copy(BLUE);
    this.toUv(this.lightR.position, L[1]); L[1].z = this.lightR.intensity / 220; L[1].w = 0.45; LC[1].copy(VIOLET);
    L[2].x = 0.5; L[2].y = 0.52; L[2].z = this.impactLight.intensity / 1300 + pulse * 0.35 + this.forgeLight.intensity / 2600; L[2].w = 0.9; LC[2].setRGB(0.75, 0.85, 1.0);
    let fl = 0;
    let fuv: [number, number] = [0.5, 0.8];
    for (const f of this.flashes) {
      const d = t - f.at;
      // a real flash strobes: two or three quick pulses, not one smooth fade
      if (d > 0 && d < 0.6) { const s = Math.exp(-d * 9) + 0.6 * Math.exp(-Math.abs(d - 0.18) * 30) + 0.4 * Math.exp(-Math.abs(d - 0.33) * 40); if (s * f.power > fl) { fl = s * f.power; fuv = f.uv; } }
    }
    L[3].x = fuv[0]; L[3].y = fuv[1]; L[3].z = fl * 1.6; L[3].w = 0.38; LC[3].setRGB(0.7, 0.8, 1.0);
    L[4].x = 0.5; L[4].y = 0.5; L[4].z = this.titleU.uSweepAmt.value * 0.08; L[4].w = 0.7; LC[4].setRGB(0.55, 0.7, 1.0);

    // DOM: the opening credit and the tagline (kept as real text)
    const credit = Math.min(smooth(span(t, T.credit, T.credit + 0.6)), 1 - smooth(span(t, T.creditOut - 0.5, T.creditOut)));
    this.opts.credit.style.opacity = credit.toFixed(3);
    this.opts.credit.style.letterSpacing = `${(0.42 + 0.12 * span(t, T.credit, T.creditOut)).toFixed(3)}em`;
    const sub = smooth(span(t, T.subtitle, T.subtitle + 0.9));
    this.tmp.set(0, -this.titleH / 2 - 0.55, TEXT_DEPTH / 2).project(this.camera);
    const st = this.opts.subtitle.style;
    st.opacity = sub.toFixed(3);
    st.top = `${((-this.tmp.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px`;
    st.setProperty('--reveal', `${(sub * 100).toFixed(1)}%`);

    this.composer.render(dt);
  }

  /** re-strikes a bolt on its own irregular rhythm; returns its current brightness */
  private updateBolt(b: BoltState, from: V3, to: V3, now: number, depth: number, branches: number, rough = 0.3) {
    const moved = !b.strike || Math.hypot(to[0] - b.to[0], to[1] - b.to[1]) > 0.8;
    if (now > b.next || moved) {
      b.seed = (b.seed * 16807 + 11) % 2147483647;
      b.strike = strike(from, to, { depth, rough, branches, branchDepth: Math.max(3, depth - 3) }, rng(b.seed));
      b.from = from; b.to = to;
      // irregular strobe: mostly bright, sometimes a dim restrike, rarely a dark frame
      const r = this.rand();
      b.flicker = r < 0.1 ? 0.12 : r < 0.35 ? 0.55 + this.rand() * 0.3 : 0.95 + this.rand() * 0.45;
      b.next = now + 0.045 + this.rand() * 0.09;
    }
    return b.flicker * (0.88 + Math.random() * 0.24);
  }

  private drawStrike(s: Strike, color: Color, width: number, intensity: number) {
    if (intensity <= 0.01) return;
    this.addPath(s.main, width, intensity, color);
    for (const br of s.branches) this.addPath(br.pts, width * (0.35 + br.weight * 0.5), intensity * br.weight, color);
  }

  /** camera-facing ribbon along a polyline, tapering toward its end */
  private addPath(pts: number[], width: number, intensity: number, color: Color) {
    const n = pts.length / 3;
    const cam = this.camera.position;
    for (let i = 0; i < n - 1 && this.segs < MAX_SEGMENTS; i++) {
      const ax = pts[i * 3], ay = pts[i * 3 + 1], az = pts[i * 3 + 2];
      const bx = pts[i * 3 + 3], by = pts[i * 3 + 4], bz = pts[i * 3 + 5];
      let tx = bx - ax, ty = by - ay, tz = bz - az;
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      const vx = cam.x - ax, vy = cam.y - ay, vz = cam.z - az;
      // side = tangent × view
      let sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
      const sl = Math.hypot(sx, sy, sz) || 1;
      const taper0 = 1 - (i / (n - 1)) * 0.65, taper1 = 1 - ((i + 1) / (n - 1)) * 0.65;
      sx /= sl; sy /= sl; sz /= sl;
      const w0 = width * taper0, w1 = width * taper1;
      const v = this.segs * 6;
      const quad: [number, number, number, number, number][] = [
        [ax + sx * w0, ay + sy * w0, az + sz * w0, 1, taper0], [ax - sx * w0, ay - sy * w0, az - sz * w0, -1, taper0],
        [bx + sx * w1, by + sy * w1, bz + sz * w1, 1, taper1], [ax - sx * w0, ay - sy * w0, az - sz * w0, -1, taper0],
        [bx - sx * w1, by - sy * w1, bz - sz * w1, -1, taper1], [bx + sx * w1, by + sy * w1, bz + sz * w1, 1, taper1],
      ];
      for (let k = 0; k < 6; k++) {
        const [px, py, pz, side, tp] = quad[k];
        this.boltPos[(v + k) * 3] = px; this.boltPos[(v + k) * 3 + 1] = py; this.boltPos[(v + k) * 3 + 2] = pz;
        this.boltSide[v + k] = side;
        this.boltI[v + k] = intensity * (0.45 + 0.55 * tp);
        this.boltCol[(v + k) * 3] = color.r; this.boltCol[(v + k) * 3 + 1] = color.g; this.boltCol[(v + k) * 3 + 2] = color.b;
      }
      this.segs++;
    }
  }

  private toUv(p: Vector3, out: { x: number; y: number }) {
    this.tmp.copy(p).project(this.camera);
    out.x = this.tmp.x * 0.5 + 0.5;
    out.y = this.tmp.y * 0.5 + 0.5;
  }

  private finish() {
    if (this.completed) return;
    this.completed = true;
    this.opts.onComplete();
  }
}

function pick(pts: number[]): V3 {
  const k = Math.floor(Math.random() * (pts.length / 3)) * 3;
  return [pts[k], pts[k + 1], pts[k + 2]];
}

/** soft, lumpy smoke puff (generated once, no image assets) */
function smokeTexture(): Texture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const img = g.createImageData(s, s);
  const r = rng(99);
  // value-noise fbm: wispy, ragged billows (a smooth disc reads as camera bokeh, not smoke)
  const G = 16;
  const grid = Array.from({ length: (G + 1) * (G + 1) }, () => r());
  const vn = (x: number, y: number) => {
    const xi = Math.floor(x) % G, yi = Math.floor(y) % G, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const g = (i: number, j: number) => grid[(j % G) * (G + 1) + (i % G)];
    return (g(xi, yi) * (1 - sx) + g(xi + 1, yi) * sx) * (1 - sy) + (g(xi, yi + 1) * (1 - sx) + g(xi + 1, yi + 1) * sx) * sy;
  };
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const u = x / s, v = y / s;
    let n = 0, a = 0.5, f = 3;
    for (let o = 0; o < 5; o++) { n += a * vn(u * f, v * f); f *= 2; a *= 0.5; }
    const fall = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 2) ** 1.5;
    const m = Math.max(0, n - 0.32) * 2.2 * fall;
    const val = Math.min(255, m * 255);
    const i = (y * s + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
