import type { Metadata } from "next";
import { PostEditorView } from "./post-editor-view";

export const metadata: Metadata = { title: "Edit post" };

export default async function AdminPostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostEditorView id={id} />;
}
