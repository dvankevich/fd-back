import logger from "../../../core/logger.ts";
import type { DatabaseProbe } from "../domain/health.port.ts";

export type LivenessView = { status: "ok"; uptime: number };

export type ReadinessView = { status: "ready" | "not ready" };

export class HealthService {
  constructor(private readonly database: DatabaseProbe) {}

  liveness(): LivenessView {
    return { status: "ok", uptime: process.uptime() };
  }

  async readiness(): Promise<ReadinessView> {
    try {
      await this.database.ping();
      return { status: "ready" };
    } catch (err) {
      logger.warn({ err }, "Readiness check failed");
      return { status: "not ready" };
    }
  }
}
