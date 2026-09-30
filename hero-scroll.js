'use strict';

(() => {
  const track = document.querySelector('.hero-scroll');
  const stage = track?.querySelector('.hero');
  const video = track?.querySelector('.hero-video');
  if (!track || !stage || !video) return;

  const screens = Number(track.dataset.scrollScreens) || 5;
  const fps = Number(video.dataset.fps) || 24;
  const isMobile = matchMedia('(max-width: 700px)').matches;
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
  let targetTime = 0;
  let displayedTime = 0;
  let lastProgress = -1;

  function revealAt(progress) {
    for (const { element, start, end } of reveals) {
      const linear = clamp((progress - start) / Math.max(0.001, end - start));
      const eased = linear * linear * (3 - 2 * linear);
      element.style.setProperty('--hero-reveal-opacity', eased.toFixed(4));
      element.style.setProperty('--hero-reveal-y', `${((1 - eased) * 24).toFixed(2)}px`);
      element.classList.toggle('is-hero-visible', linear > 0.002);
    }
  }

  function setTarget(progress) {
    if (!duration || video.readyState < 1 || failed) return;
    const lastFrame = Math.max(0, Math.floor(duration * fps) - 1);
    const frame = Math.round(progress * lastFrame);
    targetTime = Math.min(duration - 0.001, frame / fps);
  }

  function seekTowardTarget() {
    if (!duration || failed || video.readyState < 1) return;

    // Mobile Safari/Chrome stutter badly when every tiny scroll delta starts a seek.
    // Keep one seek in flight and gently catch up to the latest target instead.
    const gap = targetTime - displayedTime;
    const smoothing = isMobile ? 0.34 : 0.55;
    displayedTime += gap * smoothing;

    const frameStep = 1 / fps;
    if (Math.abs(targetTime - displayedTime) < frameStep * 0.45) {
      displayedTime = targetTime;
    }

    if (!video.seeking && Math.abs(video.currentTime - displayedTime) >= frameStep * 0.55) {
      try { video.currentTime = displayedTime; } catch (_) { /* retry next frame */ }
    }
  }

  function paint() {
    raf = 0;
    if (failed) return;

    const progress = clamp((window.scrollY - startY) / distance);
    if (Math.abs(progress - lastProgress) > 0.0001) {
      revealAt(progress);
      setTarget(progress);
      lastProgress = progress;
    }

    seekTowardTarget();

    // Continue only while the displayed frame is still catching the requested frame.
    if (Math.abs(targetTime - displayedTime) > 1 / (fps * 2)) {
      raf = requestAnimationFrame(paint);
    }
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
    if (video.readyState === 0) video.load();
  }

  function mediaReady() {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      duration = video.duration;
      if (!Number.isFinite(displayedTime) || displayedTime < 0) displayedTime = 0;
    }
    track.classList.add('is-video-ready');
    queuePaint();
  }

  function onSeeked() {
    displayedTime = video.currentTime;
    queuePaint();
  }

  video.addEventListener('loadedmetadata', mediaReady);
  video.addEventListener('loadeddata', mediaReady);
  video.addEventListener('canplay', mediaReady);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('progress', queuePaint);
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
