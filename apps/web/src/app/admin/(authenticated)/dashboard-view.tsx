"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { send } from "../_lib/api-client";

interface StatCard {
  label: string;
  href: string;
  count: number | null;
}

interface RawEntity {
  id: string;
  title: string;
  status: string;
  draftData: unknown;
}

interface Revision {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

interface UnpublishedRow {
  label: string;
  href: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function DashboardView() {
  const [stats, setStats] = useState<StatCard[]>([
    { label: "Projects", href: "/admin/projects", count: null },
    { label: "Posts", href: "/admin/posts", count: null },
    { label: "Pages", href: "/admin/pages", count: null },
    { label: "Tags", href: "/admin/tags", count: null },
    { label: "Media", href: "/admin/media", count: null },
    { label: "CV sections", href: "/admin/cv", count: null },
  ]);
  const [unpublished, setUnpublished] = useState<UnpublishedRow[] | null>(null);
  const [recent, setRecent] = useState<Revision[] | null>(null);

  useEffect(() => {
    const endpoints: [string, string][] = [
      ["/projects", "/admin/projects"],
      ["/posts", "/admin/posts"],
      ["/pages", "/admin/pages"],
      ["/tags", "/admin/tags"],
      ["/media", "/admin/media"],
      ["/cv/sections", "/admin/cv"],
    ];

    void Promise.all(
      endpoints.map(([path]) => send<unknown[]>("GET", path).then((env) => env.data?.length ?? 0, () => null)),
    ).then((counts) => {
      setStats((prev) => prev.map((s, i) => ({ ...s, count: counts[i] ?? null })));
    });

    void Promise.all([send<RawEntity[]>("GET", "/projects"), send<RawEntity[]>("GET", "/posts")])
      .then(([projectsEnv, postsEnv]) => {
        const rows: UnpublishedRow[] = [];
        (projectsEnv.data ?? []).forEach((p) => {
          if (p.draftData !== null && p.draftData !== undefined) rows.push({ label: p.title, href: `/admin/projects/${p.id}` });
          if (p.status === "draft") rows.push({ label: `${p.title} (never published)`, href: `/admin/projects/${p.id}` });
        });
        (postsEnv.data ?? []).forEach((p) => {
          if (p.draftData !== null && p.draftData !== undefined) rows.push({ label: p.title, href: `/admin/posts/${p.id}` });
          if (p.status === "draft") rows.push({ label: `${p.title} (never published)`, href: `/admin/posts/${p.id}` });
        });
        setUnpublished(rows);
      })
      .catch(() => setUnpublished([]));

    void send<Revision[]>("GET", "/revisions")
      .then((env) => setRecent((env.data ?? []).slice(0, 8)))
      .catch(() => setRecent([]));
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <h1>Dashboard</h1>
      </div>

      <div className="stat-row">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <Link href={s.href}>
              <div className="stat-card__value">{s.count ?? "–"}</div>
              <div className="stat-card__label">{s.label}</div>
            </Link>
          </div>
        ))}
      </div>

      <div className="section-block">
        <h2>Unpublished changes</h2>
        <ul className="list-simple">
          {unpublished === null ? (
            <li>Loading…</li>
          ) : unpublished.length === 0 ? (
            <li>Nothing staged. Everything published is live.</li>
          ) : (
            unpublished.map((row) => (
              <li key={row.href + row.label}>
                <Link href={row.href}>{row.label}</Link>
                <span>—</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="section-block">
        <h2>Recent activity</h2>
        <p className="admin-page-head__meta" style={{ marginBottom: "var(--space-3)" }}>
          Last 8 of up to 200 recorded revisions across every content type — a global recency feed, not the
          per-entity history panel.
        </p>
        <ul className="list-simple">
          {recent === null ? (
            <li>Loading…</li>
          ) : recent.length === 0 ? (
            <li>No edits yet.</li>
          ) : (
            recent.map((r) => (
              <li key={r.id}>
                <span>
                  {r.entityType} · {r.entityId}
                </span>
                <span>{formatDate(r.createdAt)}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
