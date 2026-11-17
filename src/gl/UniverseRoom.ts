// Scene 02's room: logo keycaps floating around a neon-blue ring, debris cubes, embers,
// a light-painting ribbon and a dark reflective floor. Lives in camera space (a child
// of the Stage camera) and is driven by the pure timeline in animations/universeTimeline.

import {
  AdditiveBlending, AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture,
  Color, DirectionalLight, DoubleSide, Group, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Object3D, PlaneGeometry, PointLight, Points, ShaderMaterial, SRGBColorSpace,
  TorusGeometry, Vector3, type PerspectiveCamera,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Tech } from '../data/portfolio';
import { iconFor, displayColor } from '../scenes/technology/icons';
import { sampleUniverse } from '../animations/universeTimeline';
import { damp } from '../utils/math';

export interface CardScreen { x: number; y: number; w: number; h: number }

// Desktop composition, normalised to the visible half-extents at the room plane:
// [x, y, z(world units, + = nearer), size]. Big keycaps high on both flanks, smaller ones
// around the ring, the nearest low in the corners: a room with depth, not a grid.
const WIDE: [number, number, number, number][] = [
  [-0.6, 0.5, -1.2, 1.55],   // python
  [0.52, 0.52, -0.8, 1.6],   // claude
  [-0.62, -0.04, 0.2, 1.15], // langchain
  [0.8, 0.06, 0.1, 1.15],    // react
  [-0.33, 0.1, -1.8, 0.85],  // typescript
  [0.3, 0.02, -1.6, 0.9],    // azure
  [-0.4, -0.38, -0.9, 0.85], // docker
  [0.26, -0.4, -0.8, 0.85],  // fastapi
  [-0.6, -0.6, 0.5, 1.0],    // node
  [0.66, -0.46, 0.4, 1.0],   // postgres
  [-0.22, 0.64, -2.0, 0.98],  // mistral
  [0.16, 0.74, -2.3, 0.92],   // kubernetes
  [0.38, -0.66, 0.6, 0.8],   // supabase
  [-0.2, -0.66, 0.7, 0.82],   // openai
];

const RING_Z = -4.5;
const HISTORY = 150;

export class UniverseRoom {
  readonly group = new Group();
  readonly screens: CardScreen[] = [];
  started = false;

  private t = 0;
  private cards: {
    mesh: Mesh; front: MeshStandardMaterial; home: Vector3; size: number;
    phase: number; spin: Vector3; sway: number; emphasis: number; dim: number;
  }[] = [];
  private side = new MeshStandardMaterial({ color: '#0e0e10', roughness: 0.34, metalness: 0.35, transparent: true, opacity: 0 });
  private debris: InstancedMesh;
  private debrisData: { home: Vector3; s: number; rot: Vector3; phase: number }[] = [];
  private ring: Mesh;
  private ringMat: ShaderMaterial;
  private embers: Points;
  private emberMat: ShaderMaterial;
  private floorMat: ShaderMaterial;
  private ribbonGeo = new BufferGeometry();
  private ribbonMat = new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
  private history = new Float32Array(HISTORY * 3);
  private histCount = 0;
  private histClock = 0;
  private headLight = new PointLight('#bfe3ff', 0, 9, 1.6);
  private ringLight = new PointLight('#1f8bff', 0, 16, 1.4);
  private halfW = 7;
  private halfH = 4;
  private portrait = false;
  private focus = new Set<number>();
  private hovered = -1;
  private disposables: { dispose(): void }[] = [];
  private dummy = new Object3D();
  private tmp = new Vector3();

