import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { asc, desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { cvSchema, type CV, type CVEntry } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import * as schema from "../../db/schema/index.js";
import { CacheService } from "../../common/cache/cache.service.js";
import { NotFoundException, ConflictException, TooManyRequestsException } from "../../common/exceptions/exceptions.js";
import { SlidingWindowLimiterService } from "../../common/rate-limit/sliding-window-limiter.service.js";
import { MAIL_ADAPTER } from "../../common/mail/mail.tokens.js";
import type { MailAdapter } from "../../common/mail/mail-adapter.interface.js";
import type { UpdateCvProfileDto } from "./dto/update-cv-profile.dto.js";
import type { UpsertCvSectionDto } from "./dto/upsert-cv-section.dto.js";
import type { RequestCvAccessDto } from "./dto/request-cv-access.dto.js";
import { renderCvPdf } from "./lib/cv-pdf.js";

const CACHE_KEY_PUBLIC = "content:cv:public";
const CACHE_TTL_SECONDS = 60;

const gatedCvSchema = cvSchema.extend({ summaryGated: z.string().nullable() });
export type GatedCv = z.infer<typeof gatedCvSchema>;

const REQUEST_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const REQUEST_RATE_LIMIT_MAX = 3;
const ISSUED_GRACE_MS = 5 * 60 * 1000;

type CvSectionKind = (typeof schema.cvSectionKind.enumValues)[number];

const PUBLIC_KIND_FIELD: Record<CvSectionKind, keyof CV | null> = {
  experience: "experience",
  education: "education",
  certifications: "certifications",
  accomplishments: "accomplishments",
  skills: null, // no frontend field consumes this yet — schema documents it honestly anyway (same reasoning as diagram.groups)
};

function toEntry(row: typeof schema.cvSections.$inferSelect): CVEntry {
  return {
    title: row.title,
    subtitle: row.subtitle,
    dates: row.dateRange ?? undefined,
    body: row.body ?? undefined,
  };
}

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
    private readonly limiter: SlidingWindowLimiterService,
    @Inject(MAIL_ADAPTER) private readonly mailAdapter: MailAdapter,
  ) {}

  /**
   * Public-vs-gated filtering enforced here, in the query itself
   * (backend PRD §13's "hard rule... filtered in the repository
   * method, not just a response mapper") — never in a response-shape
   * step downstream that a future change could accidentally skip.
   * Shared by both getPublicCv and getCvForAccess (§8: "one CV-
   * serialization code path, reused by both").
   */
  private async loadProfileAndGroupedSections(onlyPublic: boolean) {
    const profile = await this.db.query.cvProfiles.findFirst();
    if (!profile) throw new NotFoundException("CV has not been published yet.");

    const sections = await this.db.query.cvSections.findMany({
      where: onlyPublic
        ? and(eq(schema.cvSections.cvProfileId, profile.id), eq(schema.cvSections.visibility, "public"))
        : eq(schema.cvSections.cvProfileId, profile.id),
      orderBy: asc(schema.cvSections.order),
    });

    const grouped: Record<string, CVEntry[]> = { experience: [], education: [], certifications: [], accomplishments: [] };
    for (const section of sections) {
      const field = PUBLIC_KIND_FIELD[section.kind];
      if (field) grouped[field]?.push(toEntry(section));
    }

    return { profile, grouped };
  }

  async getPublicCv(): Promise<CV> {
    return this.cache.wrap(CACHE_KEY_PUBLIC, CACHE_TTL_SECONDS, async () => {
      const { profile, grouped } = await this.loadProfileAndGroupedSections(true);
      return cvSchema.parse({
        headline: profile.headline,
        location: profile.location,
        yearsExperience: profile.yearsExperience,
        summary: profile.summaryPublic,
        experience: grouped.experience,
        education: grouped.education,
        certifications: grouped.certifications,
        accomplishments: grouped.accomplishments,
      });
    });
  }

  /** Includes gated sections + summaryGated — only ever reached through a validated access grant (§7) or the admin PDF generator (§8), never cached (low-traffic, on-demand, must always reflect current content). */
  async getCvForAccess() {
    const { profile, grouped } = await this.loadProfileAndGroupedSections(false);
    return gatedCvSchema.parse({
      headline: profile.headline,
      location: profile.location,
      yearsExperience: profile.yearsExperience,
      summary: profile.summaryPublic,
      summaryGated: profile.summaryGated,
      experience: grouped.experience,
      education: grouped.education,
      certifications: grouped.certifications,
      accomplishments: grouped.accomplishments,
    });
  }

  async getProfileForAdmin() {
    return this.db.query.cvProfiles.findFirst();
  }

  /** Singleton row — there is only ever one CVProfile (backend PRD §4), so "update" upserts it rather than addressing it by id. */
  async upsertProfile(dto: UpdateCvProfileDto) {
    const existing = await this.db.query.cvProfiles.findFirst();
    const values = {
      headline: dto.headline,
      location: dto.location,
      yearsExperience: dto.yearsExperience,
      summaryPublic: dto.summaryPublic,
      summaryGated: dto.summaryGated ?? null,
    };

    const [row] = existing
      ? await this.db.update(schema.cvProfiles).set({ ...values, updatedAt: new Date() }).where(eq(schema.cvProfiles.id, existing.id)).returning()
      : await this.db.insert(schema.cvProfiles).values(values).returning();

    if (!row) throw new Error("CV profile upsert returned no row");
    await this.cache.invalidate(CACHE_KEY_PUBLIC);
    return row;
  }

  async listSectionsForAdmin() {
    return this.db.query.cvSections.findMany({ orderBy: asc(schema.cvSections.order) });
  }

  async createSection(dto: UpsertCvSectionDto) {
    const profile = await this.db.query.cvProfiles.findFirst();
    if (!profile) throw new NotFoundException("Create the CV profile before adding sections.");

    const [row] = await this.db
      .insert(schema.cvSections)
      .values({ ...dto, dateRange: dto.dateRange ?? null, body: dto.body ?? null, cvProfileId: profile.id })
      .returning();
    if (!row) throw new Error("CV section insert returned no row");
    if (dto.visibility === "public") await this.cache.invalidate(CACHE_KEY_PUBLIC);
    return row;
  }

  async updateSection(id: string, dto: UpsertCvSectionDto) {
    const [row] = await this.db
      .update(schema.cvSections)
      .set({ ...dto, dateRange: dto.dateRange ?? null, body: dto.body ?? null, updatedAt: new Date() })
      .where(eq(schema.cvSections.id, id))
      .returning();
    if (!row) throw new NotFoundException(`CV section "${id}" not found.`);
    await this.cache.invalidate(CACHE_KEY_PUBLIC);
    return row;
  }

  async deleteSection(id: string) {
    const [row] = await this.db.delete(schema.cvSections).where(eq(schema.cvSections.id, id)).returning();
    if (!row) throw new NotFoundException(`CV section "${id}" not found.`);
    await this.cache.invalidate(CACHE_KEY_PUBLIC);
  }

  /** §7 step 1 — honeypot drop looks identical to a real request (same disguised-rejection reasoning as contact's §9). Rate limit is real (component inventory has a genuine "rate-limited" state for this form). */
  async requestAccess(dto: RequestCvAccessDto): Promise<void> {
    if (dto.company) {
      this.logger.debug("Dropped a suspected-spam CV access request (honeypot).");
      return;
    }

    const limit = await this.limiter.check(`cv-request:${dto.email.toLowerCase()}`, REQUEST_RATE_LIMIT_WINDOW_MS, REQUEST_RATE_LIMIT_MAX);
    if (!limit.allowed) throw new TooManyRequestsException("Too many requests from this email. Try again later.");

    const [row] = await this.db.insert(schema.cvAccessGrants).values({ email: dto.email }).returning();
    if (!row) throw new Error("CV access grant insert returned no row");

    await this.mailAdapter.send({
      to: process.env.ADMIN_EMAIL ?? "",
      subject: "New CV access request",
      text: `${dto.email} requested the full CV. Review it in /admin/cv-requests.`,
    });
  }

  async listGrantsForAdmin() {
    return this.db.query.cvAccessGrants.findMany({ orderBy: desc(schema.cvAccessGrants.requestedAt) });
  }

  /** §7 step 2 — only a pending grant can be approved; re-approving an already-approved/issued/revoked one would silently re-mint a token for a request that's no longer in that state. */
  async approveGrant(id: string) {
    const grant = await this.db.query.cvAccessGrants.findFirst({ where: eq(schema.cvAccessGrants.id, id) });
    if (!grant) throw new NotFoundException(`CV access request "${id}" not found.`);
    if (grant.status !== "pending") throw new ConflictException(`Request is already "${grant.status}".`);

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const ttlDays = Number(process.env.CV_GRANT_TTL_DAYS ?? 7);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const [row] = await this.db
      .update(schema.cvAccessGrants)
      .set({ status: "approved", tokenHash, approvedAt: new Date(), expiresAt })
      .where(eq(schema.cvAccessGrants.id, id))
      .returning();
    if (!row) throw new Error("CV access grant update returned no row");

    await this.mailAdapter.send({
      to: grant.email,
      subject: "Your CV access link",
      text: `${process.env.SITE_ORIGIN ?? ""}/cv/access/${rawToken}\n\nThis link expires in ${ttlDays} day${ttlDays === 1 ? "" : "s"} and can be used once.`,
    });

    return row;
  }

  /** §7 — "regardless of current state": shuts down a pending request or invalidates an approved-but-unused link alike. */
  async revokeGrant(id: string) {
    const [row] = await this.db
      .update(schema.cvAccessGrants)
      .set({ status: "revoked" })
      .where(eq(schema.cvAccessGrants.id, id))
      .returning();
    if (!row) throw new NotFoundException(`CV access request "${id}" not found.`);
    return row;
  }

  /**
   * §7 step 3 — single-use: a valid token flips straight to `issued` on
   * first read. §8 adds a second renderer (PDF) of the same one
   * redemption, reached via the same token — a visitor who opens the
   * link needs the page view AND the download to both work in that one
   * visit, not just whichever format hits the server first. So "issued"
   * stays readable for a short grace window after usedAt, then locks
   * for good; this isn't unlimited reuse, just enough to cover opening
   * the page and then clicking "Download PDF".
   *
   * Every failure path (not found, wrong status, expired, grace
   * expired) collapses to the same generic message — distinguishing
   * them would tell a token-guesser which case they hit. Expiry is
   * checked lazily here rather than by a sweep job: `status` only ever
   * reads "expired" after someone actually tries a stale link.
   */
  private async validateAndMarkIssued(rawToken: string): Promise<void> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const grant = await this.db.query.cvAccessGrants.findFirst({ where: eq(schema.cvAccessGrants.tokenHash, tokenHash) });

    const expired = grant?.status === "approved" && grant.expiresAt !== null && grant.expiresAt < new Date();
    if (expired) {
      await this.db.update(schema.cvAccessGrants).set({ status: "expired" }).where(eq(schema.cvAccessGrants.id, grant.id));
    }

    const withinGrace = grant?.status === "issued" && grant.usedAt !== null && Date.now() - grant.usedAt.getTime() < ISSUED_GRACE_MS;

    if (!grant || expired || (grant.status !== "approved" && !withinGrace)) {
      throw new NotFoundException("This link has expired or already been used.");
    }

    if (grant.status === "approved") {
      await this.db.update(schema.cvAccessGrants).set({ status: "issued", usedAt: new Date() }).where(eq(schema.cvAccessGrants.id, grant.id));
    }
  }

  async redeemToken(rawToken: string) {
    await this.validateAndMarkIssued(rawToken);
    return this.getCvForAccess();
  }

  /** §8 — same data, rendered the other way. Generated fresh on every call, never cached (§8's own "correctness over shaving render time" call). */
  async getCvPdf(rawToken: string): Promise<Buffer> {
    await this.validateAndMarkIssued(rawToken);
    const cv = await this.getCvForAccess();
    return renderCvPdf(cv);
  }
}
