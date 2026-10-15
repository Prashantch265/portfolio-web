import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { CvService } from "./cv.service.js";
import { requestCvAccessDtoSchema, type RequestCvAccessDto } from "./dto/request-cv-access.dto.js";

@ApiTags("CV")
@Controller("cv")
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Get("public")
  @ApiOperation({ summary: "Public CV summary — gated sections and summaryGated never included" })
  @SuccessMessage("CV retrieved successfully.")
  getPublic() {
    return this.cvService.getPublicCv();
  }

  @Post("request")
  @HttpCode(HttpStatus.OK)
  @SuccessMessage("Request received.")
  async requestAccess(@Body(new ZodValidationPipe(requestCvAccessDtoSchema)) dto: RequestCvAccessDto) {
    // Identical response whether this was real or dropped as spam (§9's
    // disguised-rejection, same reasoning as contact).
    await this.cvService.requestAccess(dto);
    return { received: true };
  }

  @Get("access/:token")
  @SuccessMessage("CV retrieved successfully.")
  getAccess(@Param("token") token: string) {
    return this.cvService.redeemToken(token);
  }
}