  constructor(private techs: Tech[], private opts: { tier: 'low' | 'mid' | 'high'; reduced: boolean }) {
    const g = this.group;

    // light: a soft key from above-front, blue from the ring, a cool fill, and the ribbon head
    g.add(new AmbientLight('#ffffff', 0.18));
    const key = new DirectionalLight('#ffffff', 1.1);
    key.position.set(2, 6, 8);
    g.add(key);
    const rimL = new PointLight('#1f7bff', 30, 18, 1.5);
    rimL.position.set(-7, 1, -3);
    const rimR = new PointLight('#2a9dff', 26, 18, 1.5);
    rimR.position.set(7, -1, -2.5);
    g.add(rimL, rimR, this.headLight, this.ringLight);

    // keycaps: one rounded geometry, scaled per card; face 4 (+z) carries the logo
    const geo = new RoundedBoxGeometry(1, 1, 0.5, 3, 0.1);
    this.disposables.push(geo, this.side, this.ribbonMat, this.ribbonGeo);
    techs.forEach((_, i) => {
      const front = new MeshStandardMaterial({
        color: '#ffffff', roughness: 0.45, metalness: 0.1, transparent: true, opacity: 0,
        emissive: new Color('#ffffff'), emissiveIntensity: 0.5,
      });
      const mesh = new Mesh(geo, [this.side, this.side, this.side, this.side, front, this.side]);
      g.add(mesh);
      this.disposables.push(front);
      this.cards.push({
        mesh, front, home: new Vector3(), size: 1, phase: i * 1.91,
        spin: new Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.5),
        sway: (i % 2 ? 1 : -1) * (0.3 + Math.random() * 0.5), emphasis: 0, dim: 1,
      });
      this.screens.push({ x: 0, y: 0, w: 0, h: 0 });
    });

