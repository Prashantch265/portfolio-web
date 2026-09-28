import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { listRevisionsQuerySchema, type ListRevisionsQuery } from "./dto/list-revisions.query.js";
import { RevisionsService } from "./revisions.service.js";

/**
 * Restore (POST /api/admin/revisions/:id/restore, backend PRD §6.3) is
 * NOT here yet — it dispatches to whichever entity-specific admin
 * service owns the entity a revision belongs to, and none of those
 * exist yet at this point in the build (Project/Post/Diagram admin
 * CRUD ship in later M1d sub-slices). Added incrementally as each
 * entity's admin service ships, not stubbed out ahead of a real caller.
 */
@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/revisions")
export class RevisionsController {
  constructor(private readonly revisionsService: RevisionsService) {}

  @Get()
  @SuccessMessage("Revisions retrieved successfully.")
  list(@Query(new ZodValidationPipe(listRevisionsQuerySchema)) query: ListRevisionsQuery) {
    return this.revisionsService.list(query.entityType, query.entityId);
  }
}
