import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import type { RequestWithAdmin } from "../admin-auth/types.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { createDiagramDtoSchema, updateDiagramDtoSchema, type CreateDiagramDto, type UpdateDiagramDto } from "./dto/upsert-diagram.dto.js";
import { DiagramsService } from "./diagrams.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/diagrams")
export class AdminDiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Get()
  @SuccessMessage("Diagrams retrieved successfully.")
  list() {
    return this.diagramsService.listForAdmin();
  }

  @Get(":id")
  @SuccessMessage("Diagram retrieved successfully.")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.diagramsService.getForAdmin(id);
  }

  @Post()
  @SuccessMessage("Diagram created successfully.")
  create(@Body(new ZodValidationPipe(createDiagramDtoSchema)) dto: CreateDiagramDto, @Req() req: RequestWithAdmin) {
    return this.diagramsService.create(dto, req.admin.id);
  }

  @Put(":id")
  @SuccessMessage("Diagram updated successfully.")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDiagramDtoSchema)) dto: UpdateDiagramDto,
    @Req() req: RequestWithAdmin,
  ) {
    return this.diagramsService.update(id, dto, req.admin.id);
  }

  @Post(":id/publish")
  @SuccessMessage("Diagram published successfully.")
  publish(@Param("id", ParseUUIDPipe) id: string, @Req() req: RequestWithAdmin) {
    return this.diagramsService.publish(id, req.admin.id);
  }

  @Delete(":id")
  @SuccessMessage("Diagram deleted successfully.")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.diagramsService.delete(id);
  }
}
