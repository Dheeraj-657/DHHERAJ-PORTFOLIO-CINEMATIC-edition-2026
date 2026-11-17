// Logo paths for the keycaps, from Simple Icons (CC0; marks remain their owners' trademarks
// and are used here only to name the technologies). Named imports keep the bundle to these 12.
import {
  siPython, siClaude, siLangchain, siReact, siTypescript, siDocker, siFastapi,
  siNodedotjs, siPostgresql, siMistralai, siKubernetes, siSupabase,
} from 'simple-icons';

export interface Icon { path: string; hex: string }

const ICONS: Record<string, Icon> = {
  python: siPython, claude: siClaude, langchain: siLangchain, react: siReact,
  typescript: siTypescript, docker: siDocker, fastapi: siFastapi, nodedotjs: siNodedotjs,
  postgresql: siPostgresql, mistralai: siMistralai, kubernetes: siKubernetes, supabase: siSupabase,
};

export const iconFor = (slug: string | null): Icon | null => (slug ? ICONS[slug] ?? null : null);

/**
 * Brand colour tuned for a dark keycap: near-black marks become off-white, everything else
 * is lifted 30% toward white so deep blues (Python, PostgreSQL) stay bright and legible.
 */
export function displayColor(hex: string) {
  const n = parseInt(hex, 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (lum < 0.22) return '#f4f3ee';
  const [r, g, b] = rgb.map((c) => Math.round(c + (255 - c) * 0.3));
  return `rgb(${r}, ${g}, ${b})`;
}
