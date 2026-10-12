import type { Metadata } from "next";
import { ProjectsListView } from "./projects-list-view";

export const metadata: Metadata = { title: "Projects" };

export default function AdminProjectsPage() {
  return <ProjectsListView />;
}
