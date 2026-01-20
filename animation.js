function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Deterministic animation driver.
 * @param {{
 *   durationMs: number,
 *   onFrame: (t: number) => void,
 *   isCancelled?: () => boolean,
 * }} opts
 */
export function animateProgress(opts) {
  const durationMs = Math.max(0, Number(opts.durationMs || 0));
  const onFrame = opts.onFrame;
  const isCancelled = opts.isCancelled;

  return new Promise((resolve) => {
    const start = performance.now();

    function tick(now) {
      if (isCancelled && isCancelled()) {
        resolve('cancelled');
        return;
      }

      const raw = durationMs === 0 ? 1 : clamp((now - start) / durationMs, 0, 1);
      const t = easeInOutCubic(raw);
      onFrame(t);

      if (raw >= 1) {
        resolve('done');
        return;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}





