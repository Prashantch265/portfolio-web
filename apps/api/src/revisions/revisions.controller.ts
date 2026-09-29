import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import type { RequestWithAdmin } from "../admin-auth/types.js";
import { SuccessMessage } from "../common/decorators/success-message.decorator.js";
import { CustomHttpException, NotFoundException } from "../common/exceptions/exceptions.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { ProjectsService } from "../projects/projects.service.js";
import { listRevisionsQuerySchema, type ListRevisionsQuery } from "./dto/list-revisions.query.js";
import { RevisionsService } from "./revisions.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/revisions")
export class RevisionsController {
  constructor(
    private readonly revisionsService: RevisionsService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  @SuccessMessage("Revisions retrieved successfully.")
  list(@Query(new ZodValidationPipe(listRevisionsQuerySchema)) query: ListRevisionsQuery) {
    return this.revisionsService.list(query.entityType, query.entityId);
  }

  /**
   * Dispatches by entityType to whichever entity-specific admin
   * service owns it (backend PRD §6.3). Only "project" is wired so
   * far — Post/Diagram restore ship alongside their own admin CRUD in
   * later M1d sub-slices, added as another case here, not stubbed
   * ahead of a real caller. "caseStudySection" never appears as a
   * revision's own entityType: a section edit is recorded as part of
   * its parent Project's revision snapshot (the nested-draft decision
   * — see projects.service.ts), so there is nothing to restore at
   * section granularity independent of the project.
   */
  @Post(":id/restore")
  @SuccessMessage("Revision restored successfully.")
  async restore(@Param("id", ParseUUIDPipe) id: string, @Req() req: RequestWithAdmin) {
    const revision = await this.revisionsService.findById(id);
    if (!revision) throw new NotFoundException(`Revision "${id}" not found.`);

    switch (revision.entityType) {
      case "project":
        return this.projectsService.restoreFromRevision(revision, req.admin.id);
      default:
        throw new CustomHttpException(
          HttpStatus.NOT_IMPLEMENTED,
          `Restore is not yet supported for entity type "${revision.entityType}".`,
        );
    }
  }
}
