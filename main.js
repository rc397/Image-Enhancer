import { computeOutputSize, fitCover } from './upscale.js';
import { animateTileLock } from './tile-lock.js';
import { getWarpBudget, wireWarpQualityUI } from './warp-quality.js';

const inputFile = document.getElementById('inputFile');
const templateFile = document.getElementById('templateFile');
const runBtn = document.getElementById('run');
const downloadBtn = document.getElementById('download');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let inputImg = null;
let templateImg = null;
let enhanceRunId = 0;

function setStatus(text) {
  statusEl.textContent = text;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

async function loadOptionalDefaultTemplate() {
  // When opened as file://, most browsers block fetching local relative assets.
  // The UI upload still works because it uses FileReader.
  if (location.protocol === 'file:') {
    return;
  }
  try {
    const img = await loadImageFromURL('assets/default-template.webp');
    templateImg = img;
    setStatus('Default profile loaded.');
  } catch {
    // no default; that's fine
  }
}

function drawCoverImageToCanvas(img, outCanvas) {
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  const w = outCanvas.width;
  const h = outCanvas.height;
  const iW = img.naturalWidth || img.width;
  const iH = img.naturalHeight || img.height;
  const r = fitCover(iW, iH, w, h);
  outCtx.clearRect(0, 0, w, h);
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(img, r.x, r.y, r.w, r.h);
  return outCtx;
}

function chooseWorkSize(dstW, dstH) {
  // Working resolution for warping preview (separate from output size).
  const maxDim = 560;
  const s = Math.min(1, maxDim / Math.max(dstW, dstH));
  return {
    w: Math.max(64, Math.round(dstW * s)),
    h: Math.max(64, Math.round(dstH * s)),
  };
}

async function refreshButtons() {
  runBtn.disabled = !inputImg;
  downloadBtn.disabled = true;
}

wireWarpQualityUI();

inputFile.addEventListener('change', async () => {
  const file = inputFile.files?.[0];
  if (!file) return;

  setStatus('Loading...');
  try {
    const url = await readFileAsDataURL(file);
    inputImg = await loadImageFromURL(url);
    await refreshButtons();

    // Show the original immediately in the preview area.
    const srcW = inputImg.naturalWidth || inputImg.width;
    const srcH = inputImg.naturalHeight || inputImg.height;
    const { width, height } = computeOutputSize(srcW, srcH, 1);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    drawCoverImageToCanvas(inputImg, canvas);

    setStatus('Ready.');
  } catch (e) {
    console.error(e);
    setStatus('Failed to load source.');
    inputImg = null;
    await refreshButtons();
  }
});

templateFile.addEventListener('change', async () => {
  const file = templateFile.files?.[0];
  if (!file) {
    templateImg = null;
    setStatus('Template cleared.');
    return;
  }

  setStatus('Loading profile...');
  try {
    const url = await readFileAsDataURL(file);
    templateImg = await loadImageFromURL(url);
    setStatus('Profile loaded.');
  } catch (e) {
    console.error(e);
    setStatus('Failed to load profile.');
    templateImg = null;
  }
});

runBtn.addEventListener('click', async () => {
  if (!inputImg) return;

  const runId = ++enhanceRunId;
  const isCancelled = () => runId !== enhanceRunId;

  if (!templateImg) {
    await loadOptionalDefaultTemplate();
  }

  if (!templateImg) {
    const extra = location.protocol === 'file:'
      ? ' (Tip: if you want a default template without uploading, host this folder (e.g. GitHub Pages) and add assets/default-template.webp)'
      : '';
    setStatus('No profile selected.' + extra);
    return;
  }

  setStatus('Enhancing...');

  runBtn.disabled = true;
  downloadBtn.disabled = true;

  const srcW = inputImg.naturalWidth || inputImg.width;
  const srcH = inputImg.naturalHeight || inputImg.height;
  const { width, height } = computeOutputSize(srcW, srcH, 1);

  canvas.width = width;
  canvas.height = height;

  const budget = getWarpBudget();

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  drawCoverImageToCanvas(inputImg, srcCanvas);

  const profCanvas = document.createElement('canvas');
  profCanvas.width = width;
  profCanvas.height = height;
  drawCoverImageToCanvas(templateImg, profCanvas);

  // 1) Animated preview: mathematical pixel motion toward the profile.
  // Use a working resolution for speed, but render scaled to the output canvas.
  setStatus('Enhancing (aligning pixels)...');

  const work = chooseWorkSize(width, height);
  const workCanvas = document.createElement('canvas');
  workCanvas.width = work.w;
  workCanvas.height = work.h;
  const workOutCtx = workCanvas.getContext('2d', { willReadFrequently: true });

  const srcWork = document.createElement('canvas');
  srcWork.width = work.w;
  srcWork.height = work.h;
  drawCoverImageToCanvas(inputImg, srcWork);

  const profWork = document.createElement('canvas');
  profWork.width = work.w;
  profWork.height = work.h;
  drawCoverImageToCanvas(templateImg, profWork);

  // Ensure the output shows the original immediately (no blank frame).
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0);

  await animateTileLock({
    srcCanvas: srcWork,
    targetCanvas: profWork,
    outCtx: workOutCtx,
    sampleCount: budget.sampleCount,
    cancel: isCancelled,
    onStatus: (pct, locked, total) => {
      const p = Math.min(100, Math.max(0, pct | 0));
      setStatus(`Enhancing (locking pixels)... ${p}% (${locked}/${total})`);
    },
    drawScaleToOut: () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(workCanvas, 0, 0, width, height);
    },
  });

  if (isCancelled()) return;

  // 2) No final snap step — keep the last animated frame as the result.

  downloadBtn.disabled = false;
  setStatus('Done.');
  runBtn.disabled = false;
});

downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'image-enhanced.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// Try to auto-load default template at startup (optional)
loadOptionalDefaultTemplate().finally(refreshButtons);
