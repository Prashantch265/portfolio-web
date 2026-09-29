import { forwardRef, Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { RevisionsModule } from "../revisions/revisions.module.js";
import { AdminDiagramsController } from "./admin-diagrams.controller.js";
import { DiagramsService } from "./diagrams.service.js";

@Module({
  // forwardRef: RevisionsModule needs DiagramsService back (to dispatch
  // restore for entityType "diagram") — see revisions.module.ts.
  imports: [AdminAuthModule, forwardRef(() => RevisionsModule)],
  controllers: [AdminDiagramsController],
  providers: [DiagramsService],
  exports: [DiagramsService],
})
export class DiagramsModule {}
