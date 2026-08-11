import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../app.ts";
import prisma from "../../prisma/client.ts";

describe("Categories API (integration)", () => {
  const testCategories = [
    { id: "test-cat-1", name: "Test Seafood" },
    { id: "test-cat-2", name: "Test Lamb" },
    { id: "test-cat-3", name: "Test Starter" },
  ];

  beforeAll(async () => {
    // Очищаємо і додаємо тестові дані
    await prisma.category.deleteMany({
      where: {
        id: { in: testCategories.map((c) => c.id) },
      },
    });

    await prisma.category.createMany({
      data: testCategories,
    });
  });

  afterAll(async () => {
    await prisma.category.deleteMany({
      where: {
        id: { in: testCategories.map((c) => c.id) },
      },
    });
    await prisma.$disconnect();
  });

  describe("GET /api/categories", () => {
    it("should return list of categories", async () => {
      const res = await request(app).get("/api/categories").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      // Перевіряємо, що наші тестові категорії присутні
      const names = res.body.map((c: { name: string }) => c.name);
      expect(names).toEqual(
        expect.arrayContaining(["Test Seafood", "Test Lamb", "Test Starter"]),
      );
    });

    it("should return categories with correct shape", async () => {
      const res = await request(app).get("/api/categories").expect(200);

      for (const category of res.body) {
        expect(category).toHaveProperty("id");
        expect(category).toHaveProperty("name");
        expect(typeof category.id).toBe("string");
        expect(typeof category.name).toBe("string");
      }
    });

    it("should return categories sorted by name ascending", async () => {
      const res = await request(app).get("/api/categories").expect(200);

      const names = res.body.map((c: { name: string }) => c.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
    });
  });
});
