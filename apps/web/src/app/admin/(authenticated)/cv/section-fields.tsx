"use client";

import { NumberInput, SelectField, TextInput, TextareaField } from "../../_components/field";
import type { CvSectionKind, CvSectionVisibility, UpsertCvSectionBody } from "./types";

const KIND_OPTIONS: { value: CvSectionKind; label: string }[] = [
  { value: "experience", label: "experience" },
  { value: "education", label: "education" },
  { value: "skills", label: "skills" },
  { value: "certifications", label: "certifications" },
  { value: "accomplishments", label: "accomplishments" },
];

const VISIBILITY_OPTIONS: { value: CvSectionVisibility; label: string }[] = [
  { value: "public", label: "public" },
  { value: "gated", label: "gated" },
];

/** Shared field rendering for both an existing section's editor and the "new section" form — same DTO shape either way (§7.2). */
export function CvSectionFields({
  value,
  onChange,
  fieldErrors,
  idPrefix,
}: {
  value: UpsertCvSectionBody;
  onChange: (next: UpsertCvSectionBody) => void;
  fieldErrors: Record<string, string>;
  idPrefix: string;
}) {
  return (
    <>
      <SelectField
        label="Kind"
        name={`${idPrefix}-kind`}
        options={KIND_OPTIONS}
        value={value.kind}
        error={fieldErrors.kind}
        onChange={(e) => onChange({ ...value, kind: e.target.value as CvSectionKind })}
      />
      <TextInput label="Title" name={`${idPrefix}-title`} value={value.title} error={fieldErrors.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
      <TextInput
        label="Subtitle"
        name={`${idPrefix}-subtitle`}
        value={value.subtitle}
        error={fieldErrors.subtitle}
        onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
      />
      <TextInput
        label="Date range"
        name={`${idPrefix}-dateRange`}
        value={value.dateRange ?? ""}
        error={fieldErrors.dateRange}
        onChange={(e) => onChange({ ...value, dateRange: e.target.value.trim() ? e.target.value : null })}
      />
      <TextareaField
        label="Body"
        name={`${idPrefix}-body`}
        rows={3}
        value={value.body ?? ""}
        error={fieldErrors.body}
        onChange={(e) => onChange({ ...value, body: e.target.value.trim() ? e.target.value : null })}
      />
      <SelectField
        label="Visibility"
        name={`${idPrefix}-visibility`}
        options={VISIBILITY_OPTIONS}
        value={value.visibility}
        error={fieldErrors.visibility}
        onChange={(e) => onChange({ ...value, visibility: e.target.value as CvSectionVisibility })}
      />
      <NumberInput
        label="Order"
        name={`${idPrefix}-order`}
        min={0}
        value={value.order}
        error={fieldErrors.order}
        onChange={(e) => onChange({ ...value, order: Number(e.target.value) })}
      />
    </>
  );
}
