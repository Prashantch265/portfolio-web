import { ApiStatusClient } from "./api-status-client";

async function getInternalApiHealth(): Promise<"ok" | "error"> {
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://api:3001";
  try {
    const res = await fetch(`${internalApiUrl}/api/health`, { cache: "no-store" });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

export default async function HomePage() {
  const internalStatus = await getInternalApiHealth();

  return (
    <main>
      <h1>portfolio — M0 scaffold</h1>
      <p>
        Direction-agnostic placeholder. No fonts, tokens, or mockup markup ported yet — this
        page&apos;s only job is proving Traefik routing and container-to-container API
        reachability (backend PRD §17, M0).
      </p>
      <dl>
        <dt>Server-side fetch to API (Compose-internal network, bypasses Traefik)</dt>
        <dd data-testid="api-status-server">{internalStatus}</dd>
        <dt>Client-side fetch to /api/health (through Traefik, same origin)</dt>
        <dd>
          <ApiStatusClient />
        </dd>
      </dl>
    </main>
  );
}
