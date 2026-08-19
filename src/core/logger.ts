import pino from "pino";
import { env } from "../config/env.ts";

const isDev = env.NODE_ENV !== "production";

const logger = pino({
  level: isDev ? "debug" : "info",
  base: isDev ? undefined : { pid: undefined, hostname: undefined }, // remove pid, hostname

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers[\"set-cookie\"]",
      "res.headers[\"set-cookie\"]",
      "password",
      "token",
      "refreshToken",
      "accessToken",
    ],
    remove: true,
  },

  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
});

export default logger;
