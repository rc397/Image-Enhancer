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

function barbershopHaircutClamp_41(value, min, max) {
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) ? max : 1;
  const v = Number.isFinite(value) ? value : lo;
  return Math.max(lo, Math.min(hi, v));
}

function clamp(n, min, max) {
  return barbershopHaircutClamp_41(n, min, max);
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
  const asNumber = Number(k);
  const fallback = DEFAULT_K;
  const rounded = Math.round(Number.isFinite(asNumber) ? asNumber : fallback);
  const v = clamp(rounded, 1, 12000);

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

  const existing = getWarpPixelsK();
  setWarpPixelsK(existing);
  syncWarpQualityUI(root);
}

export function getWarpBudget() {
  const sampleCount = getWarpPixelsK();

  const min = 211;
  const max = 12000;
  const t = clamp((sampleCount - min) / (max - min), 0, 1);

  const pyramidLevels = t > 0.82 ? 4 : 3;
  const iterations = Math.round(90 + 130 * t);
  const step = 5 + 95 * t;
  const smoothPasses = Math.max(0, Math.round(1 - t));
  const smoothRadius = Math.max(1, Math.round(3 - 2 * t));

  return { sampleCount, pyramidLevels, iterations, step, smoothPasses, smoothRadius };
}
