import { SetMetadata } from "@nestjs/common";

export const SKIP_ENVELOPE_KEY = "skip_envelope";

/**
 * Opts a controller/handler out of ResponseInterceptor's {success,message,data}
 * wrapping. Health/readiness routes need this: their body shape is a
 * contract shared with Traefik healthchecks and packages/types' Zod
 * schemas (backend PRD §12), not a business API response — wrapping it
 * would silently break both.
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
