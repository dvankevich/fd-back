import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../app.ts";
import prisma from "../../prisma/client.ts";

describe("Areas API (integration)", () => {
  const testAreas = [
    { id: "test-area-1", name: "Test Ukrainian" },
    { id: "test-area-2", name: "Test Italian" },
    { id: "test-area-3", name: "Test Moroccan" },
  ];

  beforeAll(async () => {
    await prisma.area.deleteMany({
      where: {
        id: { in: testAreas.map((a) => a.id) },
      },
    });

    await prisma.area.createMany({
      data: testAreas,
    });
  });

  afterAll(async () => {
    await prisma.area.deleteMany({
      where: {
        id: { in: testAreas.map((a) => a.id) },
      },
    });
    await prisma.$disconnect();
  });

  describe("GET /api/areas", () => {
    it("should return list of areas", async () => {
      const res = await request(app).get("/api/areas").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      const names = res.body.map((a: { name: string }) => a.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "Test Ukrainian",
          "Test Italian",
          "Test Moroccan",
        ]),
      );
    });

    it("should return areas with correct shape", async () => {
      const res = await request(app).get("/api/areas").expect(200);

      for (const area of res.body) {
        expect(area).toHaveProperty("id");
        expect(area).toHaveProperty("name");
        expect(typeof area.id).toBe("string");
        expect(typeof area.name).toBe("string");
      }
    });

    it("should return areas sorted by name ascending", async () => {
      const res = await request(app).get("/api/areas").expect(200);

      const names = res.body.map((a: { name: string }) => a.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
    });
  });
});
