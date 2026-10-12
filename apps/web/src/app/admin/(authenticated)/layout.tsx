import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAuthProvider } from "../_lib/auth-provider";
import { Shell } from "../_components/shell";

// Same container-DNS/localhost-fallback pattern as
// lib/content/api-content-source.ts — server-to-server, not
// browser-to-Traefik, so it needs the real backend's own address.
const API_BASE_URL = process.env.INTERNAL_API_URL ?? "http://localhost:3001";

interface MeEnvelope {
  success: boolean;
  data?: { email: string };
}

/**
 * PRD §3's real server-side gate: nothing past this point ever reaches
 * an unauthenticated visitor, even for a moment — unlike the mockup's
 * necessarily-fake client-side hide/reveal (it had no server to ask).
 * Forwards the incoming request's own cookie header verbatim rather
 * than reconstructing it from a parsed jar, so this never
 * mis-encodes a value the browser actually sent.
 */
async function getAuthenticatedEmail(): Promise<string> {
  const incomingCookie = (await headers()).get("cookie");
  const res = await fetch(`${API_BASE_URL}/api/admin/auth/me`, {
    headers: incomingCookie ? { Cookie: incomingCookie } : undefined,
    cache: "no-store",
  });
  if (!res.ok) redirect("/admin/login");
  const env = (await res.json()) as MeEnvelope;
  if (!env.success || !env.data) redirect("/admin/login");
  return env.data.email;
}

export default async function AuthenticatedAdminLayout({ children }: { children: React.ReactNode }) {
  const email = await getAuthenticatedEmail();
  return (
    <div className="admin-root">
      <AdminAuthProvider email={email}>
        <Shell email={email}>{children}</Shell>
      </AdminAuthProvider>
    </div>
  );
}
