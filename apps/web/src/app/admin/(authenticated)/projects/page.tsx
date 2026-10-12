import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projects" };

export default function AdminProjectsPage() {
  return (
    <>
      <div className="admin-page-head">
        <h1>Projects</h1>
        <span className="admin-page-head__meta">Case studies — the largest content type</span>
      </div>
      <p>The list, editor, and case-study sections ship in slice A2 (PRD-frontend-admin.md §15).</p>
    </>
  );
}
