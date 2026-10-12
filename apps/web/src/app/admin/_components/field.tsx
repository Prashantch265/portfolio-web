"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Field/Label/FieldError + the controlled input variants — PRD
 * §6's primitive inventory. `error`, when set, applies `.field--error`
 * and renders the message; this is the generic §10 field-error contract
 * (apply the message returned by `splitFieldErrors().fields[name]`).
 *
 * `id` defaults to a slug of `name` (same derivation the mockup's own
 * `fieldHtml` used) rather than requiring every call site to invent and
 * remember one — a missed `id` silently breaks the label/input
 * association for screen readers and click-to-focus, which is exactly
 * the kind of bug that's invisible unless you go looking for it.
 */
function slugId(name: string | undefined, explicit: string | undefined): string | undefined {
  if (explicit) return explicit;
  if (!name) return undefined;
  return `f-${name.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

function FieldWrap({ error, checkbox, children }: { error?: string; checkbox?: boolean; children: ReactNode }) {
  const className = ["field", checkbox && "field--checkbox", error && "field--error"].filter(Boolean).join(" ");
  return <div className={className}>{children}</div>;
}

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <div className="field__error">{error}</div>;
}

type TextInputProps = { label: string; error?: string; name: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

export function TextInput({ label, error, id, name, ...props }: TextInputProps) {
  const inputId = slugId(name, id);
  return (
    <FieldWrap error={error}>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} name={name} {...props} />
      <ErrorText error={error} />
    </FieldWrap>
  );
}

export function NumberInput({ label, error, id, name, ...props }: TextInputProps) {
  const inputId = slugId(name, id);
  return (
    <FieldWrap error={error}>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} name={name} type="number" {...props} />
      <ErrorText error={error} />
    </FieldWrap>
  );
}

type TextareaProps = { label: string; error?: string; name: string } & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name"
>;

export function TextareaField({ label, error, id, name, ...props }: TextareaProps) {
  const inputId = slugId(name, id);
  return (
    <FieldWrap error={error}>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <textarea id={inputId} name={name} {...props} />
      <ErrorText error={error} />
    </FieldWrap>
  );
}

type SelectProps = {
  label: string;
  error?: string;
  name: string;
  options: { value: string; label: string }[];
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name">;

export function SelectField({ label, error, id, name, options, ...props }: SelectProps) {
  const inputId = slugId(name, id);
  return (
    <FieldWrap error={error}>
      <label htmlFor={inputId}>{label}</label>
      <select id={inputId} name={name} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorText error={error} />
    </FieldWrap>
  );
}

type CheckboxProps = { label: string; error?: string; name: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

export function CheckboxField({ label, error, id, name, ...props }: CheckboxProps) {
  const inputId = slugId(name, id);
  return (
    <FieldWrap error={error} checkbox>
      <input id={inputId} name={name} type="checkbox" {...props} />
      <label htmlFor={inputId}>{label}</label>
    </FieldWrap>
  );
}

/** A whole-form error with no specific field (§10's `_root`, or any 400/404/409/429 whose `source` is null). */
export function FormBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="form-banner" role="alert">
      {message}
    </div>
  );
}

/** A persistent, always-visible notice (e.g. page-edit's "this goes live immediately") — not an error. */
export function FormNotice({ children }: { children: ReactNode }) {
  return <div className="form-notice">{children}</div>;
}
