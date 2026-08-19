import type { Router } from "express";

export const API_PREFIX = "/api";

export type ApiModule = { path: string; router: Router };
