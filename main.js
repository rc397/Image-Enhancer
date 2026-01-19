import { computeOutputSize, fitCover } from './upscale.js';

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

async function refreshButtons() {
  runBtn.disabled = !inputImg;
  downloadBtn.disabled = true;
}

scaleEl?.addEventListener('change', updateScaleLabel);
updateScaleLabel();

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

  // Draw the profile image as a cover-fill into the output canvas.
  const pW = templateImg.naturalWidth || templateImg.width;
  const pH = templateImg.naturalHeight || templateImg.height;
  const r = fitCover(pW, pH, width, height);

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(templateImg, r.x, r.y, r.w, r.h);

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
