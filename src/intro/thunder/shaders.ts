// GLSL for the Thunderforge intro.

const noise2 = /* glsl */ `
  float hash2(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1,0)), u.x), mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < OCTAVES; i++) { v += a * vnoise(p); p = p * 2.02 + vec2(1.3, 7.1); a *= 0.5; }
    return v;
  }
`;

/** Storm sky: three domain-warped cloud layers drifting at different speeds, lit from within. */
export const cloudVertex = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;

export const cloudFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uCam;
  uniform float uAmbient;
  uniform vec4 uL[5];     // xy: screen uv, z: intensity, w: radius
  uniform vec3 uLC[5];    // light colours
  varying vec2 vUv;
  ${noise2}
  void main(){
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    // deep night: a touch lighter toward the top, where the storm is thickest
    vec3 col = mix(vec3(0.003, 0.004, 0.009), vec3(0.010, 0.014, 0.026), smoothstep(-0.5, 0.6, p.y));

    vec3 sky = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      vec2 lp = (uL[i].xy - 0.5) * vec2(uAspect, 1.0);
      float d = length(p - lp);
      sky += uLC[i] * uL[i].z * exp(-d * d / (uL[i].w * uL[i].w));
    }

    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float sc = 1.1 + fk * 0.85;
      // nearer layers drift faster and move more with the camera (parallax)
      vec2 q = p * sc + vec2(uTime * (0.018 + fk * 0.016), fk * 4.3) - uCam.xy * (0.015 + fk * 0.03) * (1.0 + fk);
      vec2 w = vec2(fbm(q + vec2(1.7, 9.2) + uTime * 0.01), fbm(q + vec2(8.3, 2.8) - uTime * 0.012));
      float d = fbm(q + 1.7 * w);
      float dens = smoothstep(0.36 + fk * 0.03, 0.88, d);
      // light: thin cloud edges glow (light passes through), dense cores stay dark (self-shadowing)
      vec3 L = vec3(0.0);
      for (int i = 0; i < 5; i++) {
        vec2 lp = (uL[i].xy - 0.5) * vec2(uAspect, 1.0);
        vec2 toL = lp - p;
        float dist = length(toL);
        float fall = exp(-dist * dist / (uL[i].w * uL[i].w * (1.0 + fk * 0.6)));
        // silver lining: sample density a step toward the light; thinner there → brighter edge
        float dTo = fbm(q + 1.7 * w + normalize(toL + 1e-4) * 0.08 * sc);
        float rim = clamp((d - dTo) * 6.0 + 0.5, 0.0, 1.0);
        L += uLC[i] * uL[i].z * fall * (0.25 + 0.95 * rim);
      }
      vec3 cloudCol = vec3(0.020, 0.026, 0.042) * uAmbient * (0.6 + 0.6 * d) + L * (0.55 - fk * 0.1);
      col = mix(col, cloudCol, dens * (0.82 - fk * 0.18));
    }
    // light scattered in the air between the clouds
    col += sky * 0.06;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Lightning: camera-facing ribbons; a white-hot core inside a coloured halo. Additive. */
export const boltVertex = /* glsl */ `
  attribute float aSide;
  attribute float aI;
  attribute vec3 aCol;
  varying float vSide;
  varying float vI;
  varying vec3 vCol;
  void main(){
    vSide = aSide; vI = aI; vCol = aCol;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const boltFragment = /* glsl */ `
  precision highp float;
  varying float vSide;
  varying float vI;
  varying vec3 vCol;
  void main(){
    float s2 = vSide * vSide;
    float core = exp(-s2 * 26.0);
    float halo = exp(-s2 * 3.2);
    vec3 c = vCol * halo * 0.9 + vec3(1.0, 1.0, 1.0) * core * 2.4;
    gl_FragColor = vec4(c * vI, 1.0);
  }
`;

/** Sparks: burst with drag and gravity, then (the gatherers) spiral into the letter surfaces. */
export const sparkVertex = /* glsl */ `
  attribute vec3 aVel;
  attribute vec3 aTarget;
  attribute vec4 aSeed;   // x: gather delay (≥ 8 = never gathers), y: size, z: lifetime, w: swirl
  uniform float uT;       // seconds since impact
  uniform float uG;       // seconds since the gather began
  uniform float uPR;
  uniform float uScale;
  uniform float uFade;
  varying float vA;
  varying vec3 vC;
  void main(){
    float t = max(uT, 0.0);
    float drag = 1.8;
    vec3 p = aVel * (1.0 - exp(-drag * t)) / drag;
    p.y -= 0.55 * t * t;
    float g = smoothstep(aSeed.x, aSeed.x + 0.85, uG);
    g = g * g * (3.0 - 2.0 * g);
    vec3 pp = mix(p, aTarget, g);
    // vortex: unwound as g → 1, so a spark lands exactly on its target
    float ang = (1.0 - g) * g * 9.0 * (aSeed.w - 0.5);
    float ca = cos(ang), sa = sin(ang);
    pp.xy = mat2(ca, -sa, sa, ca) * pp.xy;
    vec4 mv = modelViewMatrix * vec4(pp, 1.0);
    gl_PointSize = max(1.0, aSeed.y * uPR * uScale / -mv.z * (1.0 - 0.45 * g));
    float alive = 1.0 - smoothstep(aSeed.z * 0.55, aSeed.z, t);
    vA = max(alive * (1.0 - g), g) * uFade * step(0.0, uT);
    // white-blue in flight; molten orange as it welds into the letter
    vC = mix(vec3(1.0, 0.78, 0.55), vec3(1.0, 0.55, 0.25), g) * mix(1.0, 0.8, g);
    gl_Position = projectionMatrix * mv;
  }
`;

export const sparkFragment = /* glsl */ `
  precision highp float;
  varying float vA;
  varying vec3 vC;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vC * (0.6 + 1.6 * a * a) * a * vA, 1.0);
  }
`;

/** Smoke: large soft sprites, lit by the impact and the forging glow. */
export const smokeVertex = /* glsl */ `
  attribute vec3 aDir;
  attribute vec4 aSeed;   // x: size, y: speed, z: spin phase, w: opacity
  uniform float uT;
  uniform float uPR;
  uniform float uScale;
  varying float vA;
  varying float vSpin;
  void main(){
    float t = max(uT, 0.0);
    vec3 p = position + aDir * aSeed.y * (1.0 - exp(-t * 0.9)) * 3.2 + vec3(0.0, t * 0.12, 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSeed.x * uPR * uScale / -mv.z * (0.6 + 0.4 * (1.0 - exp(-t * 0.8)));
    vA = aSeed.w * smoothstep(0.0, 0.5, t) * step(0.0, uT);
    vSpin = aSeed.z + t * 0.15;
    gl_Position = projectionMatrix * mv;
  }
`;

export const smokeFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec3 uLight;
  uniform float uFade;
  varying float vA;
  varying float vSpin;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vSpin), co = cos(vSpin);
    vec2 r = mat2(co, -s, s, co) * c + 0.5;
    float m = texture2D(uTex, r).r;
    gl_FragColor = vec4(vec3(0.035, 0.04, 0.055) + uLight * m, m * vA * uFade * 0.42);
  }
`;

/** Final grade: shockwave refraction, flash, chromatic fringe, vignette, grain. */
export const fxShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uCenter: { value: [0.5, 0.5] },
    uShockR: { value: -1 },
    uShockA: { value: 0 },
    uFlash: { value: 0 },
    uExposure: { value: 0 },
    uAberr: { value: 0.0015 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime, uAspect, uShockR, uShockA, uFlash, uExposure, uAberr;
    uniform vec2 uCenter;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 d = (uv - uCenter) * vec2(uAspect, 1.0);
      float r = length(d);
      // shockwave: a ring of refraction that bends the image outward as it passes
      float ring = exp(-pow((r - uShockR) / 0.045, 2.0));
      uv -= normalize(d + 1e-5) / vec2(uAspect, 1.0) * ring * uShockA;
      // chromatic fringe grows toward the edges (and with impact)
      vec2 ca = (uv - 0.5) * uAberr * (1.0 + 6.0 * ring);
      vec3 col = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
      col += vec3(0.5, 0.75, 1.0) * ring * uShockA * 8.0;
      col *= uExposure;
      col = mix(col, vec3(1.6, 1.7, 1.9), uFlash);
      // vignette and film grain
      vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
      col *= smoothstep(1.25, 0.25, length(v * vec2(0.85, 1.25)));
      col += (h(vUv * 1000.0 + uTime) - 0.5) * 0.035;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
