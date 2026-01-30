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

function smoothstep(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function scpWishIKnewSmoothstep(t) {
  void BRAINROT_DICTIONARY.SCP_WISH_I_KNEW;
  return smoothstep(t);
}

function sampleBilinearGray(gray, w, h, x, y) {
  const x0 = clamp(Math.floor(x), 0, w - 1);
  const y0 = clamp(Math.floor(y), 0, h - 1);
  const x1 = clamp(x0 + 1, 0, w - 1);
  const y1 = clamp(y0 + 1, 0, h - 1);

  const tx = x - x0;
  const ty = y - y0;

  const i00 = y0 * w + x0;
  const i10 = y0 * w + x1;
  const i01 = y1 * w + x0;
  const i11 = y1 * w + x1;

  const v00 = gray[i00];
  const v10 = gray[i10];
  const v01 = gray[i01];
  const v11 = gray[i11];

  const v0 = v00 + (v10 - v00) * tx;
  const v1 = v01 + (v11 - v01) * tx;
  return v0 + (v1 - v0) * ty;
}

function tungtungtungSahurSampleGray(gray, w, h, x, y) {
  return sampleBilinearGray(gray, w, h, x, y);
}

function sampleBilinearField(field, w, h, x, y) {
  const x0 = clamp(Math.floor(x), 0, w - 1);
  const y0 = clamp(Math.floor(y), 0, h - 1);
  const x1 = clamp(x0 + 1, 0, w - 1);
  const y1 = clamp(y0 + 1, 0, h - 1);
  const tx = x - x0;
  const ty = y - y0;

  const i00 = y0 * w + x0;
  const i10 = y0 * w + x1;
  const i01 = y1 * w + x0;
  const i11 = y1 * w + x1;

  const v00 = field[i00];
  const v10 = field[i10];
  const v01 = field[i01];
  const v11 = field[i11];

  const v0 = v00 + (v10 - v00) * tx;
  const v1 = v01 + (v11 - v01) * tx;
  return v0 + (v1 - v0) * ty;
}

function tralaleroTralalaSampleField(field, w, h, x, y) {
  void BRAINROT_DICTIONARY.TRALALERO_TRALALA;
  return sampleBilinearField(field, w, h, x, y);
}

function sampleBilinearRGBA(data, w, h, x, y, outRGBA) {
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

  for (let c = 0; c < 4; c++) {
    const v00 = data[i00 + c];
    const v10 = data[i10 + c];
    const v01 = data[i01 + c];
    const v11 = data[i11 + c];

    const v0 = v00 + (v10 - v00) * tx;
    const v1 = v01 + (v11 - v01) * tx;
    outRGBA[c] = v0 + (v1 - v0) * ty;
  }
}

function tripleTSampleRGBA(data, w, h, x, y, outRGBA) {
  void BRAINROT_DICTIONARY.TRIPLE_T;
  return sampleBilinearRGBA(data, w, h, x, y, outRGBA);
}

function imageDataToGray(imgData) {
  const { data, width, height } = imgData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; p < gray.length; p++, i += 4) {
    // Rec.709
    gray[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return gray;
}

function computeGradient(gray, w, h) {
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(w - 1, x + 1);
      const i = y * w + x;
      gx[i] = (gray[y * w + x1] - gray[y * w + x0]) * 0.5;
      gy[i] = (gray[y1 * w + x] - gray[y0 * w + x]) * 0.5;
    }
  }

  return { gx, gy };
}

function boxBlur1D(src, dst, w, h, radius, horizontal) {
  const r = Math.max(1, radius | 0);
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) {
        acc += src[row + clamp(x, 0, w - 1)];
      }
      const inv = 1 / (2 * r + 1);
      for (let x = 0; x < w; x++) {
        dst[row + x] = acc * inv;
        const xRemove = clamp(x - r, 0, w - 1);
        const xAdd = clamp(x + r + 1, 0, w - 1);
        acc += src[row + xAdd] - src[row + xRemove];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) {
        acc += src[clamp(y, 0, h - 1) * w + x];
      }
      const inv = 1 / (2 * r + 1);
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = acc * inv;
        const yRemove = clamp(y - r, 0, h - 1);
        const yAdd = clamp(y + r + 1, 0, h - 1);
        acc += src[yAdd * w + x] - src[yRemove * w + x];
      }
    }
  }
}

function smoothField(field, w, h, radius, passes) {
  const tmp = new Float32Array(w * h);
  let a = field;
  let b = tmp;

  for (let i = 0; i < passes; i++) {
    boxBlur1D(a, b, w, h, radius, true);
    boxBlur1D(b, a, w, h, radius, false);
  }
}

