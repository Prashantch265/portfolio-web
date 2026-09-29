import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { upsertPageDtoSchema, type UpsertPageDto } from "./dto/upsert-page.dto.js";
import { PagesService } from "./pages.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/pages")
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @SuccessMessage("Pages retrieved successfully.")
  list() {
    return this.pagesService.listForAdmin();
  }

  @Post()
  @SuccessMessage("Page created successfully.")
  create(@Body(new ZodValidationPipe(upsertPageDtoSchema)) dto: UpsertPageDto) {
    return this.pagesService.create(dto);
  }

  @Put(":id")
  @SuccessMessage("Page updated successfully.")
  update(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(upsertPageDtoSchema)) dto: UpsertPageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete(":id")
  @SuccessMessage("Page deleted successfully.")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.pagesService.delete(id);
  }
}
