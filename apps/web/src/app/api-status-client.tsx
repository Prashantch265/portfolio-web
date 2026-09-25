"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "error";

/**
 * Fetches /api/health through the browser — i.e. through Traefik on the
 * site's own origin, never CORS. This is the check that actually catches
 * a broken Traefik PathPrefix("/api") rule; the server-side fetch in
 * page.tsx only proves the api container is reachable on the Compose
 * network, which is a different failure mode.
 */
export function ApiStatusClient() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  return <span data-testid="api-status-client">{status}</span>;
}
