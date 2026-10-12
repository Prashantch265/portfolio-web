"use client";

import { useState } from "react";
import { ApiError, send } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { ConfirmDialog } from "../../_components/modal";
import { useToast } from "../../_components/toast";
import type { TagKind, TagRow } from "./types";

const KIND_OPTIONS: { value: TagKind; label: string }[] = [
  { value: "project", label: "project" },
  { value: "post", label: "post" },
];

/** One tag's own edit state — rename ships in A3 (real `PUT /api/admin/tags/:id` the mockup never exposed), delete gets the confirm dialog every other delete in this admin has (the mockup's own tag delete skipped it). */
export function TagRowEditor({ row, onSaved, onDeleted }: { row: TagRow; onSaved: (next: TagRow) => void; onDeleted: (id: string) => void }) {
  const toast = useToast();
  const [label, setLabel] = useState(row.label);
  const [kind, setKind] = useState<TagKind>(row.kind);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = label !== row.label || kind !== row.kind;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await send<TagRow>("PUT", `/tags/${row.id}`, { label, kind });
      onSaved(res.data!);
      toast("Saved.", "success");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    setConfirmDelete(false);
    await send("DELETE", `/tags/${row.id}`);
    onDeleted(row.id);
  }

  return (
    <tr>
      <td>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} aria-label={`Label for ${row.label}`} />
        {error ? <div className="field__error">{error}</div> : null}
      </td>
      <td>
        <select value={kind} onChange={(e) => setKind(e.target.value as TagKind)} aria-label={`Kind for ${row.label}`}>
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td style={{ display: "flex", gap: 6 }}>
        <Button small onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button small variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </td>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this tag?"
        message="No content currently tagged with it will be affected, but the tag itself cannot be recovered."
        danger
        confirmLabel="Delete"
        onConfirm={() => void del()}
        onCancel={() => setConfirmDelete(false)}
      />
    </tr>
  );
}
