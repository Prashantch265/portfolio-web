"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { send } from "../../_lib/api-client";
import { DataTable } from "../../_components/data-table";
import { ButtonLink } from "../../_components/button";
import { StatusPill, DirtyBadge } from "../../_components/status-pill";
import { hasPendingDraft, type PostRawRow } from "./types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PostsListView() {
  const router = useRouter();
  const [rows, setRows] = useState<PostRawRow[] | null>(null);

  useEffect(() => {
    void send<PostRawRow[]>("GET", "/posts")
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <h1>Posts</h1>
        <span className="admin-page-head__meta">Reuses projects&rsquo; draft/publish mechanics</span>
        <ButtonLink href="/admin/posts/new" variant="primary">
          + New post
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
            { key: "tags", label: "Tags", render: (r) => r.tags.join(", ") },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <>
                  <StatusPill status={r.status} /> <DirtyBadge hasPendingDraft={hasPendingDraft(r)} />
                </>
              ),
            },
            { key: "updatedAt", label: "Updated", render: (r) => formatDate(r.updatedAt), sortValue: (r) => r.updatedAt },
          ]}
          filterFn={(r, q) => `${r.title} ${r.slug} ${r.tags.join(" ")}`.toLowerCase().includes(q)}
          filterPlaceholder="Filter posts…"
          emptyMessage="No posts match."
          onRowClick={(r) => router.push(`/admin/posts/${r.id}`)}
        />
      )}
    </>
  );
}
