import { forwardRef, Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { RevisionsController } from "./revisions.controller.js";
import { RevisionsService } from "./revisions.service.js";

@Module({
  // forwardRef: ProjectsModule also imports RevisionsModule (for
  // RevisionsService, to write revisions from inside its own CRUD
  // transactions) — this is the genuinely circular half of that pair.
  imports: [AdminAuthModule, forwardRef(() => ProjectsModule)],
  controllers: [RevisionsController],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
