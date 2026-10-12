"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, send, splitFieldErrors } from "../../../_lib/api-client";
import { Button } from "../../../_components/button";
import { TextInput, NumberInput, TextareaField, CheckboxField, FormBanner } from "../../../_components/field";
import { RepeatableList } from "../../../_components/repeatable-list";
import { ConfirmDialog } from "../../../_components/modal";
import { StatusPill, DirtyBadge } from "../../../_components/status-pill";
import { useToast } from "../../../_components/toast";
import type { DiagramRawRow, ProjectAdminView, ProjectDecision, UpsertProjectBody } from "../types";

const BLANK_CORE: UpsertProjectBody = {
  slug: "",
  title: "",
  kicker: "",
  summary: "",
  years: "",
  featured: false,
  stackTags: [],
  order: 0,
};

interface Meta {
  status: "draft" | "published";
  publishedAt: string | null;
  hasPendingDraft: boolean;
}

export function ProjectEditorView({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const toast = useToast();

  const [projectId, setProjectId] = useState<string | null>(isNew ? null : id);
  const [loading, setLoading] = useState(!isNew);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [core, setCore] = useState<UpsertProjectBody>(BLANK_CORE);
  const [stackTagsText, setStackTagsText] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<ProjectDecision[]>([]);
  const [outcome, setOutcome] = useState("");
  const [diagram, setDiagram] = useState<DiagramRawRow | null | undefined>(isNew ? null : undefined);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function applyView(view: ProjectAdminView) {
    setMeta({ status: view.status, publishedAt: view.publishedAt, hasPendingDraft: view.hasPendingDraft });
    setCore({
      slug: view.slug,
      title: view.title,
      kicker: view.kicker,
      summary: view.summary,
      years: view.years,
      featured: view.featured,
      stackTags: view.stackTags,
      order: view.order,
    });
    setStackTagsText(view.stackTags.join(", "));
    setContext(view.sections.context ?? "");
    setConstraints(view.sections.constraints ?? []);
    setDecisions(view.sections.decisions ?? []);
    setOutcome(view.sections.outcome ?? "");
  }

  useEffect(() => {
    if (isNew) return;
    void send<ProjectAdminView>("GET", `/projects/${id}`)
      .then((env) => {
        applyView(env.data!);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err instanceof ApiError) setBanner(err.message);
      });
  }, [id, isNew]);

  useEffect(() => {
    if (!projectId) return;
    void send<DiagramRawRow[]>("GET", "/diagrams")
      .then((env) => setDiagram((env.data ?? []).find((d) => d.ownerId === projectId) ?? null))
      .catch(() => setDiagram(null));
  }, [projectId]);

  async function handleSave() {
    setSaving(true);
    setFieldErrors({});
    setBanner(null);
    const corePayload: UpsertProjectBody = {
      ...core,
      stackTags: stackTagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      let currentId = projectId;
      if (currentId === null) {
        const res = await send<ProjectAdminView>("POST", "/projects", corePayload);
        currentId = res.data!.id;
        setProjectId(currentId);
        applyView(res.data!);
        router.replace(`/admin/projects/${currentId}`);
      } else {
        const res = await send<ProjectAdminView>("PUT", `/projects/${currentId}`, () => corePayload);
        applyView(res.data!);
      }

      // Each case-study section is its own endpoint (PRD §7.1) and each
      // rejects empty content server-side — only write a section once it
      // actually has something, so a brand-new project can be saved with
      // core fields alone.
      if (context.trim()) {
        const res = await send<ProjectAdminView>("PUT", `/projects/${currentId}/sections/context`, () => ({ body: context }));
        applyView(res.data!);
      }
      if (constraints.filter((c) => c.trim()).length > 0) {
        const res = await send<ProjectAdminView>("PUT", `/projects/${currentId}/sections/constraints`, () => ({
          body: constraints.filter((c) => c.trim()),
        }));
        applyView(res.data!);
      }
      if (decisions.length > 0) {
        const res = await send<ProjectAdminView>("PUT", `/projects/${currentId}/sections/decisions`, () => ({ body: decisions }));
        applyView(res.data!);
      }
      if (outcome.trim()) {
        const res = await send<ProjectAdminView>("PUT", `/projects/${currentId}/sections/outcome`, () => ({ body: outcome }));
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
    if (!projectId) return;
    setPublishing(true);
    setFieldErrors({});
    setBanner(null);
    try {
      const res = await send<ProjectAdminView>("POST", `/projects/${projectId}/publish`);
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
    if (!projectId) return;
    await send("DELETE", `/projects/${projectId}`);
    router.push("/admin/projects");
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <div className="editor-toolbar">
        <div className="editor-toolbar__title">
          <span>{isNew && !projectId ? "New project" : core.title || "Untitled"}</span>
          {meta ? <StatusPill status={meta.status} /> : null}
          {meta ? <DirtyBadge hasPendingDraft={meta.hasPendingDraft} /> : null}
        </div>
        <div className="editor-toolbar__actions">
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button variant="primary" onClick={() => void handlePublish()} disabled={!projectId || publishing}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={!projectId}>
            Delete
          </Button>
        </div>
      </div>

      <FormBanner message={banner} />

      <div className="section-block">
        <h2>Core fields</h2>
        <TextInput label="Title" name="title" value={core.title} error={fieldErrors.title} onChange={(e) => setCore({ ...core, title: e.target.value })} />
        <TextInput label="Slug" name="slug" value={core.slug} error={fieldErrors.slug} onChange={(e) => setCore({ ...core, slug: e.target.value })} />
        <TextInput label="Kicker" name="kicker" value={core.kicker} error={fieldErrors.kicker} onChange={(e) => setCore({ ...core, kicker: e.target.value })} />
        <TextareaField
          label="Summary"
          name="summary"
          rows={3}
          value={core.summary}
          error={fieldErrors.summary}
          onChange={(e) => setCore({ ...core, summary: e.target.value })}
        />
        <TextInput label="Years" name="years" value={core.years} error={fieldErrors.years} onChange={(e) => setCore({ ...core, years: e.target.value })} />
        <NumberInput
          label="Order"
          name="order"
          value={core.order}
          error={fieldErrors.order}
          onChange={(e) => setCore({ ...core, order: Number(e.target.value) })}
        />
        <CheckboxField
          label="Featured on homepage"
          name="featured"
          checked={core.featured}
          onChange={(e) => setCore({ ...core, featured: e.target.checked })}
        />
        <TextInput
          label="Stack (comma-separated)"
          name="stackTags"
          value={stackTagsText}
          error={fieldErrors.stackTags}
          onChange={(e) => setStackTagsText(e.target.value)}
        />
      </div>

      <div className="section-block">
        <h2>
          Case-study sections{" "}
          <span className="admin-page-head__meta" style={{ fontWeight: 400 }}>
            — each is its own endpoint; Save writes every one that has content
          </span>
        </h2>

        <h3>Context</h3>
        <TextareaField label="" name="context" rows={4} value={context} onChange={(e) => setContext(e.target.value)} />

        <h3>Constraints</h3>
        <RepeatableList
          value={constraints}
          onChange={setConstraints}
          blank={() => ""}
          addLabel="+ Add constraint"
          renderRow={(value, setItem) => (
            <textarea rows={2} style={{ gridColumn: "1/-1" }} value={value} onChange={(e) => setItem(e.target.value)} />
          )}
        />

        <h3>Decisions</h3>
        <RepeatableList
          value={decisions}
          onChange={setDecisions}
          blank={() => ({ heading: "", body: "", emphasis: false })}
          addLabel="+ Add decision"
          renderRow={(item, setItem) => (
            <>
              <input
                type="text"
                placeholder="Heading"
                style={{ gridColumn: "1/-1" }}
                value={item.heading}
                onChange={(e) => setItem({ ...item, heading: e.target.value })}
              />
              <textarea
                rows={2}
                placeholder="Body"
                style={{ gridColumn: "1/-1" }}
                value={item.body}
                onChange={(e) => setItem({ ...item, body: e.target.value })}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                <input
                  type="checkbox"
                  checked={item.emphasis}
                  onChange={(e) => setItem({ ...item, emphasis: e.target.checked })}
                />{" "}
                Emphasis (callout treatment)
              </label>
            </>
          )}
        />

        <h3>Outcome</h3>
        <TextareaField label="" name="outcome" rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      </div>

      <div className="section-block">
        <h2>Diagram</h2>
        {diagram === undefined ? (
          <p>Loading…</p>
        ) : diagram === null ? (
          <p className="admin-page-head__meta">No diagram for this project yet. The diagram editor ships in slice A4.</p>
        ) : (
          <p className="admin-page-head__meta">
            Has a diagram ({diagram.publishedVersion !== null ? "published" : "draft only"}
            {diagram.draftData !== null && diagram.draftData !== undefined ? ", unpublished changes" : ""}) — editable once
            slice A4 ships.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        message="There is no unpublish endpoint — deleting is the only way to remove this from public view. This cannot be undone."
        danger
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
