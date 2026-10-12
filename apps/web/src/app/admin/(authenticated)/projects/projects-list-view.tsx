"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { send } from "../../_lib/api-client";
import { DataTable } from "../../_components/data-table";
import { ButtonLink } from "../../_components/button";
import { StatusPill, DirtyBadge } from "../../_components/status-pill";
import { hasPendingDraft, type ProjectRawRow } from "./types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectsListView() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRawRow[] | null>(null);

  useEffect(() => {
    void send<ProjectRawRow[]>("GET", "/projects")
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <h1>Projects</h1>
        <span className="admin-page-head__meta">Case studies — the largest content type</span>
        <ButtonLink href="/admin/projects/new" variant="primary">
          + New project
        </ButtonLink>
      </div>

      {rows === null ? (
        <p>Loading…</p>
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "title", label: "Title", sortValue: (r) => r.title.toLowerCase() },
            { key: "slug", label: "Slug", sortValue: (r) => r.slug.toLowerCase() },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <>
                  <StatusPill status={r.status} /> <DirtyBadge hasPendingDraft={hasPendingDraft(r)} />
                </>
              ),
            },
            { key: "featured", label: "Featured", render: (r) => (r.featured ? "Yes" : "—") },
            { key: "order", label: "Order", sortValue: (r) => r.order },
            { key: "updatedAt", label: "Updated", render: (r) => formatDate(r.updatedAt), sortValue: (r) => r.updatedAt },
          ]}
          filterFn={(r, q) => `${r.title} ${r.slug}`.toLowerCase().includes(q)}
          filterPlaceholder="Filter projects…"
          emptyMessage="No projects match."
          onRowClick={(r) => router.push(`/admin/projects/${r.id}`)}
        />
      )}
    </>
  );
}
