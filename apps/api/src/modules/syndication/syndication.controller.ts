import { Controller, Get, Header } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SkipEnvelope } from "../../common/decorators/skip-envelope.decorator.js";
import { SyndicationService } from "./syndication.service.js";

/**
 * Raw XML, never the {success,message,data} envelope — @SkipEnvelope()
 * at the class level, same reasoning as HealthController. Excluded from
 * Swagger since these aren't JSON API responses at all.
 */
@SkipEnvelope()
@ApiExcludeController()
@Controller()
export class SyndicationController {
  constructor(private readonly syndicationService: SyndicationService) {}

  @Get("writing/feed.xml")
  @Header("Content-Type", "application/rss+xml; charset=utf-8")
  getWritingFeed(): Promise<string> {
    return this.syndicationService.buildWritingFeed();
  }

  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  getSitemap(): Promise<string> {
    return this.syndicationService.buildSitemap();
  }
}
