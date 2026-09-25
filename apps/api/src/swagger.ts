import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

/**
 * Gated behind NODE_ENV (nestjs-craft api-contract.md: "an unauthenticated
 * /api-docs in production hands an attacker the full route/schema map of
 * the API for free"). Mounted at 'api/docs', not 'docs' — Traefik only
 * forwards PathPrefix('/api') to this service (backend PRD §2); anything
 * outside /api/* never reaches it.
 *
 * class-transformer/class-validator are installed solely as @nestjs/swagger
 * peer dependencies (its decorator machinery needs them present). They are
 * NOT this app's validation layer — that's Zod (backend PRD §3); nothing
 * here should start using class-validator decorators for real validation.
 */
export function setupSwagger(app: INestApplication): void {
  if (process.env.NODE_ENV === "production") return;

  const config = new DocumentBuilder()
    .setTitle("Portfolio API")
    .setDescription("Backend API — see docs/PRD-backend.md for the full contract")
    .setVersion("0.0.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);
}
