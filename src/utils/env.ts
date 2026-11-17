// Device / preference detection, evaluated once at startup.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const coarsePointer = () => matchMedia('(pointer: coarse)').matches;

/** rough capability tier used to size particle counts and the pixel-ratio ceiling */
export function deviceTier(): 'low' | 'mid' | 'high' {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 8;
  const small = Math.min(innerWidth, innerHeight) < 600;
  if (cores <= 4 || mem <= 3) return 'low';
  if (small || coarsePointer()) return 'mid';
  return 'high';
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
