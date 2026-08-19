import type { Optional } from "../types/common.ts";

const BEARER_HEADER = /^Bearer\s+(\S+)$/i;

export const extractBearerToken = (authorization: Optional<string>): Optional<string> =>
  BEARER_HEADER.exec(authorization?.trim() ?? "")?.[1];
