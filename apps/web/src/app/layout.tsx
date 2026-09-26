import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const interTight = localFont({
  src: "../../../../packages/ui/src/fonts/inter-tight-variable.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-display",
});

const plexMono = localFont({
  src: [
    { path: "../../../../packages/ui/src/fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../../../packages/ui/src/fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../../../../packages/ui/src/fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Prashant Chaudhary — Backend & AI platform engineer",
  description:
    "Backend and AI platform engineer who designs the systems underneath multi-tenant products — authorization, workflow orchestration, and retrieval.",
};

// Anti-FOUC: resolves theme and writes it to <html data-theme> before
// first paint. The mockup this is ported from applied theme on
// DOMContentLoaded instead — a dark-mode visitor saw a light flash. Same
// resolution order (explicit choice → system → light), just run earlier.
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("schematic-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${plexMono.variable}`}
      // The anti-FOUC script below sets data-theme on this element before
      // React hydrates, on purpose — the server never renders it (there's
      // no way to know the visitor's stored/system preference at request
      // time for a static page). Without this, React's hydration diff
      // flags that as a mismatch even though it's intentional.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
