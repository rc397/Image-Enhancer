function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const STORAGE_KEY = 'warpPixelsK';
const DEFAULT_K = 1000;

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
  // Interpret the UI numbers as thousands of pixels (211 -> 211k, 12000 -> 12M)
  const k = getWarpPixelsK();
  const maxPixels = k * 1000;

  // Derive solver tuning from budget.
  const logMin = Math.log10(211_000);
  const logMax = Math.log10(12_000_000);
  const t = clamp((Math.log10(maxPixels) - logMin) / (logMax - logMin), 0, 1);

  const pyramidLevels = t > 0.72 ? 4 : 3;
  const iterations = Math.round(85 + 170 * t);
  const step = 1.6 - 0.25 * t;
  const smoothPasses = t > 0.6 ? 2 : 1;

  return { maxPixels, pyramidLevels, iterations, step, smoothPasses };
}
