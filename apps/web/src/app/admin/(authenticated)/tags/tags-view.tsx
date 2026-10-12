"use client";

import { useEffect, useState } from "react";
import { ApiError, send } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { FormBanner } from "../../_components/field";
import { useToast } from "../../_components/toast";
import { TagRowEditor } from "./tag-row";
import type { TagKind, TagRow } from "./types";

export function TagsView() {
  const toast = useToast();
  const [rows, setRows] = useState<TagRow[] | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<TagKind>("project");
  const [banner, setBanner] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void send<TagRow[]>("GET", "/tags")
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    setBanner(null);
    try {
      const res = await send<TagRow>("POST", "/tags", { label: label.trim(), kind });
      setRows((prev) => [...(prev ?? []), res.data!].sort((a, b) => a.label.localeCompare(b.label)));
      setLabel("");
      toast("Tag added.", "success");
    } catch (err) {
      if (err instanceof ApiError) setBanner(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <h1>Tags</h1>
        <span className="admin-page-head__meta">Flat CRUD — no draft/publish</span>
      </div>

      <FormBanner message={banner} />

      <form onSubmit={(e) => void handleAdd(e)} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", marginBottom: "var(--space-4)" }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="new-tag-label">New tag label</label>
          <input id="new-tag-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="field" style={{ width: 180, marginBottom: 0 }}>
          <label htmlFor="new-tag-kind">Kind</label>
          <select id="new-tag-kind" value={kind} onChange={(e) => setKind(e.target.value as TagKind)}>
            <option value="project">project</option>
            <option value="post">post</option>
          </select>
        </div>
        <Button type="submit" variant="primary" disabled={adding}>
          Add tag
        </Button>
      </form>

      {rows === null ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p>No tags yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Kind</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TagRowEditor
                key={row.id}
                row={row}
                onSaved={(next) => setRows((prev) => (prev ?? []).map((r) => (r.id === next.id ? next : r)))}
                onDeleted={(id) => setRows((prev) => (prev ?? []).filter((r) => r.id !== id))}
              />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
