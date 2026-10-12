"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { send } from "../../_lib/api-client";
import { DataTable } from "../../_components/data-table";
import { ButtonLink } from "../../_components/button";
import type { PageRow } from "./types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PagesListView() {
  const router = useRouter();
  const [rows, setRows] = useState<PageRow[] | null>(null);

  useEffect(() => {
    void send<PageRow[]>("GET", "/pages")
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <h1>Pages</h1>
        <span className="admin-page-head__meta">No draft/publish — every save is immediately live</span>
        <ButtonLink href="/admin/pages/new" variant="primary">
          + New page
        </ButtonLink>
      </div>

      {rows === null ? (
        <p>Loading…</p>
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "slug", label: "Slug", sortValue: (r) => r.slug.toLowerCase() },
            { key: "title", label: "Title", sortValue: (r) => r.title.toLowerCase() },
            { key: "updatedAt", label: "Updated", render: (r) => formatDate(r.updatedAt), sortValue: (r) => r.updatedAt },
          ]}
          filterFn={(r, q) => `${r.title} ${r.slug}`.toLowerCase().includes(q)}
          filterPlaceholder="Filter pages…"
          emptyMessage="No pages match."
          onRowClick={(r) => router.push(`/admin/pages/${r.id}`)}
        />
      )}
    </>
  );
}
