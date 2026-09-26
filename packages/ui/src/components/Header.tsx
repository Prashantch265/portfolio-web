"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Frame } from "./Frame";
import { ThemeToggle } from "./ThemeToggle";
import { PaletteHint } from "./PaletteHint";

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/writing", label: "Writing" },
  { href: "/stack", label: "Stack" },
  { href: "/cv", label: "CV" },
] as const;

const RULE_SEEN_KEY = "schematic-rule-seen";

/**
 * `showRuleExtend`: the header's bottom hairline rule-extension is a
 * once-per-session homepage entrance (center-out, 300ms) — the mockup
 * only puts this element on index.html. Case-study nav treats /work as
 * the active tab too (case studies live under Work), matching the
 * mockup's own deliberate choice.
 */
export function Header({ showRuleExtend = false }: { showRuleExtend?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ruleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!showRuleExtend || !ruleRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(RULE_SEEN_KEY) === "1";
    } catch {
      // storage unavailable — treat as unseen, animation just replays
    }

    const el = ruleRef.current;
    if (seen || reduceMotion) {
      el.style.width = "100%";
      el.style.left = "0";
      return;
    }
    requestAnimationFrame(() => {
      el.style.transition = `width var(--motion-rule) var(--ease-standard), left var(--motion-rule) var(--ease-standard)`;
      el.style.width = "100%";
      el.style.left = "0";
    });
    try {
      sessionStorage.setItem(RULE_SEEN_KEY, "1");
    } catch {
      // fine to skip persisting — just replays next load
    }
  }, [showRuleExtend]);

  function isCurrent(href: string): boolean {
    if (href === "/work") return pathname === "/work" || pathname.startsWith("/work/");
    return pathname === href;
  }

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`} data-site-header>
      {showRuleExtend && <div className="site-header__rule-extend" ref={ruleRef} data-rule-extend />}
      <Frame>
        <div className="site-header__bar">
          <Link href="/" className="wordmark">
            Prashant Chaudhary
          </Link>
          <nav className="primary-nav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={isCurrent(link.href) ? "page" : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <PaletteHint />
            <ThemeToggle />
            <button
              className="nav-toggle"
              data-nav-toggle
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? "CLOSE" : "MENU"}
            </button>
          </div>
        </div>
      </Frame>
      <div className={`mobile-nav${mobileOpen ? " is-open" : ""}`} id="mobile-nav" data-mobile-nav>
        <Frame>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <button className="mobile-nav__palette" data-mobile-palette-open type="button" disabled aria-disabled="true">
            search...
          </button>
        </Frame>
      </div>
    </header>
  );
}
