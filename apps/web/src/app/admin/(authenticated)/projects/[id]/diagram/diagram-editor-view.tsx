"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTextEquivalent } from "@portfolio/types";
import { DiagramFrame } from "@portfolio/diagram";
import { ApiError, send, splitFieldErrors } from "../../../../_lib/api-client";
import { Button, ButtonLink } from "../../../../_components/button";
import { FormBanner } from "../../../../_components/field";
import { RepeatableList } from "../../../../_components/repeatable-list";
import { RevisionHistory } from "../../../../_components/revision-history";
import { StatusPill, DirtyBadge } from "../../../../_components/status-pill";
import { useToast } from "../../../../_components/toast";
import type { DiagramAdminView, DiagramDoc, DiagramEdge, DiagramGroup, DiagramNode, DiagramRawRow } from "./types";
import { toDiagramDoc } from "./types";

const NODE_TYPES: DiagramNode["type"][] = ["client", "service", "datastore", "queue", "external"];
const EDGE_TYPES: DiagramEdge["type"][] = ["sync", "async", "data-read", "data-write", "auth"];

/** `DiagramGroup.nodeIds` is a real string[] on save, but editing it field-by-field as a comma-separated string is much less fiddly than a nested RepeatableList-of-ids. */
interface GroupRow {
  id: string;
  label: string;
  nodeIdsText: string;
}

function emptyNode(): DiagramNode {
  return { id: "", label: "", type: "service", col: 0, row: 0, annotation: { role: "", reasoning: null, alternative: null } };
}
function emptyEdge(): DiagramEdge {
  return { id: "", from: "", to: "", type: "sync", label: undefined };
}
function emptyGroupRow(): GroupRow {
  return { id: "", label: "", nodeIdsText: "" };
}

function toGroupRows(groups: DiagramGroup[]): GroupRow[] {
  return groups.map((g) => ({ id: g.id, label: g.label, nodeIdsText: g.nodeIds.join(", ") }));
}
function fromGroupRows(rows: GroupRow[]): DiagramGroup[] {
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    nodeIds: r.nodeIdsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  }));
}

