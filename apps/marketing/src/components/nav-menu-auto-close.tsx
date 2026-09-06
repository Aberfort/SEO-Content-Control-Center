"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const menuSelector = "details.desktop-mega-menu, details.mobile-menu";

/**
 * The header's mega menu and mobile menu are plain `<details>` elements —
 * intentionally dependency-free, but native `<details>` has no built-in way
 * to close on an outside click or on navigation. This renders nothing; it
 * only adds that behavior.
 */
export function NavMenuAutoClose() {
  const pathname = usePathname();

  // Close whenever the route changes (covers link clicks once navigation
  // completes, plus back/forward and any non-click navigation).
  useEffect(() => {
    document.querySelectorAll<HTMLDetailsElement>(menuSelector).forEach((menu) => {
      menu.open = false;
    });
  }, [pathname]);

  // Close immediately on any click outside the open menu's own toggle, so a
  // link inside the panel closes it right away instead of waiting for the
  // route-change effect above.
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node;

      document.querySelectorAll<HTMLDetailsElement>(menuSelector).forEach((menu) => {
        if (!menu.open) {
          return;
        }

        const summary = menu.querySelector("summary");

        if (summary?.contains(target)) {
          return;
        }

        menu.open = false;
      });
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  return null;
}
