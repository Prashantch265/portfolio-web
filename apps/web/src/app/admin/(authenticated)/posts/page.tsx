import type { Metadata } from "next";
import { PostsListView } from "./posts-list-view";

export const metadata: Metadata = { title: "Posts" };

export default function AdminPostsPage() {
  return <PostsListView />;
}