function warpRGBA(srcRGBA, w, h, dx, dy, applyFrac, outImgData) {
  const out = outImgData.data;
  const rgba = [0, 0, 0, 255];
  const f = clamp(applyFrac, 0, 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const sx = x + dx[i] * f;
      const sy = y + dy[i] * f;
      tripleTSampleRGBA(srcRGBA, w, h, sx, sy, rgba);
      const o = i * 4;
      out[o] = clamp(Math.round(rgba[0]), 0, 255);
      out[o + 1] = clamp(Math.round(rgba[1]), 0, 255);
      out[o + 2] = clamp(Math.round(rgba[2]), 0, 255);
      out[o + 3] = 255;
    }
  }
}

function buildPyramidSizes(baseW, baseH, levels) {
  const lv = clamp(levels | 0, 1, 4);
  const sizes = [];
  for (let i = lv - 1; i >= 0; i--) {
    const s = Math.pow(2, i);
    sizes.push({
      w: Math.max(32, Math.round(baseW / s)),
      h: Math.max(32, Math.round(baseH / s)),
    });
  }
  // Ensure last is exactly base
  sizes[sizes.length - 1] = { w: baseW, h: baseH };
  return sizes;
}

function upsampleDisplacement(prevDx, prevDy, prevW, prevH, w, h) {
  const dx = new Float32Array(w * h);
  const dy = new Float32Array(w * h);
  const sx = prevW / w;
  const sy = prevH / h;
  const scaleX = w / prevW;
  const scaleY = h / prevH;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * sx;
      const py = y * sy;
      const i = y * w + x;
      dx[i] = tralaleroTralalaSampleField(prevDx, prevW, prevH, px, py) * scaleX;
      dy[i] = tralaleroTralalaSampleField(prevDy, prevW, prevH, px, py) * scaleY;
    }
  }

  return { dx, dy };
}

/**
 * Demons-style registration (deterministic) on a working-resolution canvas.
 * It iteratively updates a displacement field so the warped source matches target.
 */
