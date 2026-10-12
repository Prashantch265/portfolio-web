import type { Metadata } from "next";
import { PagesListView } from "./pages-list-view";

export const metadata: Metadata = { title: "Pages" };

export default function AdminPagesPage() {
  return <PagesListView />;
}
