export function StatusPill({ status }: { status: "draft" | "published" }) {
  return <span className={`status-pill status-pill--${status}`}>{status}</span>;
}

/** §8's "single most important piece of state on most screens" — renders nothing when there's nothing pending. */
export function DirtyBadge({ hasPendingDraft }: { hasPendingDraft: boolean }) {
  if (!hasPendingDraft) return null;
  return <span className="dirty-badge">Unpublished changes</span>;
}
