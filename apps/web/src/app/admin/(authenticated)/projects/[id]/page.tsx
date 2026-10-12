import type { Metadata } from "next";
import { ProjectEditorView } from "./project-editor-view";

export const metadata: Metadata = { title: "Edit project" };

export default async function AdminProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectEditorView id={id} />;
}
