import type { Metadata } from "next";
import { CvView } from "./cv-view";

export const metadata: Metadata = { title: "CV" };

export default function AdminCvPage() {
  return <CvView />;
}