    // debris: small dark cubes drifting through the room
    const nDebris = opts.tier === 'high' ? 26 : opts.tier === 'mid' ? 16 : 8;
    const boxGeo = new BoxGeometry(1, 1, 1);
    this.debris = new InstancedMesh(boxGeo, this.side, nDebris);
    for (let i = 0; i < nDebris; i++) {
      this.debrisData.push({
        // behind the keycap plane, so a passing cube never hides a label
        home: new Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, -7 + Math.random() * 5.8),
        s: 0.12 + Math.random() ** 2 * 0.32,
        rot: new Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.6),
        phase: Math.random() * 10,
      });
    }
    g.add(this.debris);
    this.disposables.push(boxGeo);

    // the ring: a thin torus whose light travels around it
    this.ringMat = new ShaderMaterial({
      transparent: true, blending: AdditiveBlending, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uLife: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform float uLife; varying vec2 vUv;
        void main(){
          float arc = pow(0.5 + 0.5 * cos(vUv.x * 6.2831 - uTime * 0.7), 10.0);
          float arc2 = pow(0.5 + 0.5 * cos(vUv.x * 6.2831 * 2.0 + uTime * 0.45), 24.0);
          vec3 col = vec3(0.12, 0.52, 1.0) * (0.22 + 1.6 * arc + 0.8 * arc2) + vec3(0.85, 0.94, 1.0) * pow(arc, 6.0) * 0.8;
          gl_FragColor = vec4(col * uLife, 1.0);
        }`,
    });
    const ringGeo = new TorusGeometry(1, 0.012, 6, 160);
    this.ring = new Mesh(ringGeo, this.ringMat);
    g.add(this.ring);
    const ring2 = new Mesh(new TorusGeometry(1.35, 0.006, 4, 160), this.ringMat);
    this.ring.add(ring2);
    this.disposables.push(ringGeo, ring2.geometry, this.ringMat);

    // embers that gather on the ring before the cards appear
    const nEmbers = opts.tier === 'high' ? 260 : opts.tier === 'mid' ? 140 : 70;
    const home = new Float32Array(nEmbers * 3);
    const seed = new Float32Array(nEmbers);
    for (let i = 0; i < nEmbers; i++) {
      home[i * 3] = (Math.random() - 0.5) * 2;
      home[i * 3 + 1] = (Math.random() - 0.5) * 2;
      home[i * 3 + 2] = -7 + Math.random() * 8;
      seed[i] = Math.random();
    }
    const eg = new BufferGeometry();
    eg.setAttribute('position', new BufferAttribute(home, 3));
    eg.setAttribute('aSeed', new BufferAttribute(seed, 1));
    this.emberMat = new ShaderMaterial({
      transparent: true, blending: AdditiveBlending, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uConverge: { value: 0 }, uAlpha: { value: 0 }, uSpread: { value: new Vector3(7, 4, 1) },
        uCenter: { value: new Vector3(0, 0, RING_Z) }, uPR: { value: Math.min(devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime, uConverge, uPR; uniform vec3 uSpread, uCenter;
        varying float vA;
        void main(){
          vec3 p = position * vec3(uSpread.xy, 1.0);
          p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.4;
          p.y += mod(uTime * (0.08 + aSeed * 0.2) + aSeed * 8.0, 8.0) - 4.0;
          float a = aSeed * 6.2831 + uTime * 0.8;
          vec3 onRing = uCenter + vec3(cos(a), sin(a), 0.0) * (1.0 + aSeed * 0.5) * uSpread.z;
          p = mix(p, onRing, uConverge * uConverge);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.5 + aSeed * 3.0) * uPR * (8.0 / -mv.z);
          vA = 0.4 + 0.6 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 50.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uAlpha; varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.45, 0.78, 1.0), smoothstep(0.5, 0.0, d) * vA * uAlpha);
        }`,
    });
    this.embers = new Points(eg, this.emberMat);
    this.embers.frustumCulled = false;
    g.add(this.embers);
    this.disposables.push(eg, this.emberMat);

    // floor: dark, wet, catching the ring and the ribbon head
    this.floorMat = new ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uAlpha: { value: 0 }, uHead: { value: new Vector3() }, uRing: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uAlpha, uRing, uTime; uniform vec3 uHead; varying vec3 vP;
        void main(){
          vec2 p = vP.xy;                       // plane space: x across, y into depth
          vec3 col = vec3(0.012, 0.011, 0.013);
          float pool = exp(-pow(p.x * 0.35, 2.0) - pow((p.y - ${(-RING_Z).toFixed(1)}) * 0.45, 2.0));
          col += vec3(0.04, 0.22, 0.6) * pool * 0.6 * uRing;
          // vertical streaks: the reflection of the ring smeared by a wet floor
          float streak = exp(-pow(p.x * 1.6, 2.0)) * smoothstep(-2.0, 6.0, p.y);
          col += vec3(0.08, 0.4, 0.9) * streak * 0.25 * uRing;
          float h = exp(-pow((p.x - uHead.x) * 0.9, 2.0) - pow((p.y + uHead.z) * 0.6, 2.0));
          col += vec3(0.5, 0.78, 1.0) * h * 0.35;
          vec2 tile = abs(fract(p * 0.6) - 0.5);
          col += vec3(0.02) * smoothstep(0.48, 0.5, max(tile.x, tile.y));
          float fade = smoothstep(14.0, 4.0, abs(p.y + 1.0)) * smoothstep(9.0, 3.0, abs(p.x));
          gl_FragColor = vec4(col, fade * uAlpha);
        }`,
    });
    const floorGeo = new PlaneGeometry(22, 22);
    const floor = new Mesh(floorGeo, this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.name = 'floor';
    g.add(floor);
    this.disposables.push(floorGeo, this.floorMat);

    // ribbon: a strip rebuilt every frame from where the head has been
    const verts = HISTORY * 2;
    this.ribbonGeo.setAttribute('position', new BufferAttribute(new Float32Array(verts * 3), 3));
    this.ribbonGeo.setAttribute('color', new BufferAttribute(new Float32Array(verts * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < HISTORY - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.ribbonGeo.setIndex(idx);
    const ribbon = new Mesh(this.ribbonGeo, this.ribbonMat);
    ribbon.frustumCulled = false;
    g.add(ribbon);
  }

  /** draws every logo face; call once fonts are ready so the labels use the real typefaces */
  paintFaces() {
    const size = this.opts.tier === 'high' ? 512 : 256;
    this.techs.forEach((tech, i) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d')!;
      const u = size / 512;
      const bg = g.createLinearGradient(0, 0, 0, size);
      bg.addColorStop(0, '#24242a');
      bg.addColorStop(1, '#0e0e11');
      g.fillStyle = bg;
      g.fillRect(0, 0, size, size);
      g.strokeStyle = 'rgba(255,255,255,0.06)';
      g.lineWidth = 3 * u;
      g.strokeRect(14 * u, 14 * u, size - 28 * u, size - 28 * u);

      const icon = iconFor(tech.icon);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (icon) {
        // bigger mark with a two-pass glow: a wide bloom, then the crisp shape on top
        const s = 8.8 * u;
        const color = displayColor(icon.hex);
        const path = new Path2D(icon.path);
        g.save();
        g.translate(size / 2 - 12 * s, 206 * u - 12 * s);
        g.scale(s, s);
        g.fillStyle = color;
        g.shadowColor = color;
        g.shadowBlur = 44 * u;
        g.fill(path);
        g.shadowBlur = 12 * u;
        g.fill(path);
        g.restore();
        g.fillStyle = '#ffffff';
        g.font = `600 ${(tech.label.length > 9 ? 50 : 60) * u}px "IBM Plex Sans", system-ui, sans-serif`;
        g.fillText(tech.label, size / 2, 410 * u);
      } else {
        // typographic keycap for marks that aren't redistributable
        g.fillStyle = '#ecebe6';
        g.font = `900 ${(tech.label.length > 6 ? 108 : 150) * u}px "Big Shoulders Display", Impact, sans-serif`;
        g.fillText(tech.label.toUpperCase(), size / 2, 236 * u);
        g.fillStyle = '#3fa9ff';
        g.fillRect(size / 2 - 40 * u, 340 * u, 80 * u, 6 * u);
      }
      const tex = new CanvasTexture(c);
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      const m = this.cards[i].front;
      m.map?.dispose();
      m.map = tex;
      m.emissiveMap = tex;
      m.needsUpdate = true;
      this.disposables.push(tex);
    });
  }

  /** halfW/halfH: visible half-extents at the room's front plane, `depth` from the camera */
  layout(halfW: number, halfH: number, depth: number, leftReserve = 0) {
    this.halfW = halfW;
    this.halfH = halfH;
    this.portrait = halfW / halfH < 0.9;
    const n = this.cards.length;
    this.cards.forEach((c, i) => {
      if (this.portrait) {
        // a phone gets two staggered columns flanking the ring
        const col = i % 2 ? 1 : -1;
        const row = Math.floor(i / 2);
        const rows = Math.ceil(n / 2);
        const t = rows > 1 ? row / (rows - 1) : 0.5;
        // the section is taller than the screen on phones, so the column can spread past the frame
        const spread = halfH * 1.9;
        const pitch = spread / Math.max(1, rows - 1);
        c.home.set(col * halfW * 0.5, spread / 2 - t * spread - (col > 0 ? pitch * 0.5 : 0) + pitch * 0.25, col > 0 ? -0.3 : 0);
        // sized from the row pitch so neighbouring keycaps never overlap
        c.size = Math.min(halfW * 0.44, pitch * 0.62);
      } else {
        const [x, y, z, s] = WIDE[i % WIDE.length];
        c.home.set(x * halfW, y * halfH, z);
        c.size = s * Math.min(1, halfW / 7.5);
      }
    });
    if (!this.portrait) this.fitToFrame(halfW, halfH, depth, leftReserve);
    this.ring.position.set(0, this.portrait ? 0 : -halfH * 0.04, RING_Z);
    this.ring.scale.setScalar(this.portrait ? halfW * 0.7 : Math.min(halfH * 0.55, 2.4));
    this.ringLight.position.set(0, this.ring.position.y, RING_Z + 0.5);
    this.emberMat.uniforms.uSpread.value.set(halfW, halfH, this.ring.scale.x);
    this.emberMat.uniforms.uCenter.value.copy(this.ring.position);
    const floor = this.group.getObjectByName('floor')!;
    floor.position.set(0, -halfH * 1.02, 0);
  }

  /**
   * Auto-fit for any screen: measure every keycap's footprint at its own depth (nearer keycaps
   * are magnified by perspective) and shrink the whole formation toward the centre until all of
   * them sit inside the frame, with room under the nav and above the bottom edge.
   */
  /** `leftReserve`: fraction of the screen width the DOM domain index occupies on the left */
  private fitToFrame(halfW: number, halfH: number, depth: number, leftReserve: number) {
    let k = 1;
    for (const c of this.cards) {
      const persp = (depth - c.home.z) / depth; // visible extent grows with distance
      const half = c.size * 0.62;               // half the keycap, plus its tilt and side faces
      const limX = halfW * persp * 0.95;
      const limTop = halfH * persp * 0.82;      // the fixed nav covers the top of the frame
      const limBottom = halfH * persp * 0.92;
      const needX = Math.abs(c.home.x) + half;
      const needY = c.home.y > 0 ? c.home.y + half : -c.home.y + half;
      k = Math.min(k, limX / needX, (c.home.y > 0 ? limTop : limBottom) / needY);
      // left-hand keycaps level with the domain index (its middle band) must clear it
      if (c.home.x < 0 && Math.abs(c.home.y) - half < halfH * persp * 0.36) {
        k = Math.min(k, (halfW * (1 - 2 * leftReserve) * persp * 0.97) / needX);
      }
    }
    if (k >= 1) return;
    for (const c of this.cards) {
      c.home.x *= k;
      c.home.y *= k;
      c.size *= k;
    }
  }

  start() {
    this.started = true;
    if (this.opts.reduced) this.t = 99;
  }

  setHovered(i: number) { this.hovered = i; }
  setFocus(indices: number[]) { this.focus = new Set(indices); }

  update(dt: number, time: number, camera: PerspectiveCamera, vw: number, vh: number) {
    if (this.started && !this.opts.reduced) this.t += dt;
    const s = sampleUniverse(this.started ? this.t : 0);
    const H = this.halfH;
    const W = this.halfW;
    const focusing = this.focus.size > 0 || this.hovered >= 0;
    const ease = (cur: number, tgt: number, rate: number) => (this.opts.reduced ? tgt : damp(cur, tgt, rate, dt));

    // shared materialisation: one value for every keycap
    const opaque = s.mat >= 1;
    this.side.opacity = s.mat;
    if (this.side.transparent === opaque) { this.side.transparent = !opaque; this.side.needsUpdate = true; }

    this.cards.forEach((c, i) => {
      const lit = this.focus.has(i) || this.hovered === i;
      c.emphasis = ease(c.emphasis, lit ? 1 : 0, 7);
      c.dim = ease(c.dim, focusing && !lit ? 0.6 : 1, 5);
      const away = 1 - s.rise;
      const travel = Math.sin(s.rise * Math.PI);
      const float = s.float;
      const m = c.mesh;
      m.position.set(
        c.home.x + c.sway * travel * 0.8,
        c.home.y - away * (H * 1.5 + c.size) + s.settle * 0.35 + Math.sin(time * 0.7 + c.phase) * 0.14 * float,
        c.home.z + c.emphasis * 1.0,
      );
      m.rotation.set(
        c.spin.x * away + Math.sin(time * 0.31 + c.phase) * 0.06 * float,
        c.spin.y * away + Math.sin(time * 0.4 + c.phase) * 0.14 * float - (c.home.x / W) * 0.28 * (1 - c.emphasis),
        c.spin.z * away,
      );
      m.scale.setScalar(c.size * (0.92 + 0.08 * s.mat) * (1 + c.emphasis * 0.1));
      c.front.opacity = s.mat;
      if (c.front.transparent === opaque) { c.front.transparent = !opaque; c.front.needsUpdate = true; }
      c.front.emissiveIntensity = (0.85 + s.burst * 0.9 + c.emphasis * 0.4) * c.dim;
      c.front.color.setScalar(c.dim);
    });

    // debris rises with the group and tumbles slowly
    this.debrisData.forEach((d, i) => {
      const away = 1 - s.rise;
      this.dummy.position.set(d.home.x * W * 0.95, d.home.y * H * 0.95 - away * H * 1.4 + Math.sin(time * 0.5 + d.phase) * 0.2, d.home.z);
      this.dummy.rotation.set(d.rot.x * time + d.phase, d.rot.y * time, d.rot.z * time);
      this.dummy.scale.setScalar(d.s * s.mat);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    });
    this.debris.instanceMatrix.needsUpdate = true;

    this.ringMat.uniforms.uTime.value = time;
    this.ringMat.uniforms.uLife.value = s.ring + s.burst * 0.8;
    this.ring.rotation.z = time * 0.05;
    this.ringLight.intensity = (6 + 30 * s.ring + 60 * s.burst);

    this.emberMat.uniforms.uTime.value = time;
    this.emberMat.uniforms.uConverge.value = s.converge;
    this.emberMat.uniforms.uAlpha.value = s.wake;

    this.floorMat.uniforms.uAlpha.value = s.wake;
    this.floorMat.uniforms.uRing.value = s.ring;

    this.updateRibbon(dt, time, s.ribbon);

    // project each keycap for the DOM button layer
    camera.updateMatrixWorld();
    this.cards.forEach((c, i) => {
      c.mesh.getWorldPosition(this.tmp);
      const depth = this.tmp.distanceTo(camera.position);
      this.tmp.project(camera);
      const pxPerWorld = vh / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * depth);
      const o = this.screens[i];
      o.x = (this.tmp.x * 0.5 + 0.5) * vw;
      o.y = (-this.tmp.y * 0.5 + 0.5) * vh;
      o.w = o.h = c.mesh.scale.x * this.group.scale.x * pxPerWorld * (s.mat > 0.5 ? 1 : 0);
    });
  }

  private updateRibbon(dt: number, time: number, life: number) {
    const W = this.halfW, H = this.halfH;
    // the head orbits the ring with slower, incommensurate drifts layered on so it never visibly repeats
    const a = time * 0.42;
    const head = this.tmp.set(
      Math.cos(a) * W * 0.62 + Math.sin(time * 0.17) * W * 0.12,
      Math.sin(a * 1.31) * H * 0.42 + Math.cos(time * 0.23) * H * 0.12,
      RING_Z + 2.2 + Math.sin(a * 0.9) * 3.2,
    );
    this.headLight.position.copy(head);
    this.headLight.intensity = 14 * life;
    this.floorMat.uniforms.uHead.value.copy(head);

    this.histClock += dt;
    if (this.histClock > 1 / 30 || this.histCount === 0) {
      this.histClock = 0;
      this.history.copyWithin(3, 0, (HISTORY - 1) * 3);
      this.history[0] = head.x; this.history[1] = head.y; this.history[2] = head.z;
      this.histCount = Math.min(HISTORY, this.histCount + 1);
    }

    const pos = this.ribbonGeo.getAttribute('position') as BufferAttribute;
    const col = this.ribbonGeo.getAttribute('color') as BufferAttribute;
    const h = this.history;
    for (let i = 0; i < HISTORY; i++) {
      const j = Math.min(i, this.histCount - 1);
      const k = Math.min(j + 1, this.histCount - 1);
      const tx = h[j * 3] - h[k * 3], ty = h[j * 3 + 1] - h[k * 3 + 1];
      const len = Math.hypot(tx, ty) || 1;
      const age = i / (HISTORY - 1);
      const w = 0.06 * (1 - age) ** 0.6 + 0.008;
      const nx = (-ty / len) * w, ny = (tx / len) * w;
      pos.setXYZ(i * 2, h[j * 3] + nx, h[j * 3 + 1] + ny, h[j * 3 + 2]);
      pos.setXYZ(i * 2 + 1, h[j * 3] - nx, h[j * 3 + 1] - ny, h[j * 3 + 2]);
      // white-hot at the head, cooling through electric blue to a deep blue tail
      const fade = (1 - age) ** 1.4 * life * (i < this.histCount ? 1 : 0);
      const r = fade * (0.85 - age * 0.8), g = fade * (0.95 - age * 0.6), b = fade;
      col.setXYZ(i * 2, Math.max(0, r), Math.max(0, g), b);
      col.setXYZ(i * 2 + 1, Math.max(0, r), Math.max(0, g), b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.debris.dispose();
  }
}
