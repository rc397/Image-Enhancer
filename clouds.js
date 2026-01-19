const LAYER_ID = 'cloudLayer';

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(rebuildClouds, 150);
});

rebuildClouds();
