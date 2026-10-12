"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, send, splitFieldErrors } from "../../../_lib/api-client";
import { Button } from "../../../_components/button";
import { TextInput, NumberInput, TextareaField, FormBanner } from "../../../_components/field";
import { ConfirmDialog } from "../../../_components/modal";
import { StatusPill, DirtyBadge } from "../../../_components/status-pill";
import { useToast } from "../../../_components/toast";
import type { PostAdminView, UpsertPostBody } from "../types";

const BLANK: UpsertPostBody = { slug: "", title: "", summary: "", body: null, tags: [], readingMinutes: 1 };

interface Meta {
  status: "draft" | "published";
  hasPendingDraft: boolean;
}

export function PostEditorView({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const toast = useToast();

  const [postId, setPostId] = useState<string | null>(isNew ? null : id);
  const [loading, setLoading] = useState(!isNew);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [form, setForm] = useState<UpsertPostBody>(BLANK);
  const [bodyText, setBodyText] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function applyView(view: PostAdminView) {
    setMeta({ status: view.status, hasPendingDraft: view.hasPendingDraft });
    setForm({
      slug: view.slug,
      title: view.title,
      summary: view.summary,
      body: view.body,
      tags: view.tags,
      readingMinutes: view.readingMinutes,
    });
    setBodyText(view.body ?? "");
    setTagsText(view.tags.join(", "));
  }

  useEffect(() => {
    if (isNew) return;
    void send<PostAdminView>("GET", `/posts/${id}`)
      .then((env) => {
        applyView(env.data!);
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
    const payload: UpsertPostBody = {
      ...form,
      body: bodyText.trim() ? bodyText : null,
      tags: tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (postId === null) {
        const res = await send<PostAdminView>("POST", "/posts", payload);
        setPostId(res.data!.id);
        applyView(res.data!);
        router.replace(`/admin/posts/${res.data!.id}`);
      } else {
        const res = await send<PostAdminView>("PUT", `/posts/${postId}`, () => payload);
        applyView(res.data!);
      }
      toast("Saved as draft.", "success");
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

  async function handlePublish() {
    if (!postId) return;
    setPublishing(true);
    setFieldErrors({});
    setBanner(null);
    try {
      const res = await send<PostAdminView>("POST", `/posts/${postId}/publish`);
      applyView(res.data!);
      toast("Published.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setFieldErrors(fields);
        setBanner(b ?? err.message);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    if (!postId) return;
    await send("DELETE", `/posts/${postId}`);
    router.push("/admin/posts");
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <div className="editor-toolbar">
        <div className="editor-toolbar__title">
          <span>{isNew && !postId ? "New post" : form.title || "Untitled"}</span>
          {meta ? <StatusPill status={meta.status} /> : null}
          {meta ? <DirtyBadge hasPendingDraft={meta.hasPendingDraft} /> : null}
        </div>
        <div className="editor-toolbar__actions">
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button variant="primary" onClick={() => void handlePublish()} disabled={!postId || publishing}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={!postId}>
            Delete
          </Button>
        </div>
      </div>

      <FormBanner message={banner} />

      <div className="section-block">
        <TextInput label="Title" name="title" value={form.title} error={fieldErrors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <TextInput label="Slug" name="slug" value={form.slug} error={fieldErrors.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <TextareaField
          label="Summary"
          name="summary"
          rows={2}
          value={form.summary}
          error={fieldErrors.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
        <TextareaField label="Body" name="body" rows={8} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
        <NumberInput
          label="Reading minutes"
          name="readingMinutes"
          min={1}
          value={form.readingMinutes}
          error={fieldErrors.readingMinutes}
          onChange={(e) => setForm({ ...form, readingMinutes: Number(e.target.value) })}
        />
        <TextInput label="Tags (comma-separated)" name="tags" value={tagsText} error={fieldErrors.tags} onChange={(e) => setTagsText(e.target.value)} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        message="There is no unpublish endpoint — deleting is the only way to remove it from public view. This cannot be undone."
        danger
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
