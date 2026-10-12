import type { Metadata } from "next";

export const metadata: Metadata = { title: "CV" };

export default function AdminCvPage() {
  return (
    <>
      <div className="admin-page-head">
        <h1>CV</h1>
        <span className="admin-page-head__meta">Singleton profile + ordered sections — no draft/publish</span>
      </div>
      <p>The profile and section editors ship in slice A7 (PRD-frontend-admin.md §15).</p>
    </>
  );
}
