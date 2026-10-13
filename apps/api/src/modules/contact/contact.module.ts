import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AdminContactController } from "./admin-contact.controller.js";
import { ContactController } from "./contact.controller.js";
import { ContactService } from "./contact.service.js";

@Module({
  imports: [AdminAuthModule],
  controllers: [ContactController, AdminContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
