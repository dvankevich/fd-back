import { z } from "zod";
import { TIME_MS } from "../constants/time.ts";

const envSchema = z.object({
  // --- Runtime ---
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  // --- Database ---
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      "DATABASE_URL must be a valid PostgreSQL connection string",
    ),

  // --- Auth ---
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),

  // --- CORS ---
  ALLOWED_ORIGINS: z.string().optional(), // "http://localhost:5173,https://example.com"

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * TIME_MS.minute),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

  // --- Cloudinary (поки опціонально) ---
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;

// Тип для зручності
export type Env = z.infer<typeof envSchema>;
