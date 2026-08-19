import { describe, it, expect } from "vitest";
import { AUTH_LIMITS } from "../../domain/auth.limits.ts";
import { LoginSchema } from "./login.input-dto.ts";
import { RefreshTokenBodySchema } from "./refresh-token.input-dto.ts";
import { RegisterSchema } from "./register.input-dto.ts";

describe("RegisterSchema", () => {
  const validData = {
    email: "user01@example.com",
    password: "securepass123",
    name: "FirstName LastName",
  };

  it("should accept valid data", () => {
    const result = RegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an email longer than the limit", () => {
    const localPart = "a".repeat(AUTH_LIMITS.emailMaxLength);
    const result = RegisterSchema.safeParse({ ...validData, email: `${localPart}@example.com` });
    expect(result.success).toBe(false);
  });

  it("should reject password shorter than 8 characters", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name longer than the limit", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      name: "a".repeat(AUTH_LIMITS.nameMaxLength + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing required fields", () => {
    const result = RegisterSchema.safeParse({
      email: "user01@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("should lowercase and trim the email", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      email: "  User01@Example.COM ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("user01@example.com");
  });

  it("should trim the name and reject a whitespace-only name", () => {
    const trimmed = RegisterSchema.safeParse({ ...validData, name: "  Olena  " });
    expect(trimmed.success).toBe(true);
    expect(trimmed.data?.name).toBe("Olena");

    const blank = RegisterSchema.safeParse({ ...validData, name: "   " });
    expect(blank.success).toBe(false);
  });

  it("should reject a password longer than the bcrypt byte limit", () => {
    const tooLong = RegisterSchema.safeParse({
      ...validData,
      password: "a".repeat(AUTH_LIMITS.passwordMaxBytes + 1),
    });
    expect(tooLong.success).toBe(false);

    const multibyte = RegisterSchema.safeParse({
      ...validData,
      password: "я".repeat(AUTH_LIMITS.passwordMaxBytes / 2 + 1),
    });
    expect(multibyte.success).toBe(false);

    const atLimit = RegisterSchema.safeParse({
      ...validData,
      password: "a".repeat(AUTH_LIMITS.passwordMaxBytes),
    });
    expect(atLimit.success).toBe(true);
  });
});

describe("RefreshTokenBodySchema", () => {
  it("should accept an empty body", () => {
    const result = RefreshTokenBodySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.refreshToken).toBeUndefined();
  });

  it("should accept a refresh token string", () => {
    const result = RefreshTokenBodySchema.safeParse({ refreshToken: "abc" });
    expect(result.success).toBe(true);
    expect(result.data?.refreshToken).toBe("abc");
  });

  it("should reject a non-string or empty refresh token", () => {
    expect(RefreshTokenBodySchema.safeParse({ refreshToken: 5 }).success).toBe(false);
    expect(RefreshTokenBodySchema.safeParse({ refreshToken: "" }).success).toBe(false);
  });
});

describe("LoginSchema", () => {
  const validData = {
    email: "user01@example.com",
    password: "securepass123",
  };

  it("should accept valid data", () => {
    const result = LoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject missing email", () => {
    const result = LoginSchema.safeParse({
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing password", () => {
    const result = LoginSchema.safeParse({
      email: "user01@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("should lowercase and trim the email", () => {
    const result = LoginSchema.safeParse({
      email: " User01@Example.com ",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("user01@example.com");
  });

  it("should reject invalid email", () => {
    const result = LoginSchema.safeParse({
      email: "not-an-email",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const result = LoginSchema.safeParse({
      email: "user01@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
