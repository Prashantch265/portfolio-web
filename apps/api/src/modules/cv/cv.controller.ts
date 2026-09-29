import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { CvService } from "./cv.service.js";

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
}
