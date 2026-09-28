import type { Request } from "express";

export type RequestWithAdmin = Request & { admin: { id: string; email: string } };
