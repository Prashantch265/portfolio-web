import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { CvService } from "./cv.service.js";
import { updateCvProfileDtoSchema, type UpdateCvProfileDto } from "./dto/update-cv-profile.dto.js";
import { upsertCvSectionDtoSchema, type UpsertCvSectionDto } from "./dto/upsert-cv-section.dto.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/cv")
export class AdminCvController {
  constructor(private readonly cvService: CvService) {}

  @Get("profile")
  @SuccessMessage("CV profile retrieved successfully.")
  getProfile() {
    return this.cvService.getProfileForAdmin();
  }

  @Put("profile")
  @SuccessMessage("CV profile saved successfully.")
  updateProfile(@Body(new ZodValidationPipe(updateCvProfileDtoSchema)) dto: UpdateCvProfileDto) {
    return this.cvService.upsertProfile(dto);
  }

  @Get("sections")
  @SuccessMessage("CV sections retrieved successfully.")
  listSections() {
    return this.cvService.listSectionsForAdmin();
  }

  @Post("sections")
  @SuccessMessage("CV section created successfully.")
  createSection(@Body(new ZodValidationPipe(upsertCvSectionDtoSchema)) dto: UpsertCvSectionDto) {
    return this.cvService.createSection(dto);
  }

  @Put("sections/:id")
  @SuccessMessage("CV section updated successfully.")
  updateSection(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(upsertCvSectionDtoSchema)) dto: UpsertCvSectionDto,
  ) {
    return this.cvService.updateSection(id, dto);
  }

  @Delete("sections/:id")
  @SuccessMessage("CV section deleted successfully.")
  deleteSection(@Param("id", ParseUUIDPipe) id: string) {
    return this.cvService.deleteSection(id);
  }
}
