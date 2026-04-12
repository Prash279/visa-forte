"use client";

// PageEffects — runs the scroll-reveal IntersectionObserver on every page.
// Any element with className "r" animates in when it enters the viewport.
// This component renders nothing visible — it only wires up the observer.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".r");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("vis");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [pathname]); // re-run on route change so new pages animate correctly

  return null;
}