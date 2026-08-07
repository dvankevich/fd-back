import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  UserSchema,
} from "../../src/validators/auth.validator.ts";

describe("RegisterSchema", () => {
  const validData = {
    username: "user01",
    email: "user01@example.com",
    password: "securepass123",
    name: "FirstName LastName",
  };

  it("should accept valid data", () => {
    const result = RegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject username shorter than 3 characters", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      username: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("should reject username longer than 30 characters", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      username: "a".repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it("should reject username with invalid characters", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      username: "user-01!",
    });
    expect(result.success).toBe(false);
  });

  it("should accept username with underscores and numbers", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      username: "user_01",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      email: "not-an-email",
    });
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

  it("should reject name longer than 100 characters", () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing required fields", () => {
    const result = RegisterSchema.safeParse({
      username: "user01",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  const validData = {
    username: "user01",
    password: "securepass123",
  };

  it("should accept valid data", () => {
    const result = LoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject missing username", () => {
    const result = LoginSchema.safeParse({
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing password", () => {
    const result = LoginSchema.safeParse({
      username: "user01",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty username", () => {
    const result = LoginSchema.safeParse({
      username: "",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const result = LoginSchema.safeParse({
      username: "user01",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("UserSchema", () => {
  const validData = {
    id: 1,
    username: "user01",
    email: "user01@example.com",
    name: "FirstName LastName",
    createdAt: "2025-01-10T12:00:00.000Z",
  };

  it("should accept valid data", () => {
    const result = UserSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject non-positive id", () => {
    const result = UserSchema.safeParse({
      ...validData,
      id: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = UserSchema.safeParse({
      ...validData,
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid datetime", () => {
    const result = UserSchema.safeParse({
      ...validData,
      createdAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing fields", () => {
    const result = UserSchema.safeParse({
      id: 1,
      username: "user01",
    });
    expect(result.success).toBe(false);
  });
});
