(() => {
  const config = window.PORTFOLIO_CONFIG || { videos: [], characterFrames: [] };
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const dialog = document.getElementById('video-dialog');
  const dialogVideo = document.getElementById('dialog-video');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogSubtitle = document.getElementById('dialog-subtitle');
  const closeDialog = document.getElementById('close-dialog');

  const heroCards = Array.from(document.querySelectorAll('.reel-card'));
  const featureCards = Array.from(document.querySelectorAll('.feature-card.preview-enabled'));
  const allVideoCards = Array.from(document.querySelectorAll('[data-video]'));

  function stopPreview(card) {
    const video = card.querySelector('video');
    if (!video) return;
    card.classList.remove('is-previewing');
    video.pause();
    try { video.currentTime = 0; } catch (e) {}
  }

  function startPreview(card) {
    if (!canHover.matches || reducedMotion.matches || dialog.open) return;
    const index = Number(card.dataset.video);
    const meta = config.videos[index];
    const video = card.querySelector('video');
    if (!video || !meta?.preview) return;
    if (!video.src) video.src = meta.preview;
    video.muted = true;
    video.play().then(() => card.classList.add('is-previewing')).catch(() => {});
  }

  heroCards.forEach((card) => {
    card.addEventListener('pointerenter', () => startPreview(card));
    card.addEventListener('pointerleave', () => stopPreview(card));
    card.addEventListener('focusin', () => startPreview(card));
    card.addEventListener('focusout', () => stopPreview(card));
  });

  featureCards.forEach((card) => {
    card.addEventListener('pointerenter', () => startPreview(card));
    card.addEventListener('pointerleave', () => stopPreview(card));
    card.addEventListener('focusin', () => startPreview(card));
    card.addEventListener('focusout', () => stopPreview(card));
  });

  function openVideo(index) {
    const meta = config.videos[index];
    if (!meta) return;
    allVideoCards.forEach(stopPreview);
    dialogTitle.textContent = meta.title;
    dialogSubtitle.textContent = meta.subtitle || '';
    dialogVideo.src = meta.src;
    dialogVideo.poster = meta.poster || '';
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialogVideo.currentTime = 0;
    dialogVideo.play().catch(() => {});
  }

  allVideoCards.forEach((card) => {
    card.addEventListener('click', () => openVideo(Number(card.dataset.video)));
  });

  function closeModal() {
    dialogVideo.pause();
    dialogVideo.removeAttribute('src');
    dialogVideo.load();
    dialog.close();
    document.body.classList.remove('dialog-open');
  }

  closeDialog.addEventListener('click', closeModal);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const clickedInDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
    if (!clickedInDialog) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.open) closeModal();
  });

  // Character follows mouse by swapping sequence frames.
  const heroCharacter = document.getElementById('hero-character');
  const frames = config.characterFrames || [];
  let currentFrame = Math.floor(frames.length / 2);
  let targetFrame = currentFrame;
  let rafId = null;
  const cache = new Map();
  function preloadFrame(src) {
    if (cache.has(src)) return cache.get(src);
    const img = new Image();
    img.src = src;
    cache.set(src, img);
    return img;
  }
  frames.slice(0, 10).forEach(preloadFrame);
  function updateCharacter() {
    if (currentFrame !== targetFrame) {
      currentFrame += Math.sign(targetFrame - currentFrame);
      const src = frames[currentFrame];
      preloadFrame(src);
      heroCharacter.src = src;
    }
    rafId = requestAnimationFrame(updateCharacter);
  }
  if (frames.length) { preloadFrame(frames[currentFrame]); heroCharacter.src = frames[currentFrame]; rafId = requestAnimationFrame(updateCharacter); }

  function setTargetFromPointer(x, y) {
    const nx = Math.min(Math.max(x / window.innerWidth, 0), 1);
    const ny = Math.min(Math.max(y / window.innerHeight, 0), 1);
    const combined = (nx * 0.72) + (ny * 0.28);
    targetFrame = Math.round(combined * (frames.length - 1));
    // preload neighbors for smoothness
    [targetFrame - 1, targetFrame, targetFrame + 1].forEach((i) => {
      if (i >= 0 && i < frames.length) preloadFrame(frames[i]);
    });
  }

  window.addEventListener('pointermove', (e) => setTargetFromPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerleave', () => { targetFrame = Math.floor(frames.length / 2); });

  // touch-friendly fallback
  window.addEventListener('deviceorientation', (e) => {
    if (canHover.matches) return;
    const gamma = e.gamma || 0;
    const beta = e.beta || 0;
    const nx = (gamma + 45) / 90;
    const ny = (beta + 30) / 60;
    setTargetFromPointer(nx * window.innerWidth, ny * window.innerHeight);
  }, true);
})();
