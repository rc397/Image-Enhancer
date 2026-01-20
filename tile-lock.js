function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function hash32(x) {
  // Deterministic integer hash
  x |= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function toGray(imgData) {
  const { data, width, height } = imgData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return gray;
}

function toRGBA32(imgData) {
  // Little-endian: ABGR in memory if using Uint32Array view; we just preserve bytes.
  return new Uint32Array(imgData.data.buffer);
}

function makeSamplePattern(tile) {
  // Deterministic sample points inside a tile.
  const pts = [];
  const steps = tile <= 18 ? 4 : tile <= 28 ? 5 : 6;
  for (let j = 0; j < steps; j++) {
    for (let i = 0; i < steps; i++) {
      const x = (i + 0.5) * (tile / steps);
      const y = (j + 0.5) * (tile / steps);
      pts.push({ x, y });
    }
  }
  return pts;
}

function scorePatch(srcGray, tgtGray, w, h, sx, sy, tx, ty, tile, pts) {
  // Compare src patch at (sx,sy) to target patch at (tx,ty)
  let sum = 0;
  for (let k = 0; k < pts.length; k++) {
    const px = (pts[k].x | 0);
    const py = (pts[k].y | 0);

    const x0 = clamp((sx + px) | 0, 0, w - 1);
    const y0 = clamp((sy + py) | 0, 0, h - 1);
    const x1 = clamp((tx + px) | 0, 0, w - 1);
    const y1 = clamp((ty + py) | 0, 0, h - 1);

    const a = srcGray[y0 * w + x0];
    const b = tgtGray[y1 * w + x1];
    sum += Math.abs(a - b);
  }
  return sum;
}

function chooseTileParams(sampleCount) {
  // Explicit ladder so max is ALWAYS pixels (tile=1).
  // These correspond to the UI buttons.
  const sc = Number(sampleCount) || 211;
  let tile = 24;
  if (sc >= 12000) tile = 1;
  else if (sc >= 8000) tile = 3;
  else if (sc >= 4000) tile = 6;
  else if (sc >= 1000) tile = 10;
  else if (sc >= 560) tile = 16;

  const t = clamp((sc - 211) / (12000 - 211), 0, 1);
  const frames = Math.round(80 + 120 * t);

  // Movement aggressiveness
  const moveAlpha = lerp(0.28, 0.82, t);
  const snapDist = lerp(1.0, 2.5, t);

  return { tile, frames, moveAlpha, snapDist, t };
}

function renderTiles({
  outCtx,
  srcCanvas,
  tiles,
  tile,
  showBorders,
}) {
  const w = outCtx.canvas.width;
  const h = outCtx.canvas.height;

  outCtx.clearRect(0, 0, w, h);
  outCtx.imageSmoothingEnabled = false;

  // Draw moved tiles
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    outCtx.drawImage(
      srcCanvas,
      t.sx,
      t.sy,
      tile,
      tile,
      t.x,
      t.y,
      tile,
      tile
    );
  }

  if (showBorders) {
    outCtx.save();
    outCtx.lineWidth = 1;
    outCtx.strokeStyle = 'rgba(255,255,255,0.30)';
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      outCtx.strokeRect(t.x + 0.5, t.y + 0.5, tile - 1, tile - 1);
    }
    outCtx.restore();
  }
}

function sortIndicesByValue(values) {
  const idx = new Uint32Array(values.length);
  for (let i = 0; i < idx.length; i++) idx[i] = i;
  // JS sort only works on arrays, so convert; still OK at our working resolutions.
  const arr = Array.from(idx);
  arr.sort((a, b) => {
    const da = values[a] - values[b];
    if (da !== 0) return da;
    return a - b;
  });
  return Uint32Array.from(arr);
}

function buildGlobalPixelAssignment(srcGray, tgtGray) {
  // Global “anywhere” match by ranking pixels by luminance.
  // This produces a target-like image using source pixels, and is deterministic.
  const srcOrder = sortIndicesByValue(srcGray);
  const tgtOrder = sortIndicesByValue(tgtGray);
  return { srcOrder, tgtOrder };
}

function buildGlobalTileAssignment(srcGray, tgtGray, w, h, tile) {
  const tilesX = Math.floor(w / tile);
  const tilesY = Math.floor(h / tile);
  const count = tilesX * tilesY;

  const srcVals = new Float32Array(count);
  const tgtVals = new Float32Array(count);

  let k = 0;
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tile;
      const y0 = ty * tile;
      let sSum = 0;
      let tSum = 0;
      let n = 0;
      for (let y = 0; y < tile; y += Math.max(1, (tile / 6) | 0)) {
        for (let x = 0; x < tile; x += Math.max(1, (tile / 6) | 0)) {
          const i = (y0 + y) * w + (x0 + x);
          sSum += srcGray[i];
          tSum += tgtGray[i];
          n++;
        }
      }
      srcVals[k] = sSum / n;
      tgtVals[k] = tSum / n;
      k++;
    }
  }

  const srcOrder = sortIndicesByValue(srcVals);
  const tgtOrder = sortIndicesByValue(tgtVals);
  return { srcOrder, tgtOrder, tilesX, tilesY };
}

