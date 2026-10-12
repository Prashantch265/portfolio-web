import type { Metadata } from "next";
import { DiagramEditorView } from "./diagram-editor-view";

export const metadata: Metadata = { title: "Edit diagram" };

export default async function AdminDiagramEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiagramEditorView projectId={id} />;
}
