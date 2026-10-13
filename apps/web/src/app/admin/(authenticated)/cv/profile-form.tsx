"use client";

import { useState } from "react";
import { ApiError, send, splitFieldErrors } from "../../_lib/api-client";
import { Button } from "../../_components/button";
import { TextInput, TextareaField, FormBanner, FormNotice } from "../../_components/field";
import { useToast } from "../../_components/toast";
import type { CvProfileRow, UpsertCvProfileBody } from "./types";

const BLANK: UpsertCvProfileBody = { headline: "", location: "", yearsExperience: "", summaryPublic: "", summaryGated: null };

/** Singleton — PUT upserts regardless of whether a row exists yet (PRD §7.2), so "create" and "edit" are the same request, only the surrounding copy differs. */
export function ProfileForm({ profile, onSaved }: { profile: CvProfileRow | null; onSaved: (row: CvProfileRow) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<UpsertCvProfileBody>(
    profile ? { headline: profile.headline, location: profile.location, yearsExperience: profile.yearsExperience, summaryPublic: profile.summaryPublic, summaryGated: profile.summaryGated } : BLANK,
  );
  const [summaryGatedText, setSummaryGatedText] = useState(profile?.summaryGated ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setBanner(null);
    try {
      const res = await send<CvProfileRow>("PUT", "/cv/profile", { ...form, summaryGated: summaryGatedText.trim() ? summaryGatedText : null });
      onSaved(res.data!);
      toast(profile ? "Profile saved." : "Profile created.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        const { fields, banner: b } = splitFieldErrors(err.source);
        setFieldErrors(fields);
        setBanner(b ?? err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="section-block">
      <h2>Profile</h2>
      {profile ? null : <FormNotice>No profile yet — this is the only CV content gated behind creating one first.</FormNotice>}
      <FormBanner message={banner} />
      <form onSubmit={(e) => void handleSave(e)}>
        <TextInput label="Headline" name="headline" value={form.headline} error={fieldErrors.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        <TextInput label="Location" name="location" value={form.location} error={fieldErrors.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <TextInput
          label="Years of experience"
          name="yearsExperience"
          value={form.yearsExperience}
          error={fieldErrors.yearsExperience}
          onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
        />
        <TextareaField
          label="Summary (public)"
          name="summaryPublic"
          rows={3}
          value={form.summaryPublic}
          error={fieldErrors.summaryPublic}
          onChange={(e) => setForm({ ...form, summaryPublic: e.target.value })}
        />
        <TextareaField
          label="Summary (gated — shown only to approved CV requesters)"
          name="summaryGated"
          rows={3}
          value={summaryGatedText}
          error={fieldErrors.summaryGated}
          onChange={(e) => setSummaryGatedText(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : profile ? "Save profile" : "Create profile"}
        </Button>
      </form>
    </div>
  );
}
