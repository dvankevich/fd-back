import type { Clock } from "../types/common.ts";

export const systemClock: Clock = () => new Date();
