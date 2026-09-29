import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SuccessMessage } from "../../common/decorators/success-message.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { AdminAuthGuard } from "./admin-auth.guard.js";
import { AdminAuthService } from "./admin-auth.service.js";
import { loginDtoSchema, type LoginDto } from "./dto/login.dto.js";
import { verifyTotpDtoSchema, type VerifyTotpDto } from "./dto/verify-totp.dto.js";
import type { RequestWithAdmin } from "./types.js";

// Excluded from public Swagger — an admin-only surface documenting its
// own attack surface in a public OpenAPI doc gains an attacker more
// than it helps anyone else (backend PRD §13's own reasoning for
// gating Swagger to non-production in the first place).
@ApiExcludeController()
@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @SuccessMessage("TOTP verification required.")
  login(@Body(new ZodValidationPipe(loginDtoSchema)) dto: LoginDto, @Req() req: RequestWithAdmin) {
    return this.adminAuthService.login(dto, req.ip ?? "unknown");
  }

  @Post("totp")
  @HttpCode(HttpStatus.OK)
  @SuccessMessage("Login successful.")
  async verifyTotp(@Body(new ZodValidationPipe(verifyTotpDtoSchema)) dto: VerifyTotpDto, @Req() req: RequestWithAdmin) {
    const { adminId, email } = await this.adminAuthService.verifyTotp(dto, req.ip ?? "unknown");

    // Regenerate the session id BEFORE writing adminId into it — a
    // session-fixation guard. Anything an attacker got a victim to
    // carry into this request (a pre-set, attacker-known session id)
    // is discarded here rather than being upgraded to an authenticated one.
    //
    // Explicit save(), not left to express-session's implicit
    // save-on-res.end: a rare CI flake (a follow-up request racing
    // ahead of the session actually reaching Redis, seen as a spurious
    // 401 on the very next request) traced back to relying on that
    // implicit timing — see GOTCHA.md.
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err instanceof Error ? err : new Error(String(err)));
        req.session.adminId = adminId;
        req.session.save((saveErr) => {
          if (saveErr) return reject(saveErr instanceof Error ? saveErr : new Error(String(saveErr)));
          resolve();
        });
      });
    });

    return { email };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @SuccessMessage("Logged out.")
  async logout(@Req() req: RequestWithAdmin) {
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    return { loggedOut: true };
  }

  @Get("me")
  @UseGuards(AdminAuthGuard)
  @SuccessMessage("Current admin retrieved.")
  me(@Req() req: RequestWithAdmin) {
    return { email: req.admin.email };
  }
}