function renderPixelsFrame({ outCtx, w, h, srcRGBA32, srcOrder, tgtOrder, t }) {
  const tt = easeInOut(t);
  const img = outCtx.createImageData(w, h);
  const out32 = new Uint32Array(img.data.buffer);

  // Transparent background so movement is obvious.
  for (let i = 0; i < out32.length; i++) out32[i] = 0;

  // Draw only a growing prefix to keep frames fast (and clearly animated).
  const total = srcOrder.length;
  const drawCount = Math.max(1, Math.min(total, Math.round(total * tt)));
  const n = w * h;

  for (let k = 0; k < drawCount; k++) {
    const s = srcOrder[k];
    const d = tgtOrder[k];

    // Scatter start: start position comes from a deterministic permutation.
    const startPos = tgtOrder[(k * 97) % total];

    const sx = startPos % w;
    const sy = (startPos / w) | 0;
    const dx = d % w;
    const dy = (d / w) | 0;

    const cx = clamp((sx + (dx - sx) * tt) | 0, 0, w - 1);
    const cy = clamp((sy + (dy - sy) * tt) | 0, 0, h - 1);
    out32[cy * w + cx] = srcRGBA32[s];
  }

  outCtx.putImageData(img, 0, 0);
}

export function getTileLockBudget(sampleCount) {
  return chooseTileParams(sampleCount);
}

export async function animateTileLock({
  srcCanvas,
  targetCanvas,
  outCtx,
  cancel,
  onStatus,
  drawScaleToOut,
  sampleCount,
}) {
  if (!srcCanvas || !targetCanvas || !outCtx) {
    throw new Error('animateTileLock: missing canvas/context');
  }

  const w = outCtx.canvas.width;
  const h = outCtx.canvas.height;

  const { tile, frames, moveAlpha, snapDist } = chooseTileParams(sampleCount);

  // Precompute grayscale
  const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  const tctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  const srcImg = sctx.getImageData(0, 0, w, h);
  const tgtImg = tctx.getImageData(0, 0, w, h);
  const srcGray = toGray(srcImg);
  const tgtGray = toGray(tgtImg);

  // Pixel mode (highest setting): 1x1 tiles, global anywhere mapping.
  if (tile === 1) {
    const srcRGBA32 = toRGBA32(srcImg);
    const { srcOrder, tgtOrder } = buildGlobalPixelAssignment(srcGray, tgtGray);

    for (let f = 0; f < frames; f++) {
      if (cancel && cancel()) return 'cancelled';
      const pct = Math.min(100, Math.max(0, Math.round((f / Math.max(1, frames - 1)) * 100)));
      if (onStatus) onStatus(pct, 0, srcOrder.length);
      renderPixelsFrame({
        outCtx,
        w,
        h,
        srcRGBA32,
        srcOrder,
        tgtOrder,
        t: f / Math.max(1, frames - 1),
      });
      if (typeof drawScaleToOut === 'function') drawScaleToOut();
      await new Promise((r) => requestAnimationFrame(r));
    }

    // Final frame at t=1
    renderPixelsFrame({ outCtx, w, h, srcRGBA32, srcOrder, tgtOrder, t: 1 });
    if (typeof drawScaleToOut === 'function') drawScaleToOut();
    return 'done';
  }

  // Tile mode: global anywhere matching by tile luminance ranking.
  const { srcOrder, tgtOrder, tilesX, tilesY } = buildGlobalTileAssignment(srcGray, tgtGray, w, h, tile);

  const tiles = [];
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const sx = tx * tile;
      const sy = ty * tile;
      tiles.push({ sx, sy, x: sx, y: sy, gx: sx, gy: sy, locked: false });
    }
  }

  // Assign each source tile to a target tile position.
  for (let k = 0; k < srcOrder.length; k++) {
    const sIdx = srcOrder[k];
    const dIdx = tgtOrder[k];

    const sx = (sIdx % tilesX) * tile;
    const sy = ((sIdx / tilesX) | 0) * tile;
    const dx = (dIdx % tilesX) * tile;
    const dy = ((dIdx / tilesX) | 0) * tile;

    const tileObj = tiles[sIdx];
    tileObj.sx = sx;
    tileObj.sy = sy;
    tileObj.gx = dx;
    tileObj.gy = dy;
  }

  // Scatter start: scramble starting positions (deterministic), then fly into place.
  const perm = new Uint32Array(tiles.length);
  for (let i = 0; i < perm.length; i++) perm[i] = i;
  const permArr = Array.from(perm);
  permArr.sort((a, b) => (hash32(a * 65537) - hash32(b * 65537)));
  for (let i = 0; i < tiles.length; i++) {
    const srcI = permArr[i];
    const dstI = i;
    const p = tiles[srcI];
    const startX = (dstI % tilesX) * tile;
    const startY = ((dstI / tilesX) | 0) * tile;
    p.x = startX;
    p.y = startY;
    p.locked = false;
  }

  // Animate movement and locking.
  for (let f = 0; f < frames; f++) {
    if (cancel && cancel()) return 'cancelled';

    let lockedCount = 0;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      if (t.locked) {
        lockedCount++;
        continue;
      }

      const dx = t.gx - t.x;
      const dy = t.gy - t.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= snapDist) {
        t.x = t.gx;
        t.y = t.gy;
        t.locked = true;
        lockedCount++;
        continue;
      }

      // Aggressive motion: large alpha means visible jumps.
      t.x += dx * moveAlpha;
      t.y += dy * moveAlpha;
    }

    const pct = Math.min(100, Math.max(0, Math.round((f / Math.max(1, frames - 1)) * 100)));
    if (onStatus) onStatus(pct, lockedCount, tiles.length);

    renderTiles({ outCtx, srcCanvas, tiles, tile, showBorders: true });
    if (typeof drawScaleToOut === 'function') drawScaleToOut();

    await new Promise((r) => requestAnimationFrame(r));

    if (lockedCount === tiles.length) break;
  }

  // Final render
  renderTiles({ outCtx, srcCanvas, tiles, tile, showBorders: false });
  if (typeof drawScaleToOut === 'function') drawScaleToOut();
  return 'done';
}
