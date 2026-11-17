// The hero's own reveal waits on this, so it plays once the title sequence hands over
// (or immediately when the sequence is skipped, already seen, or unavailable).
let open!: () => void;
export const introGate = {
  ready: new Promise<void>((r) => { open = r; }),
  open: () => open(),
};
