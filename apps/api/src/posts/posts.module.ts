import { forwardRef, Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { RevisionsModule } from "../revisions/revisions.module.js";
import { AdminPostsController } from "./admin-posts.controller.js";
import { PostsController } from "./posts.controller.js";
import { PostsService } from "./posts.service.js";

@Module({
  // forwardRef: RevisionsModule needs PostsService back (to dispatch
  // restore for entityType "post") — see revisions.module.ts.
  imports: [AdminAuthModule, forwardRef(() => RevisionsModule)],
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
