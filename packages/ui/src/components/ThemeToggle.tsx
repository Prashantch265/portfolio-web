"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "schematic-theme";

function resolveTheme(): "light" | "dark" {
  const stored = safeGet(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private-mode / storage-disabled — theme just won't persist across visits
  }
}

/**
 * Bug fixed from the mockup: it only set `data-theme` when the visitor
 * made an EXPLICIT choice, leaving it unset for a system-dark visitor —
 * so `[data-theme="dark"] .icon-moon { display: block }` never matched
 * and the sun icon showed in dark mode. This component always writes the
 * *resolved* theme to the attribute (see layout.tsx's inline anti-FOUC
 * script, which does the same before first paint), so the icon and every
 * other `[data-theme="dark"]` selector are reliably correct either way.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark" | null) ?? resolveTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    safeSet(STORAGE_KEY, next);
    setTheme(next);
  }

  return (
    <button className="theme-toggle" data-theme-toggle aria-label="Toggle color theme" type="button" onClick={toggle}>
      <svg className="icon-sun" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <g stroke="currentColor" strokeWidth="1.3">
          <line x1="8" y1="0.5" x2="8" y2="2.5" />
          <line x1="8" y1="13.5" x2="8" y2="15.5" />
          <line x1="0.5" y1="8" x2="2.5" y2="8" />
          <line x1="13.5" y1="8" x2="15.5" y2="8" />
          <line x1="2.6" y1="2.6" x2="4" y2="4" />
          <line x1="12" y1="12" x2="13.4" y2="13.4" />
          <line x1="2.6" y1="13.4" x2="4" y2="12" />
          <line x1="12" y1="4" x2="13.4" y2="2.6" />
        </g>
      </svg>
      <svg className="icon-moon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.5 9.5A6 6 0 1 1 6.5 2.5a5 5 0 0 0 7 7z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </button>
  );
}

export const THEME_STORAGE_KEY = STORAGE_KEY;
