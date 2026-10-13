"use client";

import { useState } from "react";
import { ApiError, send, splitFieldErrors } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { CvSectionFields } from "./section-fields";
import { useToast } from "../../_components/toast";
import type { CvSectionRow, UpsertCvSectionBody } from "./types";

function blank(order: number): UpsertCvSectionBody {
  return { kind: "experience", title: "", subtitle: "", dateRange: null, body: null, visibility: "public", order };
}

export function NewSectionForm({ nextOrder, onCreated }: { nextOrder: number; onCreated: (row: CvSectionRow) => void }) {
  const toast = useToast();
  const [value, setValue] = useState<UpsertCvSectionBody>(blank(nextOrder));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    setFieldErrors({});
    setBanner(null);
    try {
      const res = await send<CvSectionRow>("POST", "/cv/sections", value);
      onCreated(res.data!);
      setValue(blank(nextOrder + 1));
      toast("Section added.", "success");
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

  return (
    <div className="section-block">
      <h3>Add section</h3>
      {banner ? <div className="form-banner" role="alert">{banner}</div> : null}
      <CvSectionFields value={value} onChange={setValue} fieldErrors={fieldErrors} idPrefix="new-section" />
      <Button variant="primary" onClick={() => void create()} disabled={saving}>
        {saving ? "Adding…" : "Add section"}
      </Button>
    </div>
  );
}
