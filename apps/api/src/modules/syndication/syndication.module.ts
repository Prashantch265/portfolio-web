import { Module } from "@nestjs/common";
import { PostsModule } from "../posts/posts.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { SyndicationController } from "./syndication.controller.js";
import { SyndicationService } from "./syndication.service.js";

@Module({
  imports: [PostsModule, ProjectsModule],
  controllers: [SyndicationController],
  providers: [SyndicationService],
})
export class SyndicationModule {}
