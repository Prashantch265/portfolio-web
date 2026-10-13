import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ContactService } from "./contact.service.js";
import { submitContactMessageDtoSchema, type SubmitContactMessageDto } from "./dto/submit-contact-message.dto.js";

@ApiTags("Contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage("Message sent.")
  async submit(@Body(new ZodValidationPipe(submitContactMessageDtoSchema)) dto: SubmitContactMessageDto, @Req() req: Request) {
    // Response is identical whether this was dropped as spam or really
    // stored (§9) — the caller never learns which, and there's nothing
    // here a real sender needs back (not an editable resource).
    await this.contactService.submit(dto, req.ip ?? "unknown");
    return { received: true };
  }
}
