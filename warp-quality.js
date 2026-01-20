function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const STORAGE_KEY = 'warpPixelsK';
const DEFAULT_K = 8000;

function getButtons(root) {
  return Array.from(root.querySelectorAll('[data-warp-pixels]'));
}

export function getWarpPixelsK() {
  const raw = Number(localStorage.getItem(STORAGE_KEY));
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_K;
}

export function setWarpPixelsK(k) {
  const v = clamp(Math.round(Number(k) || DEFAULT_K), 1, 12000);
  localStorage.setItem(STORAGE_KEY, String(v));
  return v;
}

export function syncWarpQualityUI(root = document) {
  const k = getWarpPixelsK();
  const out = root.getElementById('warpPixelsOut');
  if (out) out.textContent = `${k}`;

  for (const btn of getButtons(root)) {
    const v = Number(btn.getAttribute('data-warp-pixels'));
    btn.setAttribute('aria-pressed', String(v === k));
  }
}

export function wireWarpQualityUI(root = document) {
  for (const btn of getButtons(root)) {
    btn.addEventListener('click', () => {
      const v = Number(btn.getAttribute('data-warp-pixels'));
      if (!Number.isFinite(v)) return;
      setWarpPixelsK(v);
      syncWarpQualityUI(root);
    });
  }

  // Initialize selection from storage
  const existing = getWarpPixelsK();
  setWarpPixelsK(existing);
  syncWarpQualityUI(root);
}

export function getWarpBudget() {
  // Interpret the UI numbers as an exact pixel count aligned per iteration.
  const sampleCount = getWarpPixelsK();

  // Derive solver tuning from sampleCount.
  const min = 211;
  const max = 12000;
  const t = clamp((sampleCount - min) / (max - min), 0, 1);

  const pyramidLevels = t > 0.82 ? 4 : 3;
  const iterations = Math.round(90 + 130 * t);
  const step = 2.5 + 17.5 * t;
  const smoothPasses = t > 0.55 ? 2 : 1;

  return { sampleCount, pyramidLevels, iterations, step, smoothPasses };
}
