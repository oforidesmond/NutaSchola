"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  doneNavigationProgress,
  startNavigationProgress,
  subscribeNavigationProgress,
} from "./progress-store";

const SHOW_DELAY_MS = 120;
const SAFETY_TIMEOUT_MS = 10_000;
const COMPLETE_HOLD_MS = 180;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldHandleAnchor(anchor: HTMLAnchorElement, url: URL) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  if (url.pathname === current.pathname && url.search === current.search) {
    return false;
  }

  return true;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completing, setCompleting] = useState(false);

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const visibleRef = useRef(false);
  const pathnameRef = useRef(pathname);

  function clearTimers() {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }

  function begin() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    visibleRef.current = false;
    setCompleting(false);
    setProgress(0);

    showTimerRef.current = setTimeout(() => {
      visibleRef.current = true;
      setActive(true);
      setProgress(0.12);
      trickleTimerRef.current = setInterval(() => {
        setProgress((current) => {
          if (current >= 0.9) return current;
          const remaining = 0.9 - current;
          return current + remaining * 0.08;
        });
      }, 350);
    }, SHOW_DELAY_MS);

    safetyTimerRef.current = setTimeout(() => {
      doneNavigationProgress();
    }, SAFETY_TIMEOUT_MS);
  }

  function finish() {
    if (!pendingRef.current) {
      clearTimers();
      return;
    }
    pendingRef.current = false;
    const wasVisible = visibleRef.current;
    clearTimers();

    if (!wasVisible) {
      visibleRef.current = false;
      setActive(false);
      setCompleting(false);
      setProgress(0);
      return;
    }

    setCompleting(true);
    setProgress(1);
    setActive(true);

    completeTimerRef.current = setTimeout(() => {
      visibleRef.current = false;
      setActive(false);
      setCompleting(false);
      setProgress(0);
    }, COMPLETE_HOLD_MS);
  }

  useEffect(() => {
    return subscribeNavigationProgress((event) => {
      if (event === "start") begin();
      else finish();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once on mount
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return;
      if (event.defaultPrevented) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (!shouldHandleAnchor(anchor, url)) return;
      startNavigationProgress();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    doneNavigationProgress();
  }, [pathname]);

  return (
    <>
      <div
        className="nav-progress"
        data-active={active ? "true" : "false"}
        aria-hidden
      >
        <div
          className="nav-progress__bar"
          data-completing={completing ? "true" : "false"}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <span className="sr-only" aria-live="polite">
        {active && !completing ? "Navigating…" : ""}
      </span>
    </>
  );
}
