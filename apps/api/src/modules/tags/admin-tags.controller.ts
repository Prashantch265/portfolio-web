import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { upsertTagDtoSchema, type UpsertTagDto } from "./dto/upsert-tag.dto.js";
import { TagsService } from "./tags.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/tags")
export class AdminTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @SuccessMessage("Tags retrieved successfully.")
  list() {
    return this.tagsService.list();
  }

  @Post()
  @SuccessMessage("Tag created successfully.")
  create(@Body(new ZodValidationPipe(upsertTagDtoSchema)) dto: UpsertTagDto) {
    return this.tagsService.create(dto);
  }

  @Put(":id")
  @SuccessMessage("Tag updated successfully.")
  update(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(upsertTagDtoSchema)) dto: UpsertTagDto) {
    return this.tagsService.update(id, dto);
  }

  @Delete(":id")
  @SuccessMessage("Tag deleted successfully.")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.tagsService.delete(id);
  }
}
