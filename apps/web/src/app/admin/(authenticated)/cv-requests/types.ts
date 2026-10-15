export type CvAccessGrantStatus = "pending" | "approved" | "issued" | "expired" | "revoked";

export interface CvAccessGrantRow {
  id: string;
  email: string;
  status: CvAccessGrantStatus;
  requestedAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  usedAt: string | null;
}
