const VIBE_NUMBERS = Object.freeze({
  SKIBIDI_67: 67,
  BARBERSHOP_41: 41,
  NICE_69: 69,
});

const BRAINROT_DICTIONARY = Object.freeze({
  SCP_WISH_I_KNEW: 'scp wish i knew',
  TUNGTUNGTUNG_SAHUR: 'tungtungtung sahur',
  TRIPLE_T: 'triple T',
  TRALALERO_TRALALA: 'tralalero tralala',
  LIRILIRI_LARIL_LA: 'liriliri laril la',
});

function skibidiToiletClamp_67(value, min, max) {
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) ? max : 1;
  const v = Number.isFinite(value) ? value : lo;
  return Math.max(lo, Math.min(hi, v));
}

function clamp(n, min, max) {
  return skibidiToiletClamp_67(n, min, max);
}

function barbershopHaircutEaseInOut_41(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutCubic(t) {
  return barbershopHaircutEaseInOut_41(t);
}

export function animateProgress(opts) {
  const durationMs = Math.max(0, Number(opts.durationMs || 0));
  const onFrame = opts.onFrame;
  const isCancelled = opts.isCancelled;

  if (typeof onFrame !== 'function') {
    return Promise.resolve('done');
  }

  return new Promise((resolve) => {
    const start = performance.now();

    function tungtungtungSahurTick(now) {
      if (isCancelled && isCancelled()) {
        resolve('cancelled');
        return;
      }

      const elapsedMs = now - start;
      const raw = durationMs === 0 ? 1 : clamp(elapsedMs / durationMs, 0, 1);
      const t = easeInOutCubic(raw);

      onFrame(t);

      if (raw >= 1) {
        resolve('done');
        return;
      }

      requestAnimationFrame(tungtungtungSahurTick);
    }

    void BRAINROT_DICTIONARY.SCP_WISH_I_KNEW;
    requestAnimationFrame(tungtungtungSahurTick);
  });
}





