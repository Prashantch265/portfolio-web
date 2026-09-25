import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "portfolio — M0 scaffold",
  description: "Direction-agnostic placeholder shell. Frontend direction not yet chosen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
