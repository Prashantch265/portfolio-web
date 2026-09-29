import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import * as schema from "../../db/schema/index.js";
import { ConflictException, NotFoundException } from "../../common/exceptions/exceptions.js";
import { isUniqueViolation } from "../../common/db/is-unique-violation.js";
import type { UpsertTagDto } from "./dto/upsert-tag.dto.js";

@Injectable()
export class TagsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.query.tags.findMany({ orderBy: asc(schema.tags.label) });
  }

  async create(dto: UpsertTagDto) {
    try {
      const [row] = await this.db.insert(schema.tags).values(dto).returning();
      if (!row) throw new Error("Tag insert returned no row");
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`Tag "${dto.label}" (${dto.kind}) already exists.`);
      throw err;
    }
  }

  async update(id: string, dto: UpsertTagDto) {
    try {
      const [row] = await this.db.update(schema.tags).set(dto).where(eq(schema.tags.id, id)).returning();
      if (!row) throw new NotFoundException(`Tag "${id}" not found.`);
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`Tag "${dto.label}" (${dto.kind}) already exists.`);
      throw err;
    }
  }

  async delete(id: string) {
    const [row] = await this.db.delete(schema.tags).where(eq(schema.tags.id, id)).returning();
    if (!row) throw new NotFoundException(`Tag "${id}" not found.`);
  }
}
