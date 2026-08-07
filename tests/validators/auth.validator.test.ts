import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  UserSchema,
} from "../../src/validators/auth.validator.ts";

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
      email: "user01@example.com",
    });
    expect(result.success).toBe(false);
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

describe("UserSchema", () => {
  const validData = {
    id: "64c8d958249fae54bae90bb9",
    name: "FirstName LastName",
    email: "user01@example.com",
    avatar: "https://res.cloudinary.com/demo/avatar.jpg",
    createdAt: "2025-01-10T12:00:00.000Z",
  };

  it("should accept valid data", () => {
    const result = UserSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should accept null avatar", () => {
    const result = UserSchema.safeParse({
      ...validData,
      avatar: null,
    });
    expect(result.success).toBe(true);
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
      id: "64c8d958249fae54bae90bb9",
      name: "FirstName LastName",
    });
    expect(result.success).toBe(false);
  });
});
