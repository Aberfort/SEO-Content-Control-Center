"use client";

import { useEffect } from "react";

export function HomeReveals() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home-redesign");

    if (!root) {
      return undefined;
    }

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.classList.add("reveal-ready");

    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));

      return () => {
        root.classList.remove("reveal-ready");
        items.forEach((item) => item.classList.remove("is-visible"));
      };
    }

    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px 24% 0px", threshold: 0.01 }
    );

    items.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
      items.forEach((item) => item.classList.remove("is-visible"));
    };
  }, []);

  return null;
}
