// GLSL for the shared stage. Kept as plain strings: three.js compiles them, Vite inlines them.

const noise = /* glsl */ `
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

/** Fullscreen backdrop: neon-blue ember glow, volumetric shafts from above, haze, vignette. */
export const atmosphereVertex = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;

export const atmosphereFragment = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  uniform float uGlow;      // intro: 0 = true black, 1 = lit
  uniform float uWarm;      // accent-glow intensity, rises in the finale
  uniform float uShafts;    // 0 on low-tier devices (skips the most expensive term)
  uniform float uScroll;    // whole-page progress 0..1
  uniform float uCool;      // 1 while the Journey section is on screen: a brighter, whiter blue
  uniform vec2  uRes;
  uniform vec2  uPointer;   // -1..1, damped
  varying vec2 vUv;
  ${noise}
  void main(){
    vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    vec3 col = vec3(0.010, 0.010, 0.012);

    // ember: a low, wide blue pool that drifts with the pointer and slowly sinks as you scroll
    vec2 gp = vec2(uPointer.x * 0.07, -0.22 + uPointer.y * 0.04 - uScroll * 0.08);
    vec2 q = (p - gp) * vec2(0.75, 1.45);
    float ember = exp(-dot(q, q) * 3.2);
    float flicker = 0.92 + 0.08 * vnoise(vec2(uTime * 0.6, 0.0));
    // neon blue everywhere; Journey (uCool) shifts it toward a brighter cyan-white
    vec3 emberCol = mix(vec3(0.03, 0.2, 0.68), vec3(0.08, 0.36, 0.8), uCool);
    vec3 coreCol = mix(vec3(0.6, 0.85, 1.0), vec3(0.9, 0.96, 1.0), uCool);
    col += emberCol * ember * (0.4 + 0.12 * uCool) * uWarm * flicker;
    col += coreCol * pow(ember, 6.0) * (0.08 + 0.06 * uCool) * uWarm;

    // volumetric shafts falling from a source above the frame
    if (uShafts > 0.0) {
      vec2 src = vec2(0.28 + uPointer.x * 0.05, 0.95);
      vec2 d = p - src;
      float ang = atan(d.x, -d.y);
      float beams = fbm(vec2(ang * 7.0, uTime * 0.035));
      beams = smoothstep(0.45, 0.85, beams);
      float fall = exp(-length(d) * 1.35);
      col += mix(vec3(0.78, 0.80, 0.86), vec3(0.75, 0.86, 1.0), uCool) * beams * fall * (0.11 + 0.05 * uCool) * uShafts;
    }

    // slow haze so the black is never flat
    col += vec3(0.05, 0.048, 0.05) * fbm(p * 1.6 + vec2(uTime * 0.015, -uScroll * 0.6)) * 0.5;

    // vignette
    col *= smoothstep(1.35, 0.15, length(p * vec2(0.85, 1.15)));

    gl_FragColor = vec4(col * uGlow, 1.0);
  }
`;

/** Dust field the camera flies through. */
export const particleVertex = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  attribute float aRed;
  uniform float uTime;
  uniform float uPR;
  uniform float uScale;
  uniform float uReveal;
  uniform float uRedMix;
  varying float vAlpha;
  varying float vRed;
  void main(){
    vec3 p = position;
    p.x += sin(uTime * 0.13 + aSeed * 6.2831) * 0.22;
    p.y += cos(uTime * 0.11 + aSeed * 12.566) * 0.22;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    gl_PointSize = max(1.0, aSize * uPR * uScale / dist);
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.5 + aSeed) + aSeed * 40.0);
    // reveal sweeps from near to far so the field "arrives" instead of fading as one
    float reach = uReveal * 70.0;
    float reveal = 1.0 - smoothstep(reach - 8.0, reach, dist);
    vAlpha = smoothstep(0.4, 3.0, dist) * smoothstep(62.0, 22.0, dist) * twinkle * reveal;
    vRed = step(aRed, uRedMix);
    gl_Position = projectionMatrix * mv;
  }
`;

export const particleFragment = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  varying float vRed;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(0.80, 0.84, 0.9), vec3(0.3, 0.68, 1.0), vRed);
    gl_FragColor = vec4(col, a * a * vAlpha);
  }
`;
