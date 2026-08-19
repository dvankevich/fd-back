import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app.ts";
import prisma from "../../src/core/database/prisma.client.ts";
import { cleanAuthTables, registerSession, type Session } from "./helpers/auth.ts";

const owner = { email: "recipes_owner@example.com", password: "securepass123", name: "Recipe Owner" };
const stranger = { email: "recipes_other@example.com", password: "securepass123", name: "Stranger" };

const seed = {
  category: { id: "test-recipe-cat", name: "Test Dessert" },
  area: { id: "test-recipe-area", name: "Test British" },
  ingredient: { id: "test-recipe-ing", name: "Test Butter", description: null, img: null },
  recipeIds: ["test-recipe-1", "test-recipe-2"],
};

const authorized = (session: Session) => ({ Authorization: `Bearer ${session.accessToken}` });

const testRecipes = { id: { startsWith: "test-recipe" } } as const;

const removeSeed = async () => {
  await prisma.favorite.deleteMany({ where: { recipe: testRecipes } });
  await prisma.recipeIngredient.deleteMany({ where: { recipe: testRecipes } });
  await prisma.recipe.deleteMany({ where: testRecipes });
  await prisma.ingredient.deleteMany({ where: { id: seed.ingredient.id } });
  await prisma.category.deleteMany({ where: { id: seed.category.id } });
  await prisma.area.deleteMany({ where: { id: seed.area.id } });
};

