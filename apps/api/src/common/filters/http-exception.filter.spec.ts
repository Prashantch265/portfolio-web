import { describe, expect, it, vi } from "vitest";
import type { ArgumentsHost } from "@nestjs/common";
import { AllExceptionsFilter } from "./http-exception.filter.js";
import { NotFoundException, ValidationException } from "../exceptions/exceptions.js";

function makeHost(requestId = "req-123") {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status };
  const req = { headers: { "x-request-id": requestId } };

  const host = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe("AllExceptionsFilter", () => {
  it("reuses the request's x-request-id as correlationId, not a fresh one", () => {
    const filter = new AllExceptionsFilter();
    const { host, json } = makeHost("the-shared-id");

    filter.catch(new NotFoundException("Project not found."), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ correlationId: "the-shared-id" }));
  });

  it("passes a domain exception's source through to the response", () => {
    const filter = new AllExceptionsFilter();
    const { host, json, status } = makeHost();

    filter.catch(new ValidationException("Validation failed", { email: ["must be valid"] }), host);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Validation failed",
        source: { email: ["must be valid"] },
      }),
    );
  });

  it("never leaks a raw Error's message for an unrecognized exception", () => {
    const filter = new AllExceptionsFilter();
    const { host, json, status } = makeHost();

    filter.catch(new Error("password=hunter2 leaked from a driver"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Internal server error." }),
    );
    const body = json.mock.calls[0]?.[0];
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });
});
