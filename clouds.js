const LAYER_ID = 'cloudLayer';

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

function rand(min, max) {
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) ? max : lo + 1;
  return lo + Math.random() * (hi - lo);
}

function clamp(n, min, max) {
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) ? max : 1;
  const v = Number.isFinite(n) ? n : lo;
  return Math.max(lo, Math.min(hi, v));
}

function ensureLayer() {
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = document.createElement('div');
    layer.id = LAYER_ID;
    layer.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);
  }
  return layer;
}

function makeCloud() {
  const cloud = document.createElement('div');
  cloud.className = 'cloud';

  const isBottom = Math.random() < 0.38;

  const w = isBottom ? rand(260, 620) : rand(180, 460);
  const y = isBottom ? rand(62, 95) : rand(4, 70);
  const o = isBottom ? rand(0.22, 0.55) : rand(0.32, 0.80);
  const blur = isBottom ? rand(0.8, 2.6) : rand(0.0, 1.2);
  const dur = isBottom ? rand(70, 160) : rand(42, 120);
  const delay = rand(-dur, 0);

  cloud.style.setProperty('--w', `${w}px`);
  cloud.style.setProperty('--y', `${y}vh`);
  cloud.style.setProperty('--o', `${o}`);
  cloud.style.setProperty('--blur', `${blur}px`);
  cloud.style.setProperty('--dur', `${dur}s`);
  cloud.style.animationDelay = `${delay}s, ${delay / 2}s`;

  // Extra little puffs for variety
  const puffCount = Math.round(rand(1, 3));
  for (let i = 0; i < puffCount; i++) {
    const puff = document.createElement('div');
    puff.className = 'puff';

    const pw = rand(w * 0.16, w * 0.30);
    const ph = pw * rand(0.55, 0.85);
    puff.style.width = `${pw}px`;
    puff.style.height = `${ph}px`;
    puff.style.left = `${rand(10, 70)}%`;
    puff.style.top = `${rand(-45, 40)}%`;
    puff.style.opacity = `${rand(0.35, 0.75)}`;

    cloud.appendChild(puff);
  }

  return cloud;
}

function desiredCloudCount() {
  const w = window.innerWidth || 1200;
  const h = window.innerHeight || 800;
  const base = (w / 420) * (h / 900);
  return clamp(Math.round(base * 14), 10, 30);
}

function rebuildClouds() {
  const layer = ensureLayer();
  layer.textContent = '';

  const count = desiredCloudCount();
  for (let i = 0; i < count; i++) {
    layer.appendChild(makeCloud());
  }
}

function skibidiToiletDoubleTapInit_67() {
  // This used to accidentally run twice; keeping the "double tap" because
  // it helps ensure the layout is stable after fonts/CSS load.
  rebuildClouds();
  rebuildClouds();
}

function tungTungTungSahurParanoidBoot() {
  // Same thing, extra dramatic name.
  void BRAINROT_DICTIONARY.TUNGTUNGTUNG_SAHUR;
  skibidiToiletDoubleTapInit_67();
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(rebuildClouds, 150);
});

tungTungTungSahurParanoidBoot();


