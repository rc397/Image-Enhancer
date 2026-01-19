// Interactive clouds: subtle parallax that follows mouse/touch.
// Kept as a separate feature file per project rules.

const root = document.documentElement;

function setShift(x, y) {
  root.style.setProperty('--cloudShiftX', `${x.toFixed(2)}px`);
  root.style.setProperty('--cloudShiftY', `${y.toFixed(2)}px`);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function handlePointer(clientX, clientY) {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;

  // Normalize to [-0.5..0.5]
  const nx = clientX / w - 0.5;
  const ny = clientY / h - 0.5;

  // Gentle movement so it feels “alive” but doesn’t distract.
  const maxX = 26;
  const maxY = 16;

  const x = clamp(nx, -0.5, 0.5) * maxX;
  const y = clamp(ny, -0.5, 0.5) * maxY;

  setShift(x, y);
}

window.addEventListener('mousemove', (e) => {
  handlePointer(e.clientX, e.clientY);
});

window.addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    handlePointer(t.clientX, t.clientY);
  },
  { passive: true }
);

window.addEventListener('mouseleave', () => {
  setShift(0, 0);
});

// Start centered.
setShift(0, 0);
