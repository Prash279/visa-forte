'use client';

import React, { useRef, useEffect } from 'react';

export default function HeroVideo(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set muted as a DOM property — React's SSR omits the muted attribute,
    // so the HTML attribute alone is unreliable for autoplay policy compliance
    video.muted = true;

    // Explicitly trigger playback — autoPlay can be suppressed when the DOM node
    // is touched during React hydration, so we drive it from the effect
    video.play().catch(() => undefined);

    // Replay from the start on every hero section mouseenter
    const hero = video.closest('section') as HTMLElement | null;
    if (!hero) return;

    function replay(): void {
      if (!video) return;
      video.currentTime = 0;
      video.play().catch(() => undefined);
    }

    hero.addEventListener('mouseenter', replay);
    return () => {
      hero.removeEventListener('mouseenter', replay);
    };
  }, []);

  return (
    // suppressHydrationWarning prevents React from recreating the video node
    // when it detects the muted attribute mismatch between server and client HTML
    <video
      ref={videoRef}
      className="hero-video"
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      suppressHydrationWarning
    >
      <source src="/videos/hero-bg.mp4" type="video/mp4" />
    </video>
  );
}
