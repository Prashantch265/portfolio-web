"use client";

import { useState } from "react";
import { ApiError, send, splitFieldErrors } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { ConfirmDialog } from "../../_components/modal";
import { useToast } from "../../_components/toast";
import { CvSectionFields } from "./section-fields";
import type { CvSectionRow, UpsertCvSectionBody } from "./types";

function toBody(row: CvSectionRow): UpsertCvSectionBody {
  const { id: _id, ...rest } = row;
  return rest;
}

export function SectionCard({ row, onSaved, onDeleted }: { row: CvSectionRow; onSaved: (next: CvSectionRow) => void; onDeleted: (id: string) => void }) {
  const toast = useToast();
  const [value, setValue] = useState<UpsertCvSectionBody>(toBody(row));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = JSON.stringify(value) !== JSON.stringify(toBody(row));

  async function save() {
    setSaving(true);
    setFieldErrors({});
    setBanner(null);
    try {
      const res = await send<CvSectionRow>("PUT", `/cv/sections/${row.id}`, value);
      onSaved(res.data!);
      toast("Section saved.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setFieldErrors(fields);
        setBanner(b ?? err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    setConfirmDelete(false);
    await send("DELETE", `/cv/sections/${row.id}`);
    onDeleted(row.id);
  }

  return (
    <div className="section-block">
      {banner ? <div className="form-banner" role="alert">{banner}</div> : null}
      <CvSectionFields value={value} onChange={setValue} fieldErrors={fieldErrors} idPrefix={`section-${row.id}`} />
      <div style={{ display: "flex", gap: 6 }}>
        <Button small onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button small variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this section?"
        message="This cannot be undone."
        danger
        confirmLabel="Delete"
        onConfirm={() => void del()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
