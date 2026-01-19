export function computeOutputSize(srcW, srcH, scaleFactor) {
  const w0 = Math.max(1, Math.floor(srcW * scaleFactor));
  const h0 = Math.max(1, Math.floor(srcH * scaleFactor));

  // Browser-friendly caps (keeps Pages usable on mid devices).
  const maxDim = 8192;
  const maxPixels = 30_000_000; // ~30MP

  let w = w0;
  let h = h0;

  const dimScale = Math.min(1, maxDim / Math.max(w, h));
  w = Math.max(1, Math.floor(w * dimScale));
  h = Math.max(1, Math.floor(h * dimScale));

  const px = w * h;
  if (px > maxPixels) {
    const s = Math.sqrt(maxPixels / px);
    w = Math.max(1, Math.floor(w * s));
    h = Math.max(1, Math.floor(h * s));
  }

  return { width: w, height: h };
}

export function fitCover(srcW, srcH, dstW, dstH) {
  const s = Math.max(dstW / srcW, dstH / srcH);
  const w = Math.max(1, Math.ceil(srcW * s));
  const h = Math.max(1, Math.ceil(srcH * s));
  const x = Math.floor((dstW - w) / 2);
  const y = Math.floor((dstH - h) / 2);
  return { x, y, w, h };
}
