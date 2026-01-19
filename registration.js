function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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

function warpRGBA(srcRGBA, w, h, dx, dy, outImgData) {
  const out = outImgData.data;
  const rgba = [0, 0, 0, 255];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const sx = x + dx[i];
      const sy = y + dy[i];
      sampleBilinearRGBA(srcRGBA, w, h, sx, sy, rgba);
      const o = i * 4;
      out[o] = clamp(Math.round(rgba[0]), 0, 255);
      out[o + 1] = clamp(Math.round(rgba[1]), 0, 255);
      out[o + 2] = clamp(Math.round(rgba[2]), 0, 255);
      out[o + 3] = 255;
    }
  }
}

/**
 * Demons-style registration (deterministic) on a working-resolution canvas.
 * It iteratively updates a displacement field so the warped source matches target.
 */
export async function animateDemonsRegistration({
  srcCtx,
  targetCtx,
  outCtx,
  workWidth,
  workHeight,
  iterations,
  step,
  smoothRadius,
  smoothPasses,
  frameStride,
  cancel,
  onStatus,
  drawScaleToOut,
}) {
  const w = workWidth;
  const h = workHeight;
  const iters = Math.max(1, iterations | 0);
  const stepSize = Number.isFinite(step) ? step : 1.2;
  const blurR = clamp((smoothRadius | 0) || 2, 1, 8);
  const blurPasses = clamp((smoothPasses | 0) || 1, 1, 3);
  const stride = clamp((frameStride | 0) || 1, 1, 8);

  const srcImg = srcCtx.getImageData(0, 0, w, h);
  const tgtImg = targetCtx.getImageData(0, 0, w, h);

  const srcRGBA = srcImg.data;
  const tgtGray = imageDataToGray(tgtImg);
  const { gx: tgtGx, gy: tgtGy } = computeGradient(tgtGray, w, h);

  const dx = new Float32Array(w * h);
  const dy = new Float32Array(w * h);

  // A scratch for warped source gray
  const warpedGray = new Float32Array(w * h);
  const outImg = outCtx.createImageData(w, h);

  function renderToOut() {
    // Warp RGBA using current displacement
    warpRGBA(srcRGBA, w, h, dx, dy, outImg);
    outCtx.putImageData(outImg, 0, 0);

    // If the caller wants us to scale this working canvas to a bigger output,
    // they can pass a function that draws outCtx.canvas onto the final canvas.
    if (typeof drawScaleToOut === 'function') {
      drawScaleToOut();
    }
  }

  // Initial: show original
  renderToOut();

  const eps = 1e-3;
  for (let iter = 0; iter < iters; iter++) {
    if (cancel && cancel()) return 'cancelled';

    // Build warped gray by sampling source gray at displaced coords.
    // Convert source to gray on the fly from srcRGBA sampling.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const sx = x + dx[i];
        const sy = y + dy[i];

        // Sample RGBA and compute gray
        const rgba = [0, 0, 0, 255];
        sampleBilinearRGBA(srcRGBA, w, h, sx, sy, rgba);
        warpedGray[i] = 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2];
      }
    }

    // Update displacement (demons update using target gradient)
    for (let i = 0; i < dx.length; i++) {
      const diff = tgtGray[i] - warpedGray[i];
      const gxi = tgtGx[i];
      const gyi = tgtGy[i];
      const denom = gxi * gxi + gyi * gyi + diff * diff + eps;
      dx[i] += stepSize * (diff * gxi) / denom;
      dy[i] += stepSize * (diff * gyi) / denom;
    }

    // Smooth the displacement field to keep it coherent
    smoothField(dx, w, h, blurR, blurPasses);
    smoothField(dy, w, h, blurR, blurPasses);

    if (iter % stride === 0 || iter === iters - 1) {
      if (onStatus) onStatus(iter + 1, iters);
      renderToOut();
      // Yield to the browser so the animation is visible
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  return 'done';
}
