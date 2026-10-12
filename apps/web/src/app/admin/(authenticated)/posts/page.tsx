import type { Metadata } from "next";

export const metadata: Metadata = { title: "Posts" };

export default function AdminPostsPage() {
  return (
    <>
      <div className="admin-page-head">
        <h1>Posts</h1>
        <span className="admin-page-head__meta">Reuses projects&rsquo; draft/publish mechanics</span>
      </div>
      <p>The list and editor ship in slice A3 (PRD-frontend-admin.md §15).</p>
    </>
  );
}
