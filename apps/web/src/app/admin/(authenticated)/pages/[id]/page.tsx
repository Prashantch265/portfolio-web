import type { Metadata } from "next";
import { PageEditorView } from "./page-editor-view";

export const metadata: Metadata = { title: "Edit page" };

export default async function AdminPageEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageEditorView id={id} />;
}
