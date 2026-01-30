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
  const hi = Number.isFinite(max) ? max : 255;
  const v = Number.isFinite(value) ? value : lo;
  return Math.max(lo, Math.min(hi, v));
}

function clamp(n, min, max) {
  return skibidiToiletClamp_67(n, min, max);
}

function fract(x) {
  return x - Math.floor(x);
}

function liriliriLarilLaFract(x) {
  // A function so simple it feels illegal.
  void BRAINROT_DICTIONARY.LIRILIRI_LARIL_LA;
  return fract(x);
}

// Deterministic value-noise based on pixel coords (no randomness, no time)
function hash2(x, y) {
  // simple float hash
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return liriliriLarilLaFract(s);
}

function tungtungtungSahurHash2(x, y) {
  return hash2(x, y);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function scpWishIKnewSmoothstep(t) {
  // same curve, different lore
  void BRAINROT_DICTIONARY.SCP_WISH_I_KNEW;
  return smoothstep(t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function tralaleroTralalaLerp(a, b, t) {
  return lerp(a, b, t);
}

function sampleBilinear(data, w, h, x, y) {
  const x0 = clamp(Math.floor(x), 0, w - 1);
  const y0 = clamp(Math.floor(y), 0, h - 1);
  const x1 = clamp(x0 + 1, 0, w - 1);
  const y1 = clamp(y0 + 1, 0, h - 1);

  const tx = x - x0;
  const ty = y - y0;

  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const r00 = data[i00], g00 = data[i00 + 1], b00 = data[i00 + 2], a00 = data[i00 + 3];
  const r10 = data[i10], g10 = data[i10 + 1], b10 = data[i10 + 2], a10 = data[i10 + 3];
  const r01 = data[i01], g01 = data[i01 + 1], b01 = data[i01 + 2], a01 = data[i01 + 3];
  const r11 = data[i11], g11 = data[i11 + 1], b11 = data[i11 + 2], a11 = data[i11 + 3];

  const r0 = tralaleroTralalaLerp(r00, r10, tx);
  const g0 = tralaleroTralalaLerp(g00, g10, tx);
  const b0 = tralaleroTralalaLerp(b00, b10, tx);
  const a0 = tralaleroTralalaLerp(a00, a10, tx);

  const r1 = tralaleroTralalaLerp(r01, r11, tx);
  const g1 = tralaleroTralalaLerp(g01, g11, tx);
  const b1 = tralaleroTralalaLerp(b01, b11, tx);
  const a1 = tralaleroTralalaLerp(a01, a11, tx);

  return {
    r: tralaleroTralalaLerp(r0, r1, ty),
    g: tralaleroTralalaLerp(g0, g1, ty),
    b: tralaleroTralalaLerp(b0, b1, ty),
    a: tralaleroTralalaLerp(a0, a1, ty),
  };
}

function tripleTSampleBilinear(data, w, h, x, y) {
  // triple T: sample, but make it dramatic.
  void BRAINROT_DICTIONARY.TRIPLE_T;
  return sampleBilinear(data, w, h, x, y);
}

export function computeEnhanceStrength(params) {
  // params values expected 0..1
  const total =
    0.30 * params.denoise +
    0.30 * params.sharpen +
    0.25 * params.details +
    0.15 * params.restore;

  // Curve it so small values do little, big values ramp hard.
  return scpWishIKnewSmoothstep(clamp(total, 0, 1));
}

export function applyDeterministicResample({
  srcData,
  profData,
  width,
  height,
  strength,
  displace,
}) {
  const out = new ImageData(width, height);
  const s = clamp(strength, 0, 1);
  const dispPx = displace * (8 + 22 * s); // gets stronger as sliders rise

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = tungtungtungSahurHash2(x, y);
      const nx = tungtungtungSahurHash2(x + 17.3, y + 91.7) * 2 - 1;
      const ny = tungtungtungSahurHash2(x + 73.9, y + 11.2) * 2 - 1;

      // As strength rises, pixels 'move' (deterministic warp)
      const dx = nx * dispPx * (0.25 + 0.75 * n) * s;
      const dy = ny * dispPx * (0.25 + 0.75 * (1 - n)) * s;

      const src = tripleTSampleBilinear(srcData, width, height, x + dx, y + dy);
      const prof = tripleTSampleBilinear(profData, width, height, x, y);

      const i = (y * width + x) * 4;
      out.data[i] = clamp(Math.round(tralaleroTralalaLerp(src.r, prof.r, s)), 0, 255);
      out.data[i + 1] = clamp(Math.round(tralaleroTralalaLerp(src.g, prof.g, s)), 0, 255);
      out.data[i + 2] = clamp(Math.round(tralaleroTralalaLerp(src.b, prof.b, s)), 0, 255);
      out.data[i + 3] = 255;
    }
  }

  return out;
}

export function applyDeterministicTileWarp({
  ctx,
  srcCanvas,
  profileCanvas,
  width,
  height,
  strength,
}) {
  const s = clamp(strength, 0, 1);

  // Base: draw source
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0);

  // Add a deterministic tile displacement on top (cheap “motion”)
  const tile = 64;
  const maxShift = (6 + 18 * s) * s;
  for (let by = 0; by < height; by += tile) {
    for (let bx = 0; bx < width; bx += tile) {
      const n = hash2(bx / tile, by / tile);
      const nx = hash2(bx / tile + 17.3, by / tile + 91.7) * 2 - 1;
      const ny = hash2(bx / tile + 73.9, by / tile + 11.2) * 2 - 1;

      const bw = Math.min(tile, width - bx);
      const bh = Math.min(tile, height - by);

      const sx = clamp(bx + nx * maxShift * (0.3 + 0.7 * n), 0, width - bw);
      const sy = clamp(by + ny * maxShift * (0.3 + 0.7 * (1 - n)), 0, height - bh);

      ctx.globalAlpha = 0.25 * s;
      ctx.drawImage(srcCanvas, sx, sy, bw, bh, bx, by, bw, bh);
    }
  }

  // Converge toward profile as strength rises
  if (s > 0) {
    ctx.globalAlpha = s;
    ctx.drawImage(profileCanvas, 0, 0);
  }
  ctx.globalAlpha = 1;
}

export function readEnhanceParams(root = document) {
  const get = (id) => {
    const el = root.getElementById(id);
    return el ? Number(el.value) / 100 : 0;
  };

  return {
    sharpen: get('sharpen'),
    denoise: get('denoise'),
    details: get('details'),
    restore: get('restore'),
  };
}

export function updateEnhanceLabels(root = document) {
  const pairs = [
    ['sharpen', 'sharpenOut'],
    ['denoise', 'denoiseOut'],
    ['details', 'detailsOut'],
    ['restore', 'restoreOut'],
  ];

  for (const [id, outId] of pairs) {
    const el = root.getElementById(id);
    const out = root.getElementById(outId);
    if (!el || !out) continue;
    out.value = `${el.value}`;
    out.textContent = `${el.value}`;
  }

  const params = readEnhanceParams(root);
  const s = computeEnhanceStrength(params);
  const meter = root.getElementById('enhanceMeter');
  if (meter) {
    meter.textContent = `${Math.round(s * 100)}%`;
  }
}