export function DiagramEditorView({ projectId }: { projectId: string }) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ version: number; publishedVersion: number | null; hasPendingDraft: boolean } | null>(null);

  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [edges, setEdges] = useState<DiagramEdge[]>([]);
  const [groupRows, setGroupRows] = useState<GroupRow[]>([]);

  const [banner, setBanner] = useState<string | null>(null);
  const [nodesFieldError, setNodesFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);

  function applyView(view: DiagramAdminView) {
    setRevisionRefreshKey((k) => k + 1);
    setDiagramId(view.id);
    setMeta({ version: view.version, publishedVersion: view.publishedVersion, hasPendingDraft: view.hasPendingDraft });
    setNodes(view.nodes);
    setEdges(view.edges);
    setGroupRows(toGroupRows(view.groups ?? []));
  }

  useEffect(() => {
    // GET /diagrams has no ownerId filter (confirmed against the real
    // controller — the mockup invented one) and returns raw rows, not
    // the computed admin view — so this is a two-step lookup: find the
    // owning diagram's id in the raw list, then fetch its real,
    // draft-merged admin view by id.
    void send<DiagramRawRow[]>("GET", "/diagrams")
      .then((env) => {
        const row = (env.data ?? []).find((d) => d.ownerId === projectId);
        if (!row) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return send<DiagramAdminView>("GET", `/diagrams/${row.id}`);
      })
      .then((env) => {
        if (!env) return;
        applyView(env.data!);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err instanceof ApiError) setBanner(err.message);
      });
  }, [projectId]);

  // Client-side mirror of the real backend's own two validation rules
  // (apps/api's diagram write path implements only these two) — lets the
  // preview freeze on the last valid frame instead of rendering broken
  // references, and gives inline row errors before a round trip.
  const edgeErrors = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id).filter(Boolean));
    const out: Record<number, string[]> = {};
    edges.forEach((e, i) => {
      const msgs: string[] = [];
      if (e.from && !ids.has(e.from)) msgs.push(`Edge references a nonexistent node id "${e.from}".`);
      if (e.to && !ids.has(e.to)) msgs.push(`Edge references a nonexistent node id "${e.to}".`);
      if (msgs.length) out[i] = msgs;
    });
    return out;
  }, [nodes, edges]);

  const isValid = Object.keys(edgeErrors).length === 0;

  const [lastValidDoc, setLastValidDoc] = useState<DiagramDoc | null>(null);
  useEffect(() => {
    if (!isValid || !diagramId) return;
    setLastValidDoc(toDiagramDoc({ id: diagramId, nodes, edges, groups: fromGroupRows(groupRows) }));
  }, [isValid, diagramId, nodes, edges, groupRows]);

  const textEquivalent = useMemo(() => (lastValidDoc ? buildTextEquivalent(lastValidDoc) : null), [lastValidDoc]);

  async function handleSave() {
    if (!diagramId) return;
    setSaving(true);
    setBanner(null);
    setNodesFieldError(null);
    const payload = { nodes, edges, groups: fromGroupRows(groupRows) };
    try {
      const res = await send<DiagramAdminView>("PUT", `/diagrams/${diagramId}`, () => payload);
      applyView(res.data!);
      toast("Saved as draft.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setNodesFieldError(fields.nodes ?? null);
        setBanner(b ?? err.message);
      }
      toast("Save failed — see the error above.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!diagramId) return;
    setPublishing(true);
    setBanner(null);
    try {
      const res = await send<DiagramAdminView>("POST", `/diagrams/${diagramId}/publish`);
      applyView(res.data!);
      toast("Published.", "success");
    } catch (err) {
      if (err instanceof ApiError) setBanner(err.message);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (notFound) {
    return (
      <>
        <FormBanner message="No diagram exists for this project yet." />
        <ButtonLink href={`/admin/projects/${projectId}`}>← Back to project</ButtonLink>
      </>
    );
  }

  return (
    <>
      <div className="editor-toolbar">
        <div className="editor-toolbar__title">
          <span>Diagram — {projectId}</span>
          {meta ? <StatusPill status={meta.publishedVersion !== null ? "published" : "draft"} /> : null}
          {meta ? <DirtyBadge hasPendingDraft={meta.hasPendingDraft} /> : null}
        </div>
        <div className="editor-toolbar__actions">
          <ButtonLink href={`/admin/projects/${projectId}`}>← Back to project</ButtonLink>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button variant="primary" onClick={() => void handlePublish()} disabled={publishing}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      <FormBanner message={banner} />

      <div className="split-pane">
        <div className="split-pane__editor">
          <h3>Nodes</h3>
          {nodesFieldError ? <div className="field__error">{nodesFieldError}</div> : null}
          <RepeatableList
            value={nodes}
            onChange={setNodes}
            blank={emptyNode}
            addLabel="+ Add node"
            renderRow={(n, setItem) => (
              <>
                <input type="text" placeholder="id" value={n.id} onChange={(e) => setItem({ ...n, id: e.target.value })} />
                <input type="text" placeholder="Label" value={n.label} onChange={(e) => setItem({ ...n, label: e.target.value })} />
                <select value={n.type} onChange={(e) => setItem({ ...n, type: e.target.value as DiagramNode["type"] })}>
                  {NODE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="col"
                  value={n.col}
                  onChange={(e) => setItem({ ...n, col: Number(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  placeholder="row"
                  value={n.row}
                  onChange={(e) => setItem({ ...n, row: Number(e.target.value) || 0 })}
                />
                <textarea
                  rows={1}
                  placeholder="Role"
                  style={{ gridColumn: "1/-1" }}
                  value={n.annotation.role}
                  onChange={(e) => setItem({ ...n, annotation: { ...n.annotation, role: e.target.value } })}
                />
                <textarea
                  rows={1}
                  placeholder="Reasoning (optional)"
                  style={{ gridColumn: "1/-1" }}
                  value={n.annotation.reasoning ?? ""}
                  onChange={(e) => setItem({ ...n, annotation: { ...n.annotation, reasoning: e.target.value || null } })}
                />
                <textarea
                  rows={1}
                  placeholder="Alternative considered (optional)"
                  style={{ gridColumn: "1/-1" }}
                  value={n.annotation.alternative ?? ""}
                  onChange={(e) => setItem({ ...n, annotation: { ...n.annotation, alternative: e.target.value || null } })}
                />
              </>
            )}
          />

          <h3 style={{ marginTop: "var(--space-4)" }}>Edges</h3>
          <RepeatableList
            value={edges}
            onChange={setEdges}
            blank={emptyEdge}
            addLabel="+ Add edge"
            errorsByIndex={edgeErrors}
            renderRow={(e, setItem) => (
              <>
                <input type="text" placeholder="id" value={e.id} onChange={(ev) => setItem({ ...e, id: ev.target.value })} />
                <input
                  type="text"
                  placeholder="from (node id)"
                  value={e.from}
                  onChange={(ev) => setItem({ ...e, from: ev.target.value })}
                />
                <input type="text" placeholder="to (node id)" value={e.to} onChange={(ev) => setItem({ ...e, to: ev.target.value })} />
                <select value={e.type} onChange={(ev) => setItem({ ...e, type: ev.target.value as DiagramEdge["type"] })}>
                  {EDGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={e.label ?? ""}
                  onChange={(ev) => setItem({ ...e, label: ev.target.value || undefined })}
                />
              </>
            )}
          />

          <h3 style={{ marginTop: "var(--space-4)" }}>
            Groups <span className="admin-page-head__meta" style={{ fontWeight: 400 }}>— optional, rarely used</span>
          </h3>
          <RepeatableList
            value={groupRows}
            onChange={setGroupRows}
            blank={emptyGroupRow}
            addLabel="+ Add group"
            renderRow={(g, setItem) => (
              <>
                <input type="text" placeholder="id" value={g.id} onChange={(e) => setItem({ ...g, id: e.target.value })} />
                <input type="text" placeholder="Label" value={g.label} onChange={(e) => setItem({ ...g, label: e.target.value })} />
                <input
                  type="text"
                  placeholder="node ids, comma-separated"
                  value={g.nodeIdsText}
                  onChange={(e) => setItem({ ...g, nodeIdsText: e.target.value })}
                />
              </>
            )}
          />
        </div>

        <div className="split-pane__preview">
          <div className="split-pane__preview-head">
            <strong>Live preview</strong>
            <span className="admin-page-head__meta">Real renderer — same component the public site uses</span>
          </div>
          {!isValid ? <div className="form-banner">Diagram has validation errors — the preview below shows the last valid version.</div> : null}
          {lastValidDoc ? <DiagramFrame diagram={lastValidDoc} caption="Live preview" /> : <p>Add at least one node to see a preview.</p>}

          <h3 style={{ marginTop: "var(--space-4)" }}>
            Text equivalent <span className="admin-page-head__meta" style={{ fontWeight: 400 }}>— read-only, server-computed</span>
          </h3>
          {textEquivalent ? (
            <>
              <ol>
                {textEquivalent.nodeLines.map((n, i) => (
                  <li key={i}>
                    <strong>{n.label}</strong> — {n.text}
                  </li>
                ))}
              </ol>
              <p className="label" style={{ margin: "8px 0" }}>
                Connections
              </p>
              <ol>
                {textEquivalent.edgeLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </div>

      {diagramId ? (
        <RevisionHistory entityType="diagram" entityId={diagramId} refreshToken={revisionRefreshKey} onRestored={applyView} />
      ) : null}
    </>
  );
}
