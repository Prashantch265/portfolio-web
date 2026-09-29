import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import type { RequestWithAdmin } from "../admin-auth/types.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { upsertProjectDtoSchema, type UpsertProjectDto } from "./dto/upsert-project.dto.js";
import { upsertCaseStudySectionDtoSchema, type UpsertCaseStudySectionDto } from "./dto/upsert-case-study-section.dto.js";
import { ProjectsService } from "./projects.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/projects")
export class AdminProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @SuccessMessage("Projects retrieved successfully.")
  list() {
    return this.projectsService.listForAdmin();
  }

  @Get(":id")
  @SuccessMessage("Project retrieved successfully.")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.getForAdmin(id);
  }

  @Post()
  @SuccessMessage("Project created successfully.")
  create(@Body(new ZodValidationPipe(upsertProjectDtoSchema)) dto: UpsertProjectDto, @Req() req: RequestWithAdmin) {
    return this.projectsService.create(dto, req.admin.id);
  }

  @Put(":id")
  @SuccessMessage("Project updated successfully.")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(upsertProjectDtoSchema)) dto: UpsertProjectDto,
    @Req() req: RequestWithAdmin,
  ) {
    return this.projectsService.update(id, dto, req.admin.id);
  }

  @Put(":id/sections/:kind")
  @SuccessMessage("Case-study section saved successfully.")
  upsertSection(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("kind") kind: string,
    @Body(new ZodValidationPipe(upsertCaseStudySectionDtoSchema)) dto: UpsertCaseStudySectionDto,
    @Req() req: RequestWithAdmin,
  ) {
    return this.projectsService.upsertSection(id, kind, dto.body, req.admin.id);
  }

  @Post(":id/publish")
  @SuccessMessage("Project published successfully.")
  publish(@Param("id", ParseUUIDPipe) id: string, @Req() req: RequestWithAdmin) {
    return this.projectsService.publish(id, req.admin.id);
  }

  @Delete(":id")
  @SuccessMessage("Project deleted successfully.")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.delete(id);
  }
}
