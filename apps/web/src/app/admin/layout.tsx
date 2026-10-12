import type { Metadata } from "next";
import "./admin.css";
import { ToastProvider } from "./_components/toast";

// PRD-frontend-admin.md §13: noindex on every /admin/* route, not just
// relying on the auth gate to keep it out of search results. The title
// template lets each page set just its own short title ("Dashboard",
// "Projects", ...) and get "{title} — Admin" for free, matching the
// mockup's own document.title convention.
export const metadata: Metadata = {
  title: { template: "%s — Admin", default: "Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
