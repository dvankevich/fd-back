export const AUTH_RATE_LIMIT = {
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 хв
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
} as const;

// Якщо захочеш окремі ліміти пізніше
export const LOGIN_RATE_LIMIT = {
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5, // жорсткіше для login
} as const;