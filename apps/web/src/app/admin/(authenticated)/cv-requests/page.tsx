import type { Metadata } from "next";
import { CvRequestsView } from "./cv-requests-view";

export const metadata: Metadata = { title: "CV requests" };

export default function AdminCvRequestsPage() {
  return <CvRequestsView />;
}
