import { forwardRef, Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { RevisionsModule } from "../revisions/revisions.module.js";
import { AdminProjectsController } from "./admin-projects.controller.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  // forwardRef: RevisionsModule needs ProjectsService back (to dispatch
  // POST /api/admin/revisions/:id/restore for entityType "project") —
  // see revisions.module.ts's matching forwardRef.
  imports: [AdminAuthModule, forwardRef(() => RevisionsModule)],
  controllers: [ProjectsController, AdminProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
