function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function toGray(imgData) {
  const { data, width, height } = imgData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return gray;
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
  const min = 211;
  const max = 12000;
  const t = clamp((sampleCount - min) / (max - min), 0, 1);

  // Smaller tiles at higher settings = more visible “puzzle” motion.
  const tile = clamp(Math.round(40 - 24 * t), 16, 48);
  const searchRadius = clamp(Math.round(10 + 54 * t), 10, 80);
  const searchStep = t > 0.6 ? 3 : 4;
  const frames = Math.round(70 + 90 * t);

  // Movement aggressiveness
  const moveAlpha = lerp(0.22, 0.55, t);
  const snapDist = lerp(1.5, 3.5, t);

  return { tile, searchRadius, searchStep, frames, moveAlpha, snapDist };
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

  const { tile, searchRadius, searchStep, frames, moveAlpha, snapDist } =
    chooseTileParams(sampleCount);

  // Precompute grayscale
  const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  const tctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  const srcImg = sctx.getImageData(0, 0, w, h);
  const tgtImg = tctx.getImageData(0, 0, w, h);
  const srcGray = toGray(srcImg);
  const tgtGray = toGray(tgtImg);

  const pts = makeSamplePattern(tile);

  // Build tiles (grid)
  const tiles = [];
  for (let y = 0; y + tile <= h; y += tile) {
    for (let x = 0; x + tile <= w; x += tile) {
      tiles.push({ sx: x, sy: y, x, y, gx: x, gy: y, locked: false });
    }
  }

  // For each tile, find best matching location in target within a search window.
  // This is deterministic and happens once.
  for (let i = 0; i < tiles.length; i++) {
    if (cancel && cancel()) return 'cancelled';
    const t = tiles[i];

    let best = Infinity;
    let bestX = t.sx;
    let bestY = t.sy;

    const minX = clamp(t.sx - searchRadius, 0, w - tile);
    const maxX = clamp(t.sx + searchRadius, 0, w - tile);
    const minY = clamp(t.sy - searchRadius, 0, h - tile);
    const maxY = clamp(t.sy + searchRadius, 0, h - tile);

    for (let yy = minY; yy <= maxY; yy += searchStep) {
      for (let xx = minX; xx <= maxX; xx += searchStep) {
        const s = scorePatch(srcGray, tgtGray, w, h, t.sx, t.sy, xx, yy, tile, pts);
        if (s < best) {
          best = s;
          bestX = xx;
          bestY = yy;
        }
      }
    }

    t.gx = bestX;
    t.gy = bestY;
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
