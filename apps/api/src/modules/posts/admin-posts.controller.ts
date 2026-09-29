import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post as HttpPost, Put, Req, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import type { RequestWithAdmin } from "../admin-auth/types.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { upsertPostDtoSchema, type UpsertPostDto } from "./dto/upsert-post.dto.js";
import { PostsService } from "./posts.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/posts")
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @SuccessMessage("Posts retrieved successfully.")
  list() {
    return this.postsService.listForAdmin();
  }

  @Get(":id")
  @SuccessMessage("Post retrieved successfully.")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.getForAdmin(id);
  }

  @HttpPost()
  @SuccessMessage("Post created successfully.")
  create(@Body(new ZodValidationPipe(upsertPostDtoSchema)) dto: UpsertPostDto, @Req() req: RequestWithAdmin) {
    return this.postsService.create(dto, req.admin.id);
  }

  @Put(":id")
  @SuccessMessage("Post updated successfully.")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(upsertPostDtoSchema)) dto: UpsertPostDto,
    @Req() req: RequestWithAdmin,
  ) {
    return this.postsService.update(id, dto, req.admin.id);
  }

  @HttpPost(":id/publish")
  @SuccessMessage("Post published successfully.")
  publish(@Param("id", ParseUUIDPipe) id: string, @Req() req: RequestWithAdmin) {
    return this.postsService.publish(id, req.admin.id);
  }

  @Delete(":id")
  @SuccessMessage("Post deleted successfully.")
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.delete(id);
  }
}
