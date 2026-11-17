import { useMemo, type ReactNode } from 'react';
import type { Project } from '../../data/portfolio';

// Original, procedurally generated cover art: one visual motif per project, seeded by
// its id so it is stable between renders and builds. No stock imagery, no screenshots
// pretending to be product shots.

const W = 400;
const H = 250;
const SILVER = '#a3a5ac';
const OFF = '#ecebe6';
const RED = '#3fa9ff'; // the accent (neon blue); name kept for the motif code

function rng(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

type Motif = (r: () => number) => ReactNode;

const motifs: Record<Project['art'], Motif> = {
  // threat graph: entities linked to a blue hub
  graph: (r) => {
    const pts = Array.from({ length: 16 }, () => [40 + r() * 320, 30 + r() * 190] as const);
    const hub = [W * 0.58, H * 0.48] as const;
    return (
      <>
        {pts.map(([x, y], i) => pts.slice(i + 1).filter(([x2, y2]) => Math.hypot(x - x2, y - y2) < 95).map(([x2, y2], j) => (
          <line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} stroke={SILVER} strokeOpacity="0.28" />
        )))}
        {pts.filter((_, i) => i % 3 === 0).map(([x, y], i) => (
          <line key={`h${i}`} x1={x} y1={y} x2={hub[0]} y2={hub[1]} stroke={RED} strokeOpacity="0.5" />
        ))}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 4 : 2.5} fill={i % 4 === 0 ? OFF : SILVER} />)}
        {[34, 22, 12].map((rad, i) => <circle key={rad} cx={hub[0]} cy={hub[1]} r={rad} fill="none" stroke={RED} strokeOpacity={0.25 + i * 0.25} />)}
        <circle cx={hub[0]} cy={hub[1]} r="5" fill={RED} />
      </>
    );
  },
  // a product turning in 3D: wireframe cube inside an orbit
  wireframe: () => {
    const c = [W / 2, H / 2 + 6];
    const s = 58;
    const iso = (x: number, y: number, z: number) => [c[0] + (x - z) * s * 0.87, c[1] + (x + z) * s * 0.5 - y * s] as const;
    const v = [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => iso(x * 0.62, y * 0.62, z * 0.62));
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    return (
      <>
        <ellipse cx={c[0]} cy={c[1] + 50} rx="150" ry="28" fill="none" stroke={RED} strokeOpacity="0.55" />
        <ellipse cx={c[0]} cy={c[1] + 50} rx="110" ry="18" fill="none" stroke={SILVER} strokeOpacity="0.2" />
        {e.map(([a, b], i) => <line key={i} x1={v[a][0]} y1={v[a][1]} x2={v[b][0]} y2={v[b][1]} stroke={i === 6 || i === 10 ? RED : OFF} strokeOpacity={i === 6 || i === 10 ? 0.9 : 0.75} />)}
        {v.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={OFF} />)}
        <circle cx={c[0] + 150} cy={c[1] + 50} r="4" fill={RED} />
      </>
    );
  },
  // many lines of text distilled into a headline and three bullets
  digest: (r) => (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x="36" y={34 + i * 14} width={70 + r() * 90} height="3" fill={SILVER} opacity="0.35" />
      ))}
      <path d="M200 62 L236 125 L200 188" fill="none" stroke={RED} strokeWidth="1.5" />
      <rect x="258" y="78" width="104" height="8" fill={OFF} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="262" cy={112 + i * 24} r="3.5" fill={RED} />
          <rect x="274" y={110 + i * 24} width={56 + r() * 30} height="4" fill={SILVER} opacity="0.8" />
        </g>
      ))}
    </>
  ),
  // a dial / keyhole: authentication as a mechanism
  keys: () => {
    const cx = W / 2, cy = H / 2;
    return (
      <>
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const r1 = i % 5 === 0 ? 86 : 92;
          return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * 98} y2={cy + Math.sin(a) * 98} stroke={i < 18 ? RED : SILVER} strokeOpacity={i < 18 ? 0.9 : 0.4} />;
        })}
        <circle cx={cx} cy={cy} r="70" fill="none" stroke={SILVER} strokeOpacity="0.3" />
        <circle cx={cx} cy={cy - 12} r="15" fill="none" stroke={OFF} strokeWidth="1.5" />
        <path d={`M${cx - 8} ${cy - 2} L${cx - 14} ${cy + 30} L${cx + 14} ${cy + 30} L${cx + 8} ${cy - 2}`} fill="none" stroke={OFF} strokeWidth="1.5" />
        <text x={cx} y={cy + 58} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill={RED} letterSpacing="3">482 913</text>
      </>
    );
  },
  // a long chain collapsing into a short one
  links: () => (
    <>
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x={30 + i * 22} y="70" width="16" height="6" rx="3" fill="none" stroke={SILVER} strokeOpacity="0.6" />
      ))}
      <path d="M30 96 C 160 96, 200 170, 280 170" fill="none" stroke={SILVER} strokeOpacity="0.25" />
      <path d="M272 96 C 300 96, 300 170, 330 170" fill="none" stroke={SILVER} strokeOpacity="0.25" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={286 + i * 24} y="160" width="18" height="20" rx="2" fill={i === 2 ? RED : 'none'} stroke={i === 2 ? RED : OFF} />
      ))}
      <text x="30" y="56" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={SILVER} opacity="0.7">https://example.com/a/very/long/path?q=…</text>
      <text x="286" y="204" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={OFF}>/x7K</text>
    </>
  ),
  // architecture blueprint: client → balancer → services → store
  blueprint: () => (
    <>
      {Array.from({ length: 21 }, (_, i) => <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2={H} stroke={SILVER} strokeOpacity="0.07" />)}
      {Array.from({ length: 13 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 20} x2={W} y2={i * 20} stroke={SILVER} strokeOpacity="0.07" />)}
      <rect x="30" y="105" width="56" height="40" fill="none" stroke={OFF} />
      <rect x="120" y="105" width="56" height="40" fill="none" stroke={RED} />
      {[60, 110, 160].map((y) => <rect key={y} x="214" y={y - 14} width="66" height="28" fill="none" stroke={OFF} strokeOpacity="0.8" />)}
      <path d="M86 125 H120 M176 125 L214 60 M176 125 H214 M176 125 L214 160" stroke={SILVER} strokeOpacity="0.6" fill="none" />
      <path d="M280 60 L318 115 M280 110 H318 M280 160 L318 135" stroke={SILVER} strokeOpacity="0.6" fill="none" />
      <ellipse cx="346" cy="108" rx="26" ry="8" fill="none" stroke={RED} />
      <path d="M320 108 V142 A26 8 0 0 0 372 142 V108" fill="none" stroke={RED} />
    </>
  ),
  // a ledger: rows of transactions and a running balance
  ledger: (r) => {
    let bal = 120;
    const pts = Array.from({ length: 14 }, (_, i) => { bal += (r() - 0.42) * 30; return [40 + i * 24, bal] as const; });
    return (
      <>
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <line x1="36" y1={40 + i * 26} x2="364" y2={40 + i * 26} stroke={SILVER} strokeOpacity="0.12" />
            <rect x="40" y={30 + i * 26} width={30 + r() * 40} height="3" fill={SILVER} opacity="0.4" />
            <rect x={320 - r() * 20} y={30 + i * 26} width="40" height="3" fill={i % 3 === 0 ? RED : SILVER} opacity="0.7" />
          </g>
        ))}
        <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={RED} strokeWidth="1.5" />
        {pts.map(([x, y], i) => i % 4 === 0 && <circle key={i} cx={x} cy={y} r="3" fill={OFF} />)}
      </>
    );
  },
  // memory as blocks: allocated, free, and one fragment highlighted
  memory: (r) => (
    <>
      {Array.from({ length: 8 }, (_, row) => Array.from({ length: 18 }, (_, col) => {
        const v = r();
        const fill = v > 0.82 ? RED : v > 0.45 ? OFF : 'none';
        return (
          <rect key={`${row}-${col}`} x={36 + col * 18.4} y={36 + row * 23} width="14" height="17"
            fill={fill} fillOpacity={fill === OFF ? 0.55 : 0.9} stroke={SILVER} strokeOpacity="0.3" />
        );
      }))}
    </>
  ),
};

/** fit='slice' fills the frame (cards); 'meet' shows the whole composition (detail view) */
export function ProjectArt({ project, className, fit = 'slice' }: { project: Project; className?: string; fit?: 'slice' | 'meet' }) {
  const art = useMemo(() => motifs[project.art](rng(project.id)), [project]);
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Abstract cover art for ${project.title}`} preserveAspectRatio={`xMidYMid ${fit}`}>
      <defs>
        <radialGradient id={`v-${project.id}`} cx="50%" cy="55%" r="75%">
          <stop offset="0" stopColor="#1a1a1d" />
          <stop offset="1" stopColor="#070708" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#v-${project.id})`} />
      {art}
    </svg>
  );
}
