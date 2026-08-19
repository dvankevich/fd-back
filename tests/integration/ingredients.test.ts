import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.ts";
import prisma from "../../src/core/database/prisma.client.ts";

describe("Ingredients API (integration)", () => {
  const testIngredients = [
    {
      id: "test-ing-1",
      name: "Test Squid",
      description: "Test description for squid",
      img: "https://example.com/squid.png",
    },
    {
      id: "test-ing-2",
      name: "Test Cabbage",
      description: "Test description for cabbage",
      img: "https://example.com/cabbage.png",
    },
    {
      id: "test-ing-3",
      name: "Test Baking Powder",
      description: null,
      img: null,
    },
  ];

  beforeAll(async () => {
    await prisma.ingredient.deleteMany({
      where: {
        id: { in: testIngredients.map((i) => i.id) },
      },
    });

    await prisma.ingredient.createMany({
      data: testIngredients,
    });
  });

  afterAll(async () => {
    await prisma.ingredient.deleteMany({
      where: {
        id: { in: testIngredients.map((i) => i.id) },
      },
    });
    await prisma.$disconnect();
  });

  describe("GET /api/ingredients", () => {
    it("should return list of ingredients", async () => {
      const res = await request(app).get("/api/ingredients").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      const names = res.body.map((i: { name: string }) => i.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "Test Squid",
          "Test Cabbage",
          "Test Baking Powder",
        ]),
      );
    });

    it("should return ingredients with correct shape", async () => {
      const res = await request(app).get("/api/ingredients").expect(200);

      for (const ingredient of res.body) {
        expect(ingredient).toHaveProperty("id");
        expect(ingredient).toHaveProperty("name");
        expect(ingredient).toHaveProperty("description");
        expect(ingredient).toHaveProperty("img");
        expect(typeof ingredient.id).toBe("string");
        expect(typeof ingredient.name).toBe("string");
      }
    });

    it("should return ingredients sorted by name ascending", async () => {
      const res = await request(app).get("/api/ingredients").expect(200);

      const names = res.body.map((i: { name: string }) => i.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
    });

    it("should allow null description and img", async () => {
      const res = await request(app).get("/api/ingredients").expect(200);

      const bakingPowder = res.body.find(
        (i: { name: string }) => i.name === "Test Baking Powder",
      );

      expect(bakingPowder).toBeDefined();
      expect(bakingPowder.description).toBeNull();
      expect(bakingPowder.img).toBeNull();
    });
  });
});
