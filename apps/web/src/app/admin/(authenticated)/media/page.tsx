import type { Metadata } from "next";

export const metadata: Metadata = { title: "Media" };

export default function AdminMediaPage() {
  return (
    <>
      <div className="admin-page-head">
        <h1>Media</h1>
        <span className="admin-page-head__meta">Upload / browse / copy URL / delete only — no consumers yet</span>
      </div>
      <p>The upload flow and library ship in slice A5 (PRD-frontend-admin.md §15).</p>
    </>
  );
}
