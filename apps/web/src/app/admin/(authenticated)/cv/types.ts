export type CvSectionKind = "experience" | "education" | "skills" | "certifications" | "accomplishments";
export type CvSectionVisibility = "public" | "gated";

export interface CvProfileRow {
  id: string;
  headline: string;
  location: string;
  yearsExperience: string;
  summaryPublic: string;
  summaryGated: string | null;
}

export interface UpsertCvProfileBody {
  headline: string;
  location: string;
  yearsExperience: string;
  summaryPublic: string;
  summaryGated: string | null;
}

export interface CvSectionRow {
  id: string;
  kind: CvSectionKind;
  title: string;
  subtitle: string;
  dateRange: string | null;
  body: string | null;
  visibility: CvSectionVisibility;
  order: number;
}

export type UpsertCvSectionBody = Omit<CvSectionRow, "id">;
