"use client";

import { useEffect, useState } from "react";
import { ApiError, send } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { ConfirmDialog } from "../../_components/modal";
import { DataTable, type DataTableColumn } from "../../_components/data-table";
import { useToast } from "../../_components/toast";
import type { CvAccessGrantRow, CvAccessGrantStatus } from "./types";

function StatusBadge({ status }: { status: CvAccessGrantStatus }) {
  return <span className={`status-pill status-pill--${status}`}>{status}</span>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CvRequestsView() {
  const toast = useToast();
  const [rows, setRows] = useState<CvAccessGrantRow[] | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  function refresh() {
    void send<CvAccessGrantRow[]>("GET", "/cv-requests")
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }

  useEffect(refresh, []);

  async function act(id: string, action: "approve" | "revoke", successMessage: string) {
    setActingId(id);
    try {
      const res = await send<CvAccessGrantRow>("POST", `/cv-requests/${id}/${action}`);
      setRows((prev) => (prev ?? []).map((r) => (r.id === id ? res.data! : r)));
      toast(successMessage, "success");
    } catch (err) {
      if (err instanceof ApiError) toast(err.message, "error");
    } finally {
      setActingId(null);
    }
  }

  const columns: DataTableColumn<CvAccessGrantRow>[] = [
    { key: "requestedAt", label: "Requested", render: (r) => formatDate(r.requestedAt), sortValue: (r) => r.requestedAt },
    { key: "email", label: "Email", sortValue: (r) => r.email },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
    { key: "expiresAt", label: "Expires", render: (r) => formatDate(r.expiresAt) },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button small onClick={() => void act(r.id, "approve", "Approved — access link sent.")} disabled={actingId === r.id || r.status !== "pending"}>
            Approve
          </Button>
          <Button small variant="danger" onClick={() => setConfirmRevokeId(r.id)} disabled={actingId === r.id || r.status === "revoked"}>
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="admin-page-head">
        <h1>CV requests</h1>
        <span className="admin-page-head__meta">Gated CV access — approve mints a single-use link, revoke invalidates any state.</span>
      </div>

      {rows === null ? (
        <p>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          filterFn={(r, q) => r.email.toLowerCase().includes(q)}
          filterPlaceholder="Filter by email…"
          emptyMessage="No requests yet."
        />
      )}

      <ConfirmDialog
        open={confirmRevokeId !== null}
        title="Revoke this request?"
        message="Invalidates it regardless of current state — an approved-but-unused link stops working immediately. This cannot be undone."
        danger
        confirmLabel="Revoke"
        onConfirm={() => {
          const id = confirmRevokeId!;
          setConfirmRevokeId(null);
          void act(id, "revoke", "Revoked.");
        }}
        onCancel={() => setConfirmRevokeId(null)}
      />
    </>
  );
}
