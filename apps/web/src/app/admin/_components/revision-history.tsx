"use client";

import { useEffect, useState } from "react";
import { ApiError, send } from "../_lib/api-client";
import { Button } from "./button";
import { useToast } from "./toast";

interface RevisionRow {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * PRD §11 — scoped to one entity, not a global screen. Restore is only
 * ever called for "project" | "post" | "diagram": "caseStudySection"
 * exists in the schema's entityType enum but the real backend never
 * actually writes one — a case-study section edit is folded into its
 * parent project's own revision snapshot (confirmed directly against
 * apps/api/src/modules/revisions/revisions.controller.ts's own comment
 * on this). There is nothing to build a disabled-with-explanation
 * panel for; it would be dead UI for a state that can't occur.
 *
 * `T` is the restored entity's own admin-view shape — the caller
 * already has a function that applies one (same one `load`/publish
 * use), so restore just reuses it.
 */
export function RevisionHistory<T>({
  entityType,
  entityId,
  /** Bump this (e.g. from the same `applyView` the parent already calls after every save/publish) to refetch — entityType/entityId alone don't change on a save, so without this the list goes stale the moment a new revision is written anywhere other than this component's own restore action. */
  refreshToken,
  onRestored,
}: {
  entityType: "project" | "post" | "diagram";
  entityId: string;
  refreshToken?: number;
  onRestored: (view: T) => void;
}) {
  const toast = useToast();
  const [rows, setRows] = useState<RevisionRow[] | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  function refresh() {
    void send<RevisionRow[]>("GET", `/revisions?entityType=${entityType}&entityId=${entityId}`)
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }

  useEffect(refresh, [entityType, entityId, refreshToken]);

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      const res = await send<T>("POST", `/revisions/${id}/restore`);
      onRestored(res.data!);
      // Verbatim server copy (PRD §11) — a restored, published entity's
      // snapshot lands in draftData, never republished directly, so the
      // live site is untouched until an explicit publish.
      toast("Restored to draft — publish to make it live.", "success");
      refresh();
    } catch (err) {
      if (err instanceof ApiError) toast(err.message, "error");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="section-block">
      <h2>Revision history</h2>
      {rows === null ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="admin-page-head__meta">No history yet.</p>
      ) : (
        rows.map((r) => (
          <div className="revision-row" key={r.id}>
            {/* There's exactly one admin, ever (PRD §1.2) — no identity to resolve. */}
            <span className="revision-row__meta">{formatDate(r.createdAt)} · you</span>
            <Button small onClick={() => void handleRestore(r.id)} disabled={restoringId === r.id}>
              {restoringId === r.id ? "Restoring…" : "Restore"}
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
