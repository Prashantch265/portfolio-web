import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { AuthException } from "../../common/exceptions/exceptions.js";
import { AdminAuthService } from "./admin-auth.service.js";
import type { RequestWithAdmin } from "./types.js";

/**
 * Re-fetches the admin row on every request rather than trusting the
 * session payload alone — buys instant revocation (nestjs-craft's
 * per-request identity lookup convention): if the admin row is ever
 * deleted, their very next request fails instead of waiting out
 * whatever the session's remaining TTL happens to be. Trivial cost at
 * this app's traffic (a single admin), so there's no lookup-caching
 * tradeoff worth making yet.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const adminId = req.session?.adminId;
    if (!adminId) throw new AuthException("Authentication required.");

    const admin = await this.adminAuthService.getAdminById(adminId);
    if (!admin) {
      req.session.destroy(() => undefined);
      throw new AuthException("Session is no longer valid.");
    }

    req.admin = { id: admin.id, email: admin.email };
    return true;
  }
}
