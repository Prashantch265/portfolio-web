"use client";

import { useEffect, useState } from "react";
import { send } from "../../_lib/api-client";

interface PathCount {
  path: string;
  count: number;
}

interface NodeCount {
  path: string;
  nodeId: string;
  count: number;
}

interface Summary {
  pageviews: PathCount[];
  topProjects: PathCount[];
  topPosts: PathCount[];
  diagramNodeAttention: NodeCount[];
  cvRequestFunnel: { requested: number };
}

function PathList({ rows, emptyMessage }: { rows: PathCount[]; emptyMessage: string }) {
  return (
    <ul className="list-simple">
      {rows.length === 0 ? (
        <li>{emptyMessage}</li>
      ) : (
        rows.map((row) => (
          <li key={row.path}>
            <span>{row.path}</span>
            <span>{row.count}</span>
          </li>
        ))
      )}
    </ul>
  );
}

/**
 * Read-only — §10 has no admin write surface for analytics, only a
 * dashboard. Numbers are all-time (still-raw events merged with
 * already-rolled-up aggregates server-side), not "since the last
 * purge" — see apps/api's analytics.service.ts.
 */
export function AnalyticsView() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    void send<Summary>("GET", "/analytics/summary")
      .then((env) => setSummary(env.data ?? null))
      .catch(() => setSummary(null));
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <h1>Analytics</h1>
        <span className="admin-page-head__meta">Cookieless, first-party, all-time counts — §10.</span>
      </div>

      {summary === null ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="section-block">
            <h2>Pageviews by path</h2>
            <PathList rows={summary.pageviews} emptyMessage="No pageviews recorded yet." />
          </div>

          <div className="section-block">
            <h2>Top projects</h2>
            <PathList rows={summary.topProjects} emptyMessage="No project pageviews yet." />
          </div>

          <div className="section-block">
            <h2>Top posts</h2>
            <PathList rows={summary.topPosts} emptyMessage="No post pageviews yet." />
          </div>

          <div className="section-block">
            <h2>Diagram node attention</h2>
            <p className="admin-page-head__meta" style={{ marginBottom: "var(--space-3)" }}>
              Which architecture decisions readers actually hover or focus on.
            </p>
            <ul className="list-simple">
              {summary.diagramNodeAttention.length === 0 ? (
                <li>No diagram interactions recorded yet.</li>
              ) : (
                summary.diagramNodeAttention.map((row) => (
                  <li key={`${row.path}::${row.nodeId}`}>
                    <span>
                      {row.path} · {row.nodeId}
                    </span>
                    <span>{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="section-block">
            <h2>CV request funnel</h2>
            <p className="admin-page-head__meta" style={{ marginBottom: "var(--space-3)" }}>
              Only "requested" has a data source yet — approved/issued need CVAccessGrant (backend M4, not built).
            </p>
            <ul className="list-simple">
              <li>
                <span>Requested</span>
                <span>{summary.cvRequestFunnel.requested}</span>
              </li>
              <li>
                <span>Approved</span>
                <span>— (M4)</span>
              </li>
              <li>
                <span>Issued</span>
                <span>— (M4)</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}
