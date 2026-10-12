import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pages" };

export default function AdminPagesPage() {
  return (
    <>
      <div className="admin-page-head">
        <h1>Pages</h1>
        <span className="admin-page-head__meta">No draft/publish — every save is immediately live</span>
      </div>
      <p>The list, editor, and delete action ship in slice A3 (PRD-frontend-admin.md §15).</p>
    </>
  );
}
