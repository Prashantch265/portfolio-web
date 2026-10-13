"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@portfolio/ui";
import { send } from "../_lib/api-client";
import { Button } from "./button";

interface NavItem {
  label: string;
  href: string;
  countKey?: keyof typeof COUNT_ENDPOINTS;
}

const COUNT_ENDPOINTS = {
  projects: "/projects",
  posts: "/posts",
  pages: "/pages",
  tags: "/tags",
  media: "/media",
  contact: "/contact",
} as const;

// Order and labels match the mockup's sidebar exactly (app.js's NAV
// array) minus "Design notes" (mockup-only, not a real screen), with
// Contact and Analytics added after Media — both are M3 additions the
// mockup never had at all. CV and Analytics have no count badge: CV
// matches the mockup's own inconsistency, and /admin/analytics/summary
// returns one object, not a bare array, so it can't reuse
// useSidebarCounts's array-length mechanism the way every other badge
// does.
const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Projects", href: "/admin/projects", countKey: "projects" },
  { label: "Posts", href: "/admin/posts", countKey: "posts" },
  { label: "Pages", href: "/admin/pages", countKey: "pages" },
  { label: "Tags", href: "/admin/tags", countKey: "tags" },
  { label: "Media", href: "/admin/media", countKey: "media" },
  { label: "Contact", href: "/admin/contact", countKey: "contact" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "CV", href: "/admin/cv" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useSidebarCounts() {
  const [counts, setCounts] = useState<Partial<Record<keyof typeof COUNT_ENDPOINTS, number>>>({});

  useEffect(() => {
    (Object.keys(COUNT_ENDPOINTS) as (keyof typeof COUNT_ENDPOINTS)[]).forEach((key) => {
      send<unknown[]>("GET", COUNT_ENDPOINTS[key])
        .then((env) => setCounts((prev) => ({ ...prev, [key]: env.data?.length ?? 0 })))
        .catch(() => {
          /* badge stays unset — rendered as "–" */
        });
    });
  }, []);

  return counts;
}

export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const counts = useSidebarCounts();
  const activeItem = [...NAV].reverse().find((item) => isActive(pathname, item.href));

  async function logout() {
    await send("POST", "/auth/logout");
    router.push("/admin/login");
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div className="admin-topbar__title">{activeItem?.label ?? "Admin"}</div>
        <div className="admin-topbar__actions">
          <span className="admin-topbar__title">{email}</span>
          <ThemeToggle />
          <Button small onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </div>
      <aside className="admin-sidebar">
        <Link className="admin-sidebar__wordmark" href="/admin">
          PRASHANT CHAUDHARY — Admin
        </Link>
        <nav>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
              <span>{item.label}</span>
              {item.countKey ? (
                <span className="admin-sidebar__count">{counts[item.countKey] ?? "–"}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
