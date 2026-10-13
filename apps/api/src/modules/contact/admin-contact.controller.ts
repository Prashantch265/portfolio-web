import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard.js";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ContactService } from "./contact.service.js";

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller("admin/contact")
export class AdminContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @SuccessMessage("Contact messages retrieved successfully.")
  list() {
    return this.contactService.listForAdmin();
  }

  @Post(":id/mark-read")
  @SuccessMessage("Marked as read.")
  markRead(@Param("id", ParseUUIDPipe) id: string) {
    return this.contactService.markRead(id);
  }

  @Post(":id/archive")
  @SuccessMessage("Archived.")
  archive(@Param("id", ParseUUIDPipe) id: string) {
    return this.contactService.archive(id);
  }

  @Post(":id/mark-spam")
  @SuccessMessage("Marked as spam.")
  markSpam(@Param("id", ParseUUIDPipe) id: string) {
    return this.contactService.markSpam(id);
  }
}
