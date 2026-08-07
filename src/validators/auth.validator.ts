import { z } from "zod";
import { registry } from "../openapi.ts";

// ====================== Request schemas ======================

export const RegisterSchema = registry.register(
  "Register",
  z.object({
    email: z.email().openapi({ example: "user01@example.com" }),
    password: z.string().min(8).openapi({ example: "securepass123" }),
    name: z.string().min(1).max(100).openapi({ example: "FirstName LastName" }),
  }),
);

export const LoginSchema = registry.register(
  "Login",
  z.object({
    email: z.email().openapi({ example: "user01@example.com" }),
    password: z.string().min(1).openapi({ example: "securepass123" }),
  }),
);

// ====================== Response schemas ======================

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "FirstName LastName" }),
    email: z.email().openapi({ example: "user01@example.com" }),
    avatar: z.string().nullable().openapi({
      example: "https://res.cloudinary.com/.../avatar.jpg",
    }),
    createdAt: z
      .iso.datetime()
      .openapi({ example: "2025-01-10T12:00:00.000Z" }),
  }),
);

export const TokensSchema = registry.register(
  "Tokens",
  z.object({
    accessToken: z.string().openapi({
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjk5...",
    }),
    refreshToken: z.string().openapi({
      example:
        "b7a5d9c8a296022d69b264168629b27e7fa55ffe883d7b4653c9425fd1f3667b317637810c06ec7e",
    }),
  }),
);

export const AuthResponseSchema = registry.register(
  "AuthResponse",
  z.object({
    accessToken: z.string().openapi({
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjk5...",
    }),
    refreshToken: z.string().openapi({
      example:
        "b7a5d9c8a296022d69b264168629b27e7fa55ffe883d7b4653c9425fd1f3667b317637810c06ec7e",
    }),
    user: UserSchema.omit({ createdAt: true }),
  }),
);

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.string().openapi({ example: "Invalid credentials" }),
  }),
);

export const ValidationErrorSchema = registry.register(
  "ValidationError",
  z.object({
    error: z.string().openapi({ example: "Validation failed" }),
    details: z.record(z.string(), z.array(z.string())).openapi({
      example: {
        email: ["Invalid email address"],
        password: ["Too small: expected string to have >=8 characters"],
      },
    }),
  }),
);

// ====================== Types ======================

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;

// ====================== Paths ======================

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  description: "Creates a new user account and returns access + refresh tokens.",
  request: {
    body: {
      content: {
        "application/json": { schema: RegisterSchema },
      },
    },
  },
  responses: {
    201: {
      description: "User registered successfully",
      content: {
        "application/json": { schema: AuthResponseSchema },
      },
    },
    409: {
      description: "Email already taken",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    422: {
      description: "Validation error",
      content: {
        "application/json": { schema: ValidationErrorSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Auth"],
  summary: "Login user",
  description: "Authenticates user by email and returns access + refresh tokens.",
  request: {
    body: {
      content: {
        "application/json": { schema: LoginSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": { schema: AuthResponseSchema },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    422: {
      description: "Validation error",
      content: {
        "application/json": { schema: ValidationErrorSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh token pair",
  description:
    "Issues a new pair of tokens. Refresh token can be passed in the body or via httpOnly cookie.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            refreshToken: z.string().optional().openapi({
              example:
                "b7a5d9c8a296022d69b264168629b27e7fa55ffe883d7b4653c9425fd1f3667b317637810c06ec7e",
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tokens refreshed successfully",
      content: {
        "application/json": { schema: TokensSchema },
      },
    },
    401: {
      description: "Invalid or expired refresh token",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Auth"],
  summary: "Logout user",
  description:
    "Invalidates the refresh token (from body or cookie) and clears the cookie.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            refreshToken: z.string().optional().openapi({
              example:
                "b7a5d9c8a296022d69b264168629b27e7fa55ffe883d7b4653c9425fd1f3667b317637810c06ec7e",
            }),
          }),
        },
      },
    },
  },
  responses: {
    204: {
      description: "Logged out successfully",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get current user profile",
  description: "Returns the profile of the currently authenticated user.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: {
        "application/json": { schema: UserSchema },
      },
    },
    401: {
      description: "Authentication required or token invalid",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});
