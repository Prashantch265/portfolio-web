"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, send } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { ConfirmDialog } from "../../_components/modal";
import { useToast } from "../../_components/toast";
import type { MediaAssetRow } from "./types";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = ".png,.jpg,.jpeg,.webp,.svg";
// Smallest-first — a grid thumbnail never needs the 1600w derivative.
const THUMB_VARIANTS = ["400w", "800w", "1600w"];

function mediaUrl(id: string, variant?: string): string {
  return variant ? `/api/media/${id}/${variant}` : `/api/media/${id}`;
}

function bestThumbVariant(row: MediaAssetRow): string | undefined {
  return THUMB_VARIANTS.find((v) => row.derivatives[v]);
}

export function MediaView() {
  const toast = useToast();
  const [rows, setRows] = useState<MediaAssetRow[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    void send<MediaAssetRow[]>("GET", "/media")
      .then((env) => setRows(env.data ?? []))
      .catch(() => setRows([]));
  }

  useEffect(refresh, []);

  async function handleFile(file: File) {
    // A client-side size pre-check for instant feedback — the server
    // enforces this definitively regardless (PRD §12), this just saves
    // the round trip for the obvious case.
    if (file.size > MAX_BYTES) {
      toast("File exceeds the 8 MiB limit.", "error");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await send("POST", "/media", formData);
      toast("Uploaded.", "success");
      refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.source?.file?.join(" ") ?? err.message, "error");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    await send("DELETE", `/media/${id}`);
    refresh();
  }

  async function copyUrl(id: string) {
    const url = `${window.location.origin}${mediaUrl(id)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(`Copied: ${url}`, "success");
    } catch {
      toast("Could not copy — your browser blocked clipboard access.", "error");
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <h1>Media</h1>
        <span className="admin-page-head__meta">Upload / browse / copy URL / delete only — no consumers yet</span>
      </div>

      <div
        className={`dropzone${dragOver ? " is-dragover" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Upload a file"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        <p>
          <strong>{uploading ? "Uploading…" : "Drop a file here"}</strong>
          {uploading ? "" : ", or click to browse."}
        </p>
        <p className="admin-page-head__meta" style={{ marginTop: 4 }}>
          PNG, JPEG, WebP, or SVG. 8 MiB max. Type is verified from the file&rsquo;s actual bytes.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {rows === null ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p>Nothing uploaded yet.</p>
      ) : (
        <div className="media-grid">
          {rows.map((row) => {
            const variant = bestThumbVariant(row);
            const isSvg = row.mimeType === "image/svg+xml";
            return (
              <div className="media-card" key={row.id}>
                <div className="media-card__thumb">
                  {isSvg || variant ? (
                    <img src={mediaUrl(row.id, isSvg ? undefined : variant)} alt="" />
                  ) : (
                    <span className="admin-page-head__meta">{row.mimeType}</span>
                  )}
                </div>
                <div className="media-card__meta">
                  <div className="media-card__filename">{row.filename}</div>
                  <div>
                    {Math.round(row.sizeBytes / 1024)} KB
                    {row.width && row.height ? ` · ${row.width}×${row.height}` : ""}
                  </div>
                </div>
                <div className="media-card__actions">
                  <Button small onClick={() => void copyUrl(row.id)}>
                    Copy URL
                  </Button>
                  <Button small variant="danger" onClick={() => setConfirmDeleteId(row.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this file?"
        message="Removes the original and all derivatives. Cannot be undone."
        danger
        confirmLabel="Delete"
        onConfirm={() => confirmDeleteId && void handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
