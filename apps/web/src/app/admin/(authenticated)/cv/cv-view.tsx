"use client";

import { useEffect, useState } from "react";
import { send } from "../../_lib/api-client";
import { NewSectionForm } from "./new-section-form";
import { ProfileForm } from "./profile-form";
import { SectionCard } from "./section-card";
import type { CvProfileRow, CvSectionRow } from "./types";

export function CvView() {
  const [profile, setProfile] = useState<CvProfileRow | null | undefined>(undefined);
  const [sections, setSections] = useState<CvSectionRow[] | null>(null);

  useEffect(() => {
    void send<CvProfileRow>("GET", "/cv/profile").then((env) => setProfile(env.data ?? null));
    void send<CvSectionRow[]>("GET", "/cv/sections")
      .then((env) => setSections(env.data ?? []))
      .catch(() => setSections([]));
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <h1>CV</h1>
        <span className="admin-page-head__meta">Singleton profile + ordered sections — no draft/publish, every write is immediately live</span>
      </div>

      {profile === undefined ? (
        <p>Loading…</p>
      ) : (
        <ProfileForm profile={profile} onSaved={setProfile} />
      )}

      <div className="section-block">
        <h2>Sections</h2>
        {sections === null ? (
          <p>Loading…</p>
        ) : (
          <>
            {sections.map((row) => (
              <SectionCard
                key={row.id}
                row={row}
                onSaved={(next) => setSections((prev) => (prev ?? []).map((r) => (r.id === next.id ? next : r)))}
                onDeleted={(id) => setSections((prev) => (prev ?? []).filter((r) => r.id !== id))}
              />
            ))}
            {profile ? (
              <NewSectionForm nextOrder={sections.length} onCreated={(row) => setSections((prev) => [...(prev ?? []), row])} />
            ) : (
              <p className="admin-page-head__meta">Create the CV profile before adding sections.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
