'use strict';

(() => {
  const track = document.querySelector('.hero-scroll');
  const stage = track?.querySelector('.hero');
  const video = track?.querySelector('.hero-video');
  if (!track || !stage || !video) return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const screens = Number(track.dataset.scrollScreens) || 3;
  const fps = Number(video.dataset.fps) || 24;
  const reveals = [...document.querySelectorAll('[data-hero-reveal]')].map(element => {
    const [start, end] = element.dataset.heroReveal.split(',').map(Number);
    return {element, start, end};
  });
  const clamp = value => Math.min(1, Math.max(0, value));
  let active = false;
  let failed = false;
  let loaded = false;
  let frame = 0;
  let startY = 0;
  let distance = 1;
  let targetTime = 0;

  function revealAt(progress) {
    for (const {element, start, end} of reveals) {
      const linear = clamp((progress - start) / (end - start));
      const eased = linear * linear * (3 - 2 * linear);
      element.style.setProperty('--hero-reveal-opacity', eased.toFixed(4));
      element.style.setProperty('--hero-reveal-y', `${((1 - eased) * 24).toFixed(2)}px`);
      element.classList.toggle('is-hero-visible', linear > 0);
    }
  }

  // Keep only the latest requested frame. Starting a second seek before the
  // first finishes can starve video decoders during fast forward/reverse scroll.
  function seekLatest() {
    if (!active || video.readyState < 2 || video.seeking || !Number.isFinite(video.duration)) return;
    if (Math.abs(video.currentTime - targetTime) < 0.5 / fps) return;
    try { video.currentTime = targetTime; } catch (_) { /* Retry at the next media event. */ }
  }

  function paint() {
    frame = 0;
    if (!active) return;
    const progress = clamp((window.scrollY - startY) / distance);
    revealAt(progress);
    if (Number.isFinite(video.duration) && video.duration > 0) {
      const lastFrame = Math.max(0, Math.round(video.duration * fps) - 1);
      targetTime = Math.round(progress * lastFrame) / fps;
      seekLatest();
    }
  }

  function queuePaint() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function measure() {
    startY = track.getBoundingClientRect().top + window.scrollY;
    distance = Math.max(1, stage.getBoundingClientRect().height * screens);
    track.style.setProperty('--hero-scroll-distance', `${distance}px`);
    queuePaint();
  }

  function configure() {
    active = !preference.matches && !failed && Boolean(video.canPlayType('video/mp4'));
    document.documentElement.classList.toggle('hero-scroll-ready', active);
    track.classList.toggle('is-scroll-active', active);
    track.classList.toggle('is-static', !active);
    if (!active) {
      video.pause();
      revealAt(1);
      return;
    }
    measure();
    paint();
    if (!loaded) {
      loaded = true;
      video.muted = true;
      video.src = video.dataset.src;
      video.load();
    }
  }

  function mediaReady() {
    track.classList.add('is-video-ready');
    queuePaint();
  }

  video.addEventListener('loadedmetadata', queuePaint);
  video.addEventListener('loadeddata', mediaReady);
  video.addEventListener('canplay', mediaReady);
  video.addEventListener('seeked', seekLatest);
  video.addEventListener('progress', seekLatest);
  video.addEventListener('error', () => {
    failed = true;
    track.classList.remove('is-video-ready');
    configure();
  });
  window.addEventListener('scroll', queuePaint, {passive: true});
  window.addEventListener('resize', measure, {passive: true});
  window.addEventListener('pageshow', measure);
  window.addEventListener('hashchange', queuePaint);
  preference.addEventListener('change', configure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
  configure();
})();
