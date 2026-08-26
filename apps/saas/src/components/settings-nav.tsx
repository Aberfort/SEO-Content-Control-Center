"use client";

import { useEffect, useRef, useState } from "react";

const sections = [
  { id: "deliverables-title", label: "Deliverables" },
  { id: "activity-title", label: "Activity" },
  { id: "notifications-title", label: "Notifications" },
  { id: "security-title", label: "Security" },
  { id: "members-title", label: "Members" },
  { id: "billing-title", label: "Billing" }
] as const;

export function SettingsNav() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    if (targets.length === 0) {
      return;
    }

    setActiveId(targets[0]!.id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0]!.target.id);
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    for (const target of targets) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setIndicator(null);
      return;
    }

    const activeLink = linkRefs.current.get(activeId);
    const nav = navRef.current;

    if (!activeLink || !nav) {
      return;
    }

    const navBounds = nav.getBoundingClientRect();
    const linkBounds = activeLink.getBoundingClientRect();
    setIndicator({ left: linkBounds.left - navBounds.left, width: linkBounds.width });
  }, [activeId]);

  return (
    <nav className="settings-nav" aria-label="Settings sections" ref={navRef}>
      {indicator ? (
        <span
          className="settings-nav-indicator"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          aria-hidden="true"
        />
      ) : null}
      {sections.map((section) => (
        <a
          aria-current={activeId === section.id ? "true" : undefined}
          href={`#${section.id}`}
          key={section.id}
          ref={(element) => {
            if (element) {
              linkRefs.current.set(section.id, element);
            } else {
              linkRefs.current.delete(section.id);
            }
          }}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
