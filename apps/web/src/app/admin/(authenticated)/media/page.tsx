import type { Metadata } from "next";
import { MediaView } from "./media-view";

export const metadata: Metadata = { title: "Media" };

export default function AdminMediaPage() {
  return <MediaView />;
}