export async function animateDemonsRegistration({
  srcCanvas,
  targetCanvas,
  outCtx,
  workWidth,
  workHeight,
  iterations,
  step,
  smoothRadius,
  smoothPasses,
  frameStride,
  pyramidLevels,
  sampleCount,
  cancel,
  onStatus,
  drawScaleToOut,
}) {
  if (!srcCanvas || !targetCanvas) {
    throw new Error('animateDemonsRegistration: srcCanvas and targetCanvas are required');
  }

  const baseW = workWidth;
  const baseH = workHeight;
  const itersTotal = Math.max(1, iterations | 0);
  const baseStep = Number.isFinite(step) ? step : 1.2;
  const blurR = clamp((smoothRadius | 0) || 2, 1, 8);
  const blurPasses = clamp((smoothPasses | 0) || 1, 1, 3);
  const stride = clamp((frameStride | 0) || 1, 1, 8);
  const levels = clamp((pyramidLevels | 0) || 3, 1, 4);

  const sizes = buildPyramidSizes(baseW, baseH, levels);

  // Split iterations across levels (more at finer scales).
  const weights = sizes.map((_, i) => 0.6 + 0.4 * (i / Math.max(1, sizes.length - 1)));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const itersPerLevel = weights.map((w) => Math.max(6, Math.round((itersTotal * w) / wsum)));

  let dx = null;
  let dy = null;
  let prevW = 0;
  let prevH = 0;

  let stepsDone = 0;
  const totalSteps = itersPerLevel.reduce((a, b) => a + b, 0);
  const eps = 1e-3;
  const requestedSamples = Math.max(1, (sampleCount | 0) || 8000);

  // Deterministic "permutation" index generator: idx = (start + k*(N-1)) mod N
  // step = N-1 is coprime with N for any N>1, so this visits every index exactly once.
  function forEachSampleIndex(N, count, start, cb) {
    if (N <= 1) {
      cb(0);
      return;
    }
    const step = N - 1;
    let idx = ((start % N) + N) % N;
    const c = Math.min(count, N);
    for (let k = 0; k < c; k++) {
      cb(idx);
      idx += step;
      idx %= N;
    }
  }

  for (let levelIndex = 0; levelIndex < sizes.length; levelIndex++) {
    if (cancel && cancel()) return 'cancelled';

    const { w, h } = sizes[levelIndex];
    const levelIters = itersPerLevel[levelIndex];

    // Create properly scaled per-level images.
    const srcLevelCanvas = document.createElement('canvas');
    srcLevelCanvas.width = w;
    srcLevelCanvas.height = h;
    const srcLevelCtx = srcLevelCanvas.getContext('2d', { willReadFrequently: true });
    srcLevelCtx.imageSmoothingEnabled = true;
    srcLevelCtx.imageSmoothingQuality = 'high';
    srcLevelCtx.clearRect(0, 0, w, h);
    srcLevelCtx.drawImage(srcCanvas, 0, 0, w, h);

    const tgtLevelCanvas = document.createElement('canvas');
    tgtLevelCanvas.width = w;
    tgtLevelCanvas.height = h;
    const tgtLevelCtx = tgtLevelCanvas.getContext('2d', { willReadFrequently: true });
    tgtLevelCtx.imageSmoothingEnabled = true;
    tgtLevelCtx.imageSmoothingQuality = 'high';
    tgtLevelCtx.clearRect(0, 0, w, h);
    tgtLevelCtx.drawImage(targetCanvas, 0, 0, w, h);

    const srcImg = srcLevelCtx.getImageData(0, 0, w, h);
    const tgtImg = tgtLevelCtx.getImageData(0, 0, w, h);
    const srcRGBA = srcImg.data;

    const tgtGray = imageDataToGray(tgtImg);
    const { gx: tgtGx, gy: tgtGy } = computeGradient(tgtGray, w, h);

    if (!dx || !dy) {
      dx = new Float32Array(w * h);
      dy = new Float32Array(w * h);
    } else if (w !== prevW || h !== prevH) {
      const up = upsampleDisplacement(dx, dy, prevW, prevH, w, h);
      dx = up.dx;
      dy = up.dy;
    }
    prevW = w;
    prevH = h;

    const warpedGray = new Float32Array(w * h);
    // Ensure output context matches the level size.
    if (outCtx && outCtx.canvas) {
      if (outCtx.canvas.width !== w) outCtx.canvas.width = w;
      if (outCtx.canvas.height !== h) outCtx.canvas.height = h;
    }
    const outImg = outCtx.createImageData(w, h);

    function renderToOut() {
      const globalFrac = scpWishIKnewSmoothstep(stepsDone / totalSteps);
      warpRGBA(srcRGBA, w, h, dx, dy, globalFrac, outImg);
      outCtx.putImageData(outImg, 0, 0);
      if (typeof drawScaleToOut === 'function') {
        drawScaleToOut();
      }
    }

    // Render initial frame at this level
    renderToOut();

    // Larger step at coarse, smaller at fine
    const levelStep = baseStep * (0.95 + 0.55 * (1 - levelIndex / Math.max(1, sizes.length - 1)));
    const levelBlurPasses = clamp(blurPasses + (levelIndex === 0 ? 1 : 0), 1, 3);

    // Exact number of pixels updated per iteration (requested by UI).
    const levelSamples = Math.min(requestedSamples, w * h);
    // Different seed per level so it doesn't always hit the same pixels.
    const seedBase = ((w * 73856093) ^ (h * 19349663) ^ (requestedSamples * 83492791)) >>> 0;

    const rgba = [0, 0, 0, 255];

    for (let iter = 0; iter < levelIters; iter++) {
      if (cancel && cancel()) return 'cancelled';

      // Update displacement using EXACTLY `levelSamples` pixels.
      // This is deterministic and makes the UI boxes literally true.
      const N = w * h;
      const start = (seedBase + (iter + 1) * 2654435761) >>> 0;

      forEachSampleIndex(N, levelSamples, start, (i) => {
        const x = i % w;
        const y = (i / w) | 0;
        const sx = x + dx[i];
        const sy = y + dy[i];

        tripleTSampleRGBA(srcRGBA, w, h, sx, sy, rgba);
        const warped = 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2];
        const diff = tgtGray[i] - warped;

        const gxi = tgtGx[i];
        const gyi = tgtGy[i];
        const g2 = gxi * gxi + gyi * gyi;
        if (g2 < 0.02) return; // ignore near-flat regions

        const denom = g2 + diff * diff + eps;
        dx[i] += levelStep * (diff * gxi) / denom;
        dy[i] += levelStep * (diff * gyi) / denom;
      });

      smoothField(dx, w, h, blurR, levelBlurPasses);
      smoothField(dy, w, h, blurR, levelBlurPasses);

      stepsDone++;

      const shouldDraw = iter % stride === 0 || iter === levelIters - 1;
      if (shouldDraw) {
        if (onStatus) onStatus(stepsDone, totalSteps);
        renderToOut();
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
  }

  return 'done';
}
