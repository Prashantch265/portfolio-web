import type { Metadata } from "next";
import { TagsView } from "./tags-view";

export const metadata: Metadata = { title: "Tags" };

export default function AdminTagsPage() {
  return <TagsView />;
}
