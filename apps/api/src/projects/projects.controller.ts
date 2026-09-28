import { Controller, Get, Param, Query, UsePipes } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SuccessMessage } from "../common/decorators/success-message.decorator.js";
import { NotFoundException } from "../common/exceptions/exceptions.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { listProjectsQuerySchema } from "./dto/list-projects.query.js";
import { ProjectsService } from "./projects.service.js";

@ApiTags("Projects")
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "List published projects, optionally filtered to featured only" })
  @SuccessMessage("Projects retrieved successfully.")
  @UsePipes(new ZodValidationPipe(listProjectsQuerySchema))
  findAll(@Query() query: { featured?: boolean }) {
    return this.projectsService.getProjects(query.featured);
  }

  @Get(":slug")
  @ApiOperation({ summary: "Full published project, including case-study content and its published diagram" })
  @SuccessMessage("Project retrieved successfully.")
  async findOne(@Param("slug") slug: string) {
    const project = await this.projectsService.getProject(slug);
    if (!project) throw new NotFoundException(`Project "${slug}" not found.`);
    return project;
  }
}
