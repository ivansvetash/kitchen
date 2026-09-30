SIASHOV Kitchens — PRO video-scroll patch

Replace ONLY these three files in the repository root:
1) index.html
2) hero-scroll.js
3) hero-scroll.css

Do NOT replace your current videos:
- assets/kitchen-scroll.mp4
- assets/kitchen-scroll-mobile.mp4

What changed:
- 5-screen scroll remains.
- The selected MP4 is fetched completely first and then played from a local Blob,
  so the first scroll does not race network range requests.
- The poster stays visible until an actual video frame is ready.
- requestAnimationFrame + coalesced precise seeks smooth the scrub.
- requestVideoFrameCallback is used where available to reveal the video on a painted frame.
- Mobile height-only resize events from collapsing browser chrome are ignored to reduce jitter.
- Progress uses the stable 100svh sticky-stage height instead of changing window.innerHeight.
