import { describe, it, expect } from "vitest";
import { UserSchema } from "./user.view-dto.ts";

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
