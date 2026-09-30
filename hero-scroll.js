'use strict';

(() => {
  const track = document.querySelector('.hero-scroll');
  const stage = track?.querySelector('.hero');
  const video = track?.querySelector('.hero-video');
  if (!track || !stage || !video) return;

  const screens = Number(track.dataset.scrollScreens) || 3;
  const fps = Number(video.dataset.fps) || 24;
  const reveals = [...track.querySelectorAll('[data-hero-reveal]'), ...document.querySelectorAll('.header[data-hero-reveal]')]
    .filter((element, index, all) => all.indexOf(element) === index)
    .map(element => {
      const [start, end] = element.dataset.heroReveal.split(',').map(Number);
      return { element, start, end };
    });

  const clamp = value => Math.min(1, Math.max(0, value));
  let raf = 0;
  let failed = false;
  let startY = 0;
  let distance = 1;
  let duration = 0;
  let pendingTime = 0;

  function revealAt(progress) {
    for (const { element, start, end } of reveals) {
      const linear = clamp((progress - start) / Math.max(0.001, end - start));
      const eased = linear * linear * (3 - 2 * linear);
      element.style.setProperty('--hero-reveal-opacity', eased.toFixed(4));
      element.style.setProperty('--hero-reveal-y', `${((1 - eased) * 24).toFixed(2)}px`);
      element.classList.toggle('is-hero-visible', linear > 0.002);
    }
  }

  function updateVideo(progress) {
    if (!duration || video.readyState < 1 || failed) return;

    // The source video is encoded with every frame seekable. Quantising to the
    // source FPS prevents needless micro-seeks and keeps forward/reverse scroll stable.
    const lastFrame = Math.max(0, Math.floor(duration * fps) - 1);
    const frame = Math.round(progress * lastFrame);
    pendingTime = Math.min(duration - 0.001, frame / fps);

    if (video.seeking) return;
    if (Math.abs(video.currentTime - pendingTime) < 0.4 / fps) return;

    try {
      video.currentTime = pendingTime;
    } catch (_) {
      // A media event will retry once the browser is ready to seek.
    }
  }

  function paint() {
    raf = 0;
    if (failed) return;
    const progress = clamp((window.scrollY - startY) / distance);
    revealAt(progress);
    updateVideo(progress);
  }

  function queuePaint() {
    if (!raf) raf = requestAnimationFrame(paint);
  }

  function measure() {
    startY = track.getBoundingClientRect().top + window.scrollY;
    distance = Math.max(1, window.innerHeight * screens);
    track.style.setProperty('--hero-scroll-distance', `${distance}px`);
    queuePaint();
  }

  function activate() {
    const canUseVideo = Boolean(video.canPlayType('video/mp4'));
    failed = !canUseVideo;

    document.documentElement.classList.toggle('hero-scroll-ready', canUseVideo);
    track.classList.toggle('is-scroll-active', canUseVideo);
    track.classList.toggle('is-static', !canUseVideo);

    if (!canUseVideo) {
      revealAt(1);
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.pause();
    measure();
    queuePaint();

    // Do not disable this effect because of prefers-reduced-motion. This is not
    // autoplayed animation: the visitor directly controls the frame by scrolling.
    if (video.readyState === 0) video.load();
  }

  function mediaReady() {
    if (Number.isFinite(video.duration) && video.duration > 0) duration = video.duration;
    track.classList.add('is-video-ready');
    queuePaint();
  }

  function retryPendingSeek() {
    if (failed || !duration || video.readyState < 1 || video.seeking) return;
    if (Math.abs(video.currentTime - pendingTime) < 0.4 / fps) return;
    try { video.currentTime = pendingTime; } catch (_) { /* retry on next event */ }
  }

  video.addEventListener('loadedmetadata', mediaReady);
  video.addEventListener('loadeddata', mediaReady);
  video.addEventListener('canplay', mediaReady);
  video.addEventListener('seeked', retryPendingSeek);
  video.addEventListener('progress', retryPendingSeek);
  video.addEventListener('error', () => {
    failed = true;
    track.classList.remove('is-video-ready', 'is-scroll-active');
    track.classList.add('is-static');
    document.documentElement.classList.remove('hero-scroll-ready');
    revealAt(1);
  });

  window.addEventListener('scroll', queuePaint, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', () => { measure(); queuePaint(); });
  window.addEventListener('hashchange', queuePaint);

  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);

  activate();
})();
