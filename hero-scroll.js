'use strict';

(() => {
  const track = document.querySelector('.hero-scroll');
  const stage = track?.querySelector('.hero');
  const video = track?.querySelector('.hero-video');
  if (!track || !stage || !video) return;

  const screens = Number(track.dataset.scrollScreens) || 5;
  const fps = Number(video.dataset.fps) || 24;
  const frameStep = 1 / fps;
  const mobileQuery = matchMedia('(max-width: 700px)');
  const isMobile = mobileQuery.matches;

  const reveals = [
    ...track.querySelectorAll('[data-hero-reveal]'),
    ...document.querySelectorAll('.header[data-hero-reveal]'),
  ]
    .filter((element, index, all) => all.indexOf(element) === index)
    .map((element) => {
      const [start, end] = element.dataset.heroReveal.split(',').map(Number);
      return { element, start, end };
    });

  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  let rafId = 0;
  let sourceObjectUrl = '';
  let failed = false;
  let metadataReady = false;
  let videoReady = false;
  let seekInFlight = false;
  let priming = false;

  let startY = 0;
  let distance = 1;
  let duration = 0;
  let targetTime = 0;
  let playheadTime = 0;
  let requestedTime = -1;
  let lastProgress = -1;
  let lastRafTime = 0;
  let lastViewportWidth = window.innerWidth;

  function revealAt(progress) {
    for (const { element, start, end } of reveals) {
      const linear = clamp01((progress - start) / Math.max(0.001, end - start));
      const eased = linear * linear * (3 - 2 * linear);
      element.style.setProperty('--hero-reveal-opacity', eased.toFixed(4));
      element.style.setProperty('--hero-reveal-y', `${((1 - eased) * 24).toFixed(2)}px`);
      element.classList.toggle('is-hero-visible', linear > 0.002);
    }
  }

  function progressNow() {
    return clamp01((window.scrollY - startY) / distance);
  }

  function timeForProgress(progress) {
    if (!duration) return 0;
    const lastFrame = Math.max(0, Math.floor(duration * fps) - 1);
    const frame = Math.round(clamp01(progress) * lastFrame);
    return Math.min(Math.max(0, duration - 0.001), frame / fps);
  }

  function updateTarget(progress = progressNow()) {
    if (!metadataReady || failed) return;
    targetTime = timeForProgress(progress);
  }

  function chooseSourceUrl() {
    const direct = video.getAttribute('src');
    if (direct) return new URL(direct, document.baseURI).href;

    const sources = [...video.querySelectorAll('source[src]')];
    const selected = sources.find((source) => {
      const media = source.getAttribute('media');
      return !media || matchMedia(media).matches;
    });

    return selected ? new URL(selected.getAttribute('src'), document.baseURI).href : '';
  }

  function markReadyAfterPaint() {
    const done = () => {
      if (failed || videoReady || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      videoReady = true;
      track.classList.add('is-video-ready');
      queuePaint();
    };

    if ('requestVideoFrameCallback' in video) {
      video.requestVideoFrameCallback(done);
      // requestVideoFrameCallback is excellent when supported, but a paused video
      // is allowed to delay it. Keep a harmless fallback so the poster never sticks.
      setTimeout(done, 120);
    } else {
      requestAnimationFrame(() => requestAnimationFrame(done));
    }
  }

  function seekTo(time, { force = false } = {}) {
    if (!metadataReady || failed || video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
    if (seekInFlight && !force) return false;

    const precise = Math.min(Math.max(0, duration - 0.001), Math.max(0, time));
    if (!force && Math.abs(video.currentTime - precise) < frameStep * 0.45) return false;

    requestedTime = precise;
    seekInFlight = true;

    try {
      // currentTime is the widely supported precise seek API. The supplied videos
      // are encoded with very frequent keyframes, so there is no need for fastSeek().
      video.currentTime = precise;
      return true;
    } catch (_) {
      seekInFlight = false;
      return false;
    }
  }

  async function primeDecoder() {
    if (priming || videoReady || failed || !metadataReady || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    priming = true;

    updateTarget();
    playheadTime = targetTime;

    // A muted play/pause cycle warms the media pipeline on many mobile browsers.
    // If autoplay policy rejects it, precise seeking still works and a real gesture
    // retries this function later.
    try {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      const promise = video.play();
      if (promise && typeof promise.then === 'function') await promise;
      video.pause();
    } catch (_) {
      // Do not fail the hero just because autoplay warming was blocked.
    }

    const needsSeek = Math.abs(video.currentTime - targetTime) >= frameStep * 0.45;
    if (needsSeek) {
      seekTo(targetTime, { force: true });
    } else {
      seekInFlight = false;
      markReadyAfterPaint();
    }

    priming = false;
  }

  function issueSmoothedSeek(timestamp) {
    if (!videoReady || !metadataReady || failed) return false;

    const dt = lastRafTime ? Math.min(50, Math.max(1, timestamp - lastRafTime)) : 16.67;
    lastRafTime = timestamp;

    // Refresh-rate-independent smoothing. Mobile gets a little more damping to
    // absorb touch momentum without making the scrub feel detached from the finger.
    const tau = isMobile ? 105 : 78;
    const alpha = 1 - Math.exp(-dt / tau);
    playheadTime += (targetTime - playheadTime) * alpha;

    if (Math.abs(targetTime - playheadTime) < frameStep * 0.45) {
      playheadTime = targetTime;
    }

    const quantized = Math.round(playheadTime * fps) / fps;
    const safeTime = Math.min(Math.max(0, duration - 0.001), quantized);

    if (!seekInFlight && Math.abs(requestedTime - safeTime) >= frameStep * 0.75) {
      seekTo(safeTime);
    }

    return Math.abs(targetTime - playheadTime) >= frameStep * 0.45 || seekInFlight;
  }

  function paint(timestamp = performance.now()) {
    rafId = 0;
    if (failed) return;

    const progress = progressNow();
    if (Math.abs(progress - lastProgress) > 0.0001) {
      revealAt(progress);
      updateTarget(progress);
      lastProgress = progress;
    }

    if (issueSmoothedSeek(timestamp)) queuePaint();
  }

  function queuePaint() {
    if (!rafId) rafId = requestAnimationFrame(paint);
  }

  function measure() {
    startY = track.getBoundingClientRect().top + window.scrollY;

    // Use the actual sticky stage height (100svh in CSS), not window.innerHeight.
    // On mobile the browser chrome changes innerHeight while scrolling; using it here
    // makes the progress denominator move under the user's finger and causes jitter.
    const stableStageHeight = Math.max(1, stage.getBoundingClientRect().height);
    distance = stableStageHeight * screens;
    track.style.setProperty('--hero-scroll-distance', `${distance}px`);

    updateTarget();
    queuePaint();
  }

  function failToStatic() {
    failed = true;
    videoReady = false;
    track.classList.remove('is-video-ready', 'is-scroll-active');
    track.classList.add('is-static');
    document.documentElement.classList.remove('hero-scroll-ready');
    revealAt(1);
  }

  function onMetadata() {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    duration = video.duration;
    metadataReady = true;
    updateTarget();
    queuePaint();
  }

  function onPlayableFrame() {
    onMetadata();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) primeDecoder();
  }

  function onSeeked() {
    seekInFlight = false;

    if (!videoReady) {
      playheadTime = Number.isFinite(video.currentTime) ? video.currentTime : targetTime;
      markReadyAfterPaint();
    }

    queuePaint();
  }

  async function loadSelectedVideo() {
    const sourceUrl = chooseSourceUrl();
    if (!sourceUrl) {
      failToStatic();
      return;
    }

    track.classList.add('is-video-loading');

    // For a scroll-scrubbed hero, random access matters more than early linear
    // playback. Fetch the small 5-second asset completely, then hand a local Blob
    // to the video element. That prevents the first scroll from racing network range
    // requests and makes seeking deterministic on both desktop and mobile.
    try {
      const response = await fetch(sourceUrl, {
        cache: 'force-cache',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`Video request failed: ${response.status}`);

      const blob = await response.blob();
      if (!blob.type.startsWith('video/')) {
        // Some hosts omit the MIME type. The browser can still decode the MP4 Blob.
      }

      sourceObjectUrl = URL.createObjectURL(blob);
      video.src = sourceObjectUrl;
      video.preload = 'auto';
      video.load();
    } catch (_) {
      // Network/Blob fallback: use the original same-origin URL and let the browser
      // stream it normally. The poster remains visible until the first frame is ready.
      video.src = sourceUrl;
      video.preload = 'auto';
      try {
        video.load();
      } catch (_) {
        failToStatic();
      }
    }
  }

  function retryPrimeFromGesture() {
    if (!videoReady) primeDecoder();
  }

  function onResize() {
    const width = window.innerWidth;
    const widthChanged = Math.abs(width - lastViewportWidth) > 2;
    lastViewportWidth = width;

    // Ignore height-only resize storms from mobile browser chrome expanding/
    // collapsing during a scroll. Orientation/width changes still re-measure.
    if (!isMobile || widthChanged) measure();
  }

  function activate() {
    const canUseVideo = Boolean(video.canPlayType('video/mp4'));
    if (!canUseVideo) {
      failToStatic();
      return;
    }

    document.documentElement.classList.add('hero-scroll-ready');
    track.classList.add('is-scroll-active');
    track.classList.remove('is-static');

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.pause();

    measure();
    loadSelectedVideo();
  }

  video.addEventListener('loadedmetadata', onMetadata);
  video.addEventListener('loadeddata', onPlayableFrame);
  video.addEventListener('canplay', onPlayableFrame);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', failToStatic);

  window.addEventListener('scroll', queuePaint, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(measure, 120), { passive: true });
  window.addEventListener('pageshow', () => {
    lastRafTime = 0;
    measure();
    queuePaint();
  });
  window.addEventListener('hashchange', queuePaint);

  // One real gesture is enough to retry decoder warming on stricter mobile policies.
  window.addEventListener('pointerdown', retryPrimeFromGesture, { passive: true, once: true });
  window.addEventListener('touchstart', retryPrimeFromGesture, { passive: true, once: true });
  window.addEventListener('wheel', retryPrimeFromGesture, { passive: true, once: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastRafTime = 0;
      measure();
      queuePaint();
    }
  });

  window.addEventListener('pagehide', (event) => {
    if (!event.persisted && sourceObjectUrl) {
      URL.revokeObjectURL(sourceObjectUrl);
      sourceObjectUrl = '';
    }
  });

  if ('ResizeObserver' in window) {
    let measuredHeight = 0;
    new ResizeObserver(() => {
      const nextHeight = Math.round(stage.getBoundingClientRect().height);
      if (Math.abs(nextHeight - measuredHeight) > 2) {
        measuredHeight = nextHeight;
        measure();
      }
    }).observe(stage);
  }

  activate();
})();
