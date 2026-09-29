import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { NotFoundException } from "../../common/exceptions/exceptions.js";
import { PagesService } from "./pages.service.js";

@ApiTags("Pages")
@Controller("pages")
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get(":slug")
  @ApiOperation({ summary: "Singleton content page (now/uses/credentials)" })
  @SuccessMessage("Page retrieved successfully.")
  async findOne(@Param("slug") slug: string) {
    const page = await this.pagesService.getPage(slug);
    if (!page) throw new NotFoundException(`Page "${slug}" not found.`);
    return page;
  }
}
