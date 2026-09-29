import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import * as schema from "../../db/schema/index.js";

export type RevisionEntityType = (typeof schema.revisionEntityType.enumValues)[number];

/**
 * Only `insert` is needed here, deliberately narrower than `DrizzleDb` —
 * drizzle's `db.transaction(async (tx) => ...)` callback param has a
 * distinct (structurally compatible but nominally different) type from
 * `NodePgDatabase`, and this is the only surface record() touches.
 */
type Writable = Pick<DrizzleDb, "insert">;

@Injectable()
export class RevisionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Call this from inside the SAME transaction as the entity write it's
   * recording (backend PRD §6.3 — append-only) — a revision row must
   * never exist for a write that didn't actually commit, and vice
   * versa. `tx` is the transaction-scoped db handle a caller's own
   * `db.transaction(async (tx) => ...)` provides, not this service's
   * own `this.db`.
   */
  async record(
    tx: Writable,
    entityType: RevisionEntityType,
    entityId: string,
    snapshot: unknown,
    authorId: string,
  ): Promise<void> {
    await tx.insert(schema.revisions).values({ entityType, entityId, snapshot, authorId });
  }

  async list(entityType?: RevisionEntityType, entityId?: string) {
    const conditions = [
      entityType ? eq(schema.revisions.entityType, entityType) : undefined,
      entityId ? eq(schema.revisions.entityId, entityId) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    return this.db.query.revisions.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(schema.revisions.createdAt),
      limit: 200,
    });
  }

  async findById(id: string) {
    return this.db.query.revisions.findFirst({ where: eq(schema.revisions.id, id) });
  }
}
