import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tags" };

export default function AdminTagsPage() {
  return (
    <>
      <div className="admin-page-head">
        <h1>Tags</h1>
        <span className="admin-page-head__meta">Flat CRUD — no draft/publish</span>
      </div>
      <p>Add, rename, and delete ship in slice A3 (PRD-frontend-admin.md §15).</p>
    </>
  );
}
