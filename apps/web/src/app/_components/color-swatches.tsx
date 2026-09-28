"use client";

import { useEffect, useState } from "react";

const TOKEN_NAMES = [
  "--bg",
  "--bg-raised",
  "--ink",
  "--ink-muted",
  "--rule",
  "--rule-emphasis",
  "--signal",
  "--signal-fill",
  "--danger",
  "--success",
];

function readTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const styles = getComputedStyle(document.documentElement);
  const values: Record<string, string> = {};
  for (const name of TOKEN_NAMES) {
    values[name] = styles.getPropertyValue(name).trim();
  }
  return values;
}

/**
 * The mockup repaints these swatches from a click listener on the theme
 * toggle plus a `setTimeout(paintSwatches, 0)`. A `MutationObserver` on
 * `<html>`'s `data-theme` attribute is more robust than that: it also
 * catches an OS-level color-scheme change for a visitor who never made
 * an explicit choice (`ThemeToggle` only writes `data-theme` once a
 * choice is made — a system-preference-only visitor's first toggle, or
 * an OS switch mid-visit with no stored preference, wouldn't otherwise
 * trigger a repaint).
 */
export function ColorSwatches() {
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    setTokens(readTokens());

    const observer = new MutationObserver(() => setTokens(readTokens()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => setTokens(readTokens());
    mql.addEventListener("change", onSchemeChange);

    return () => {
      observer.disconnect();
      mql.removeEventListener("change", onSchemeChange);
    };
  }, []);

  return (
    <div className="swatch-grid">
      {TOKEN_NAMES.map((name) => (
        <div className="swatch" key={name}>
          <div className="swatch__color" style={{ background: tokens[name] }} />
          <div className="swatch__meta">
            <div className="swatch__name">{name}</div>
            <div className="swatch__value">{tokens[name]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
