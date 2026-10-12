"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, send, splitFieldErrors } from "../../../_lib/api-client";
import { Button } from "../../../_components/button";
import { TextInput, TextareaField, FormBanner, FormNotice } from "../../../_components/field";
import { ConfirmDialog } from "../../../_components/modal";
import { useToast } from "../../../_components/toast";
import type { PageRow, UpsertPageBody } from "../types";

const BLANK: UpsertPageBody = { slug: "", title: "", body: "" };

export function PageEditorView({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const toast = useToast();

  // No GET /api/admin/pages/:id exists (PRD §2's divergence #2) — the
  // editor finds its row from the one list endpoint that does exist,
  // same client-side-filter approach the content volume already makes
  // acceptable everywhere else in this admin (PRD §7).
  const [pageId, setPageId] = useState<string | null>(isNew ? null : id);
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<UpsertPageBody>(BLANK);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    void send<PageRow[]>("GET", "/pages")
      .then((env) => {
        const row = (env.data ?? []).find((p) => p.id === id);
        if (!row) {
          setNotFound(true);
        } else {
          setForm({ slug: row.slug, title: row.title, body: row.body });
        }
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err instanceof ApiError) setBanner(err.message);
      });
  }, [id, isNew]);

  async function handleSave() {
    setSaving(true);
    setFieldErrors({});
    setBanner(null);
    try {
      if (pageId === null) {
        const res = await send<PageRow>("POST", "/pages", form);
        setPageId(res.data!.id);
        router.replace(`/admin/pages/${res.data!.id}`);
        toast("Created — this is already live.", "success");
      } else {
        await send<PageRow>("PUT", `/pages/${pageId}`, () => form);
        toast("Saved — this is already live.", "success");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setFieldErrors(fields);
        setBanner(b ?? err.message);
      }
      toast("Save failed — see the error above.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    if (!pageId) return;
    await send("DELETE", `/pages/${pageId}`);
    router.push("/admin/pages");
  }

  if (loading) return <p>Loading…</p>;
  if (notFound) return <FormBanner message="Page not found." />;

  return (
    <>
      <div className="editor-toolbar">
        <div className="editor-toolbar__title">
          <span>{isNew && !pageId ? "New page" : form.title || "Untitled"}</span>
        </div>
        <div className="editor-toolbar__actions">
          <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save (live immediately)"}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={!pageId}>
            Delete
          </Button>
        </div>
      </div>

      <FormNotice>
        Changes here go live immediately. There is no draft state and no undo for a page — unlike projects and posts,
        this content type never got the draft/publish mechanism.
      </FormNotice>

      <FormBanner message={banner} />

      <div className="section-block">
        <TextInput label="Slug" name="slug" value={form.slug} error={fieldErrors.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <TextInput label="Title" name="title" value={form.title} error={fieldErrors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <TextareaField label="Body" name="body" rows={6} value={form.body} error={fieldErrors.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this page?"
        message="Live immediately, no undo."
        danger
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
