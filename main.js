const inputFile = document.getElementById('inputFile');
const templateFile = document.getElementById('templateFile');
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
    const img = await loadImageFromURL('assets/obama-template.png');
    templateImg = img;
    setStatus('Default Obama template loaded.');
  } catch {
    // no default; that's fine
  }
}

function clamp255(x) {
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

function luminance(r, g, b) {
  // Rec.709
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function fitContain(srcW, srcH, dstW, dstH) {
  const s = Math.min(dstW / srcW, dstH / srcH);
  const w = Math.max(1, Math.floor(srcW * s));
  const h = Math.max(1, Math.floor(srcH * s));
  const x = Math.floor((dstW - w) / 2);
  const y = Math.floor((dstH - h) / 2);
  return { x, y, w, h };
}

function fitCover(srcW, srcH, dstW, dstH) {
  const s = Math.max(dstW / srcW, dstH / srcH);
  const w = Math.max(1, Math.ceil(srcW * s));
  const h = Math.max(1, Math.ceil(srcH * s));
  const x = Math.floor((dstW - w) / 2);
  const y = Math.floor((dstH - h) / 2);
  return { x, y, w, h };
}

function drawImageToSize(img, width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const c = off.getContext('2d', { willReadFrequently: true });

  // black background to avoid transparency weirdness
  c.fillStyle = '#000';
  c.fillRect(0, 0, width, height);

  const r = fitContain(img.naturalWidth || img.width, img.naturalHeight || img.height, width, height);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, r.x, r.y, r.w, r.h);

  return { canvas: off, ctx: c };
}

function drawImageToSizeCover(img, width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const c = off.getContext('2d');

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const r = fitCover(srcW, srcH, width, height);

  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, r.x, r.y, r.w, r.h);

  return { canvas: off, ctx: c };
}

function obamaFy(templateData, width, height) {
  // Hard replace: output is just the template pixels.
  const out = new ImageData(width, height);
  out.data.set(templateData.data);
  return out;
}

async function refreshButtons() {
  runBtn.disabled = !inputImg;
  downloadBtn.disabled = true;
}

inputFile.addEventListener('change', async () => {
  const file = inputFile.files?.[0];
  if (!file) return;

  setStatus('Loading input image...');
  try {
    const url = await readFileAsDataURL(file);
    inputImg = await loadImageFromURL(url);
    await refreshButtons();
    setStatus('Input loaded. Click Obama-fy.');
  } catch (e) {
    console.error(e);
    setStatus('Failed to load input.');
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

  setStatus('Loading template...');
  try {
    const url = await readFileAsDataURL(file);
    templateImg = await loadImageFromURL(url);
    setStatus('Template loaded.');
  } catch (e) {
    console.error(e);
    setStatus('Failed to load template.');
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
      ? ' (Tip: if you want a default template without uploading, host this folder (e.g. GitHub Pages) and add assets/obama-template.png)'
      : '';
    setStatus('No Obama template found. Upload one in the UI or add assets/obama-template.png' + extra);
    return;
  }

  setStatus('Making it Obama...');

  // target size: preserve input, but cap for performance
  const maxDim = 1400;
  const srcW = inputImg.naturalWidth || inputImg.width;
  const srcH = inputImg.naturalHeight || inputImg.height;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const width = Math.max(1, Math.floor(srcW * scale));
  const height = Math.max(1, Math.floor(srcH * scale));

  canvas.width = width;
  canvas.height = height;

  // We ignore input pixels; we only use its dimensions.
  const templOff = drawImageToSizeCover(templateImg, width, height);
  const templData = templOff.ctx.getImageData(0, 0, width, height);

  const out = obamaFy(templData, width, height);
  ctx.putImageData(out, 0, 0);

  downloadBtn.disabled = false;
  setStatus('Done.');
});

downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'obama-fied.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// Try to auto-load default template at startup (optional)
loadOptionalDefaultTemplate().finally(refreshButtons);
