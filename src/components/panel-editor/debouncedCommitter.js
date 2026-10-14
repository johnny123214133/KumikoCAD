// How long a Grid inspector field waits after the last edit before applying it.
// Long enough to span the gap between keystrokes and between spinner clicks
// (so typing "75" or clicking the arrow five times is ONE update, not two or
// five), short enough that a single deliberate edit doesn't feel stuck. Blur
// and Enter skip the wait entirely.
export const GRID_FIELD_DEBOUNCE_MS = 500;

// A trailing-edge debounce that holds the pending VALUE, so the owner can tell
// whether an edit is waiting (`hasPending`) and force it through early
// (`flush` — blur, Enter, unmount) instead of losing it or waiting out the
// timer. Framework-free so it can be reasoned about (and tested) on its own;
// DebouncedLengthField.jsx wraps it for React.
export function createDebouncedCommitter(commit, delayMs = GRID_FIELD_DEBOUNCE_MS) {
  let timer = null;
  let queued = null;

  const clear = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  };
  const flush = () => {
    clear();
    if (queued === null) return false;
    const value = queued;
    queued = null;
    commit(value);
    return true;
  };

  return {
    // Queue `value`, replacing any earlier queued one, and restart the wait.
    schedule(value) {
      queued = value;
      clear();
      timer = setTimeout(flush, delayMs);
    },
    // Drop whatever is queued without committing it (the field no longer
    // holds a value worth applying — e.g. it was cleared).
    cancel() {
      clear();
      queued = null;
    },
    // Commit the queued value now, if any. Returns whether one was committed.
    flush,
    hasPending: () => queued !== null,
  };
}
