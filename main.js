import { computeOutputSize, fitCover } from './upscale.js';
import {
  applyDeterministicResample,
  applyDeterministicTileWarp,
  computeEnhanceStrength,
  readEnhanceParams,
  updateEnhanceLabels,
} from './enhancements.js';

const inputFile = document.getElementById('inputFile');
const templateFile = document.getElementById('templateFile');
const scaleEl = document.getElementById('scale');
const scaleOut = document.getElementById('scaleOut');
const runBtn = document.getElementById('run');
const downloadBtn = document.getElementById('download');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let inputImg = null;
let templateImg = null;

function wireEnhancementsUI() {
  const ids = ['sharpen', 'denoise', 'details', 'restore'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('input', () => updateEnhanceLabels());
  }
  updateEnhanceLabels();
}

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

function updateScaleLabel() {
  const v = Number(scaleEl?.value || 2);
  if (scaleOut) scaleOut.value = `${v}×`;
  if (scaleOut) scaleOut.textContent = `${v}×`;
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

async function refreshButtons() {
  runBtn.disabled = !inputImg;
  downloadBtn.disabled = true;
}

scaleEl?.addEventListener('change', updateScaleLabel);
updateScaleLabel();
wireEnhancementsUI();

inputFile.addEventListener('change', async () => {
  const file = inputFile.files?.[0];
  if (!file) return;

  setStatus('Loading...');
  try {
    const url = await readFileAsDataURL(file);
    inputImg = await loadImageFromURL(url);
    await refreshButtons();
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

  const srcW = inputImg.naturalWidth || inputImg.width;
  const srcH = inputImg.naturalHeight || inputImg.height;
  const factor = Number(scaleEl?.value || 2);
  const { width, height } = computeOutputSize(srcW, srcH, factor);

  canvas.width = width;
  canvas.height = height;

  const params = readEnhanceParams();
  const strength = computeEnhanceStrength(params);

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  drawCoverImageToCanvas(inputImg, srcCanvas);

  const profCanvas = document.createElement('canvas');
  profCanvas.width = width;
  profCanvas.height = height;
  drawCoverImageToCanvas(templateImg, profCanvas);

  const pixels = width * height;
  const perPixelThreshold = 4_000_000; // keep UI responsive on large upscales

  if (pixels <= perPixelThreshold) {
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const profCtx = profCanvas.getContext('2d', { willReadFrequently: true });
    const srcImgData = srcCtx.getImageData(0, 0, width, height);
    const profImgData = profCtx.getImageData(0, 0, width, height);

    const out = applyDeterministicResample({
      srcData: srcImgData.data,
      profData: profImgData.data,
      width,
      height,
      strength,
      displace: 1,
    });

    ctx.putImageData(out, 0, 0);
  } else {
    applyDeterministicTileWarp({
      ctx,
      srcCanvas,
      profileCanvas: profCanvas,
      width,
      height,
      strength,
    });
  }

  downloadBtn.disabled = false;
  setStatus('Done.');
});

downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'image-enhanced.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// Try to auto-load default template at startup (optional)
loadOptionalDefaultTemplate().finally(refreshButtons);