describe("Recipes API (integration)", () => {
  let ownerSession: Session;
  let strangerSession: Session;

  beforeAll(async () => {
    await removeSeed();
    await cleanAuthTables();

    ownerSession = await registerSession(owner);
    strangerSession = await registerSession(stranger);

    await prisma.category.create({ data: seed.category });
    await prisma.area.create({ data: seed.area });
    await prisma.ingredient.create({ data: seed.ingredient });

    await prisma.recipe.create({
      data: {
        id: seed.recipeIds[0],
        title: "Test Battenberg",
        instructions: "Heat the oven and wait",
        description: "A test cake",
        time: "60",
        thumb: "https://example.com/thumb.jpg",
        preview: "https://example.com/preview.jpg",
        ownerId: ownerSession.user.id,
        categoryId: seed.category.id,
        areaId: seed.area.id,
        ingredients: { create: [{ ingredientId: seed.ingredient.id, measure: "175g" }] },
      },
    });

    await prisma.recipe.create({
      data: {
        id: seed.recipeIds[1],
        title: "Test Stranger Pie",
        instructions: "Mix and bake it",
        thumb: "https://example.com/pie.jpg",
        preview: "https://example.com/pie.jpg",
        ownerId: strangerSession.user.id,
        categoryId: seed.category.id,
        areaId: seed.area.id,
      },
    });
  });

  afterAll(async () => {
    await removeSeed();
    await cleanAuthTables();
    await prisma.$disconnect();
  });

  describe("GET /api/recipes", () => {
    it("should return a page with the total in the body and the header", async () => {
      const res = await request(app)
        .get("/api/recipes")
        .query({ category: seed.category.name, page: 1, limit: 10 })
        .expect(200);

      expect(res.headers["x-total-count"]).toBe(String(res.body.total));
      expect(res.body).toMatchObject({ page: 1, limit: 10, total: 2 });
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toMatchObject({
        category: { id: seed.category.id, name: seed.category.name },
        area: { id: seed.area.id, name: seed.area.name },
        owner: { id: expect.any(String), name: expect.any(String) },
      });
    });

    it("should match a category name regardless of case", async () => {
      const res = await request(app)
        .get("/api/recipes")
        .query({ category: seed.category.name.toLowerCase() })
        .expect(200);

      expect(res.body.total).toBe(2);
    });

    it("should filter by ingredient id", async () => {
      const res = await request(app)
        .get("/api/recipes")
        .query({ ingredient: seed.ingredient.id })
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(seed.recipeIds[0]);
    });

    it("should reject a limit above the maximum", async () => {
      await request(app).get("/api/recipes").query({ limit: 500 }).expect(400);
    });
  });

  describe("GET /api/recipes/popular", () => {
    it("should return recipes with their favorites count", async () => {
      const res = await request(app).get("/api/recipes/popular").expect(200);

      expect(res.body.data[0]).toHaveProperty("_count.favorites");
    });
  });

  describe("GET /api/recipes/{id}", () => {
    it("should return the recipe with flattened ingredients", async () => {
      const res = await request(app).get(`/api/recipes/${seed.recipeIds[0]}`).expect(200);

      expect(res.body).toMatchObject({
        id: seed.recipeIds[0],
        instructions: "Heat the oven and wait",
        ingredients: [
          { id: seed.ingredient.id, name: seed.ingredient.name, measure: "175g", img: null },
        ],
      });
    });

    it("should answer 404 for an unknown recipe", async () => {
      await request(app).get("/api/recipes/ghost").expect(404, { error: "Recipe not found" });
    });
  });

  describe("GET /api/recipes/own", () => {
    it("should return only the recipes of the caller", async () => {
      const res = await request(app)
        .get("/api/recipes/own")
        .set(authorized(ownerSession))
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(seed.recipeIds[0]);
    });

    it("should refuse a guest", async () => {
      await request(app).get("/api/recipes/own").expect(401);
    });
  });

  describe("favorites", () => {
    it("should add, list, refuse a duplicate and remove", async () => {
      await request(app)
        .post(`/api/recipes/${seed.recipeIds[1]}/favorite`)
        .set(authorized(ownerSession))
        .expect(201, { message: "Added to favorites" });

      await request(app)
        .post(`/api/recipes/${seed.recipeIds[1]}/favorite`)
        .set(authorized(ownerSession))
        .expect(409, { error: "Recipe already in favorites" });

      const list = await request(app)
        .get("/api/recipes/favorites")
        .set(authorized(ownerSession))
        .expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.data[0].id).toBe(seed.recipeIds[1]);

      await request(app)
        .delete(`/api/recipes/${seed.recipeIds[1]}/favorite`)
        .set(authorized(ownerSession))
        .expect(204);

      await request(app)
        .delete(`/api/recipes/${seed.recipeIds[1]}/favorite`)
        .set(authorized(ownerSession))
        .expect(404, { error: "Recipe not found in favorites" });
    });

    it("should answer 404 when favoriting an unknown recipe", async () => {
      await request(app)
        .post("/api/recipes/ghost/favorite")
        .set(authorized(ownerSession))
        .expect(404, { error: "Recipe not found" });
    });
  });

  describe("POST /api/recipes", () => {
    it("should refuse a guest", async () => {
      await request(app).post("/api/recipes").expect(401);
    });

    it("should refuse a request without an image", async () => {
      await request(app)
        .post("/api/recipes")
        .set(authorized(ownerSession))
        .field("title", "No image cake")
        .expect(400, { error: "Recipe image (thumb) is required" });
    });
  });

  describe("DELETE /api/recipes/{id}", () => {
    it("should answer 404 for an unknown recipe", async () => {
      await request(app)
        .delete("/api/recipes/ghost")
        .set(authorized(ownerSession))
        .expect(404, { error: "Recipe not found" });
    });

    it("should refuse to delete a recipe of another user", async () => {
      await request(app)
        .delete(`/api/recipes/${seed.recipeIds[1]}`)
        .set(authorized(ownerSession))
        .expect(403, { error: "You can delete only your own recipes" });
    });

    it("should delete an own recipe", async () => {
      const created = await prisma.recipe.create({
        data: {
          id: "test-recipe-3",
          title: "Test Removable",
          instructions: "Nothing to do here",
          thumb: "https://example.com/x.jpg",
          preview: "https://example.com/x.jpg",
          ownerId: ownerSession.user.id,
          categoryId: seed.category.id,
          areaId: seed.area.id,
        },
      });

      await request(app)
        .delete(`/api/recipes/${created.id}`)
        .set(authorized(ownerSession))
        .expect(204);

      await expect(prisma.recipe.findUnique({ where: { id: created.id } })).resolves.toBeNull();
    });
  });
});
