import session from "express-session";
import RedisStore from "connect-redis";
import type Redis from "ioredis";
import type { RequestHandler } from "express";

const ADMIN_SESSION_MAX_AGE_MS = 30 * 60 * 1000; // sliding — renewed on every request via `rolling: true`

/**
 * Shared by main.ts's real bootstrap and test-support/create-test-app.ts
 * on purpose — two independently-maintained copies of session config
 * is exactly how a test suite ends up asserting against a pipeline the
 * real app doesn't actually run (or vice versa).
 */
export function createSessionMiddleware(redisClient: Redis, options: { secureCookie: boolean }): RequestHandler {
  return session({
    store: new RedisStore({ client: redisClient, prefix: "sess:" }),
    secret: process.env.SESSION_SECRET as string,
    name: "portfolio.admin.sid",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: options.secureCookie,
      sameSite: "strict",
      maxAge: ADMIN_SESSION_MAX_AGE_MS,
    },
  });
}
