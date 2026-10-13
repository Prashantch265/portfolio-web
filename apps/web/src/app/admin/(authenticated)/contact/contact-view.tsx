"use client";

import { useEffect, useState } from "react";
import { ApiError, send } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { DataTable, type DataTableColumn } from "../../_components/data-table";
import { useToast } from "../../_components/toast";
import type { ContactMessageRow, ContactMessageStatus } from "./types";

function StatusBadge({ status }: { status: ContactMessageStatus }) {
  return <span className={`status-pill status-pill--${status}`}>{status}</span>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** No delete action — the real API has none (§9 only specifies list/read/archive/mark-spam), so this screen doesn't invent one. */
export function ContactView() {
  const toast = useToast();
  const [rows, setRows] = useState<ContactMessageRow[] | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function refresh() {
    void send<ContactMessageRow[]>("GET", "/contact")
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }

  useEffect(refresh, []);

  async function act(id: string, action: "mark-read" | "archive" | "mark-spam", successMessage: string) {
    setActingId(id);
    try {
      const res = await send<ContactMessageRow>("POST", `/contact/${id}/${action}`);
      setRows((prev) => (prev ?? []).map((r) => (r.id === id ? res.data! : r)));
      toast(successMessage, "success");
    } catch (err) {
      if (err instanceof ApiError) toast(err.message, "error");
    } finally {
      setActingId(null);
    }
  }

  const columns: DataTableColumn<ContactMessageRow>[] = [
    { key: "createdAt", label: "Received", render: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt },
    { key: "name", label: "Name", sortValue: (r) => r.name },
    { key: "email", label: "Email", sortValue: (r) => r.email },
    {
      key: "message",
      label: "Message",
      render: (r) => <span className="admin-page-head__meta">{r.message.length > 80 ? `${r.message.slice(0, 80)}…` : r.message}</span>,
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button small onClick={() => void act(r.id, "mark-read", "Marked as read.")} disabled={actingId === r.id || r.status === "read"}>
            Mark read
          </Button>
          <Button small onClick={() => void act(r.id, "archive", "Archived.")} disabled={actingId === r.id || r.status === "archived"}>
            Archive
          </Button>
          <Button small variant="danger" onClick={() => void act(r.id, "mark-spam", "Marked as spam.")} disabled={actingId === r.id || r.status === "spam"}>
            Spam
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="admin-page-head">
        <h1>Contact</h1>
        <span className="admin-page-head__meta">Inbox — mark read, archive, or mark spam. No draft/publish.</span>
      </div>

      {rows === null ? (
        <p>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          filterFn={(r, q) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.message.toLowerCase().includes(q)}
          filterPlaceholder="Filter by name, email, or message…"
          emptyMessage="No messages yet."
        />
      )}
    </>
  );
}
