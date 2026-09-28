import { Inject, Injectable } from "@nestjs/common";
import { asc, eq, and } from "drizzle-orm";
import { cvSchema, type CV, type CVEntry } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import { CacheService } from "../common/cache/cache.service.js";
import { NotFoundException } from "../common/exceptions/exceptions.js";
import type { UpdateCvProfileDto } from "./dto/update-cv-profile.dto.js";
import type { UpsertCvSectionDto } from "./dto/upsert-cv-section.dto.js";

const CACHE_KEY_PUBLIC = "content:cv:public";
const CACHE_TTL_SECONDS = 60;

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
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
  ) {}

  /**
   * Public-vs-gated filtering enforced here, in the query itself
   * (backend PRD §13's "hard rule... filtered in the repository
   * method, not just a response mapper") — never in a response-shape
   * step downstream that a future change could accidentally skip.
   */
  async getPublicCv(): Promise<CV> {
    return this.cache.wrap(CACHE_KEY_PUBLIC, CACHE_TTL_SECONDS, async () => {
      const profile = await this.db.query.cvProfiles.findFirst();
      if (!profile) throw new NotFoundException("CV has not been published yet.");

      const sections = await this.db.query.cvSections.findMany({
        where: and(eq(schema.cvSections.cvProfileId, profile.id), eq(schema.cvSections.visibility, "public")),
        orderBy: asc(schema.cvSections.order),
      });

      const grouped: Record<string, CVEntry[]> = { experience: [], education: [], certifications: [], accomplishments: [] };
      for (const section of sections) {
        const field = PUBLIC_KIND_FIELD[section.kind];
        if (field) grouped[field]?.push(toEntry(section));
      }

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
}
