import { forwardRef, Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { PostsModule } from "../posts/posts.module.js";
import { DiagramsModule } from "../diagrams/diagrams.module.js";
import { RevisionsController } from "./revisions.controller.js";
import { RevisionsService } from "./revisions.service.js";

@Module({
  // forwardRef both ways: ProjectsModule/PostsModule/DiagramsModule
  // each import RevisionsModule too (for RevisionsService, to write
  // revisions from inside their own CRUD transactions) — genuinely
  // circular.
  imports: [
    AdminAuthModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => PostsModule),
    forwardRef(() => DiagramsModule),
  ],
  controllers: [RevisionsController],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
