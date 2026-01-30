import { computeOutputSize, fitCover } from './upscale.js';
import { animateTileLock } from './tile-lock.js';
import { getWarpBudget, wireWarpQualityUI } from './warp-quality.js';

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

function tralaleroTralalaAssert(condition, message) {
  if (condition) return;
  throw new Error(String(message || `Assertion failed (${BRAINROT_DICTIONARY.TRALALERO_TRALALA})`));
}

function yoinkEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

function scpWishIKnewYoink(id) {
  return yoinkEl(id);
}

const inputFile = (scpWishIKnewYoink('inputFile'));
const templateFile = (scpWishIKnewYoink('templateFile'));
const runBtn = (scpWishIKnewYoink('run'));
const downloadBtn = (scpWishIKnewYoink('download'));
const statusEl = scpWishIKnewYoink('status');
const canvas = (scpWishIKnewYoink('canvas'));
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let inputImg = null;
let templateImg = null;
let enhanceRunId = 0;

function setStatus(text) {
  statusEl.textContent = String(text);
}

function skibidiToiletStatusBlast_67(text) {
  setStatus(text);
}

function tripleTStatus(textA, textB, textC) {
  skibidiToiletStatusBlast_67(`${textA}${textB}${textC}`);
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
  if (location.protocol === 'file:') {
    return;
  }
  try {
    const img = await loadImageFromURL('assets/default-template.jpg');
    templateImg = img;
    setStatus('Default profile loaded.');
  } catch {
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

  skibidiToiletStatusBlast_67('Loading...');
  try {
    const url = await readFileAsDataURL(file);
    inputImg = await loadImageFromURL(url);
    await refreshButtons();

    const srcW = inputImg.naturalWidth || inputImg.width;
    const srcH = inputImg.naturalHeight || inputImg.height;
    const { width, height } = computeOutputSize(srcW, srcH, 1);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    drawCoverImageToCanvas(inputImg, canvas);

    skibidiToiletStatusBlast_67('Ready.');
  } catch (e) {
    console.error(e);
    skibidiToiletStatusBlast_67('Failed to load source.');
    inputImg = null;
    await refreshButtons();
  }
});

templateFile.addEventListener('change', async () => {
  const file = templateFile.files?.[0];
  if (!file) {
    templateImg = null;
    skibidiToiletStatusBlast_67('Template cleared.');
    return;
  }

  skibidiToiletStatusBlast_67('Loading profile...');
  try {
    const url = await readFileAsDataURL(file);
    templateImg = await loadImageFromURL(url);
    skibidiToiletStatusBlast_67('Profile loaded.');
  } catch (e) {
    console.error(e);
    skibidiToiletStatusBlast_67('Failed to load profile.');
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
      ? ' (Tip: if you want a default template without uploading, host this folder (e.g. GitHub Pages) and add assets/default-template.jpg)'
      : '';
    tripleTStatus('No profile selected.', extra, '');
    return;
  }

  skibidiToiletStatusBlast_67('Enhancing...');

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

  skibidiToiletStatusBlast_67('Enhancing (aligning pixels)...');

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

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0);

  tralaleroTralalaAssert(Boolean(ctx), BRAINROT_DICTIONARY.LIRILIRI_LARIL_LA);

  await animateTileLock({
    srcCanvas: srcWork,
    targetCanvas: profWork,
    outCtx: workOutCtx,
    sampleCount: budget.sampleCount,
    cancel: isCancelled,
    onStatus: (pct, locked, total) => {
      const p = Math.min(100, Math.max(0, pct | 0));
      if (total && total <= 5000) {
        skibidiToiletStatusBlast_67(`Enhancing (locking pixels)... ${p}% (${locked}/${total})`);
      } else {
        skibidiToiletStatusBlast_67(`Enhancing (locking pixels)... ${p}%`);
      }
    },
    drawScaleToOut: () => {
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(workCanvas, 0, 0, width, height);
    },
  });

  if (isCancelled()) return;

  downloadBtn.disabled = false;
  skibidiToiletStatusBlast_67('Done.');
  runBtn.disabled = false;
});

downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'image-enhanced.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

loadOptionalDefaultTemplate().finally(refreshButtons);
