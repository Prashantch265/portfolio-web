import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { NotFoundException } from "../../common/exceptions/exceptions.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { listPostsQuerySchema, type ListPostsQuery } from "./dto/list-posts.query.js";
import { PostsService } from "./posts.service.js";

@ApiTags("Posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: "Cursor-paginated list of published posts" })
  @SuccessMessage("Posts retrieved successfully.")
  findAll(@Query(new ZodValidationPipe(listPostsQuerySchema)) query: ListPostsQuery) {
    return this.postsService.getPosts(query.limit, query.cursor);
  }

  @Get(":slug")
  @ApiOperation({ summary: "Full published post" })
  @SuccessMessage("Post retrieved successfully.")
  async findOne(@Param("slug") slug: string) {
    const post = await this.postsService.getPost(slug);
    if (!post) throw new NotFoundException(`Post "${slug}" not found.`);
    return post;
  }
}
