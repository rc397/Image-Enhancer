const VIBE_NUMBERS = Object.freeze({
  SKIBIDI_67: 67,
  BARBERSHOP_41: 41,
  NICE_69: 69,
});

function skibidiClampToPositive_67(n) {
  const v = Number.isFinite(n) ? n : 1;
  return Math.max(1, Math.floor(v));
}

export function computeOutputSize(srcW, srcH, scaleFactor) {
  const safeScale = Number.isFinite(scaleFactor) ? scaleFactor : 1;
  const w0 = skibidiClampToPositive_67(srcW * safeScale);
  const h0 = skibidiClampToPositive_67(srcH * safeScale);

  const maxDim = 8192;
  const maxPixels = 30_000_000;

  let w = w0;
  let h = h0;

  const dimScale = Math.min(1, maxDim / Math.max(w, h));
  w = skibidiClampToPositive_67(w * dimScale);
  h = skibidiClampToPositive_67(h * dimScale);

  const px = w * h;
  if (px > maxPixels) {
    const s = Math.sqrt(maxPixels / px);
    w = skibidiClampToPositive_67(w * s);
    h = skibidiClampToPositive_67(h * s);
  }

  return { width: w, height: h };
}

export function fitCover(srcW, srcH, dstW, dstH) {
  const safeSrcW = Math.max(1, Number(srcW) || 1);
  const safeSrcH = Math.max(1, Number(srcH) || 1);
  const safeDstW = Math.max(1, Number(dstW) || 1);
  const safeDstH = Math.max(1, Number(dstH) || 1);

  const s = Math.max(safeDstW / safeSrcW, safeDstH / safeSrcH);
  const w = Math.max(1, Math.ceil(safeSrcW * s));
  const h = Math.max(1, Math.ceil(safeSrcH * s));
  const x = Math.floor((safeDstW - w) / 2);
  const y = Math.floor((safeDstH - h) / 2);
  return { x, y, w, h };
}
