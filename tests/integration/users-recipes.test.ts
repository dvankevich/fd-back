import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.ts";
import prisma from "../../src/core/database/prisma.client.ts";

const password = "securepass123";

const userA = {
  email: "owner-a@example.com",
  password,
  name: "Owner A",
};

const userB = {
  email: "viewer-b@example.com",
  password,
  name: "Viewer B",
};

async function cleanDatabase() {
  await prisma.favorite.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

async function register(user: typeof userA) {
  const res = await request(app).post("/api/auth/register").send(user).expect(201);
  return {
    accessToken: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

async function ensureCategoryAndArea() {
  await prisma.category.upsert({
    where: { id: "test-cat" },
    update: {},
    create: { id: "test-cat", name: "Dessert" },
  });
  await prisma.area.upsert({
    where: { id: "test-area" },
    update: {},
    create: { id: "test-area", name: "British" },
  });
}

async function createRecipe(ownerId: string, title = "Test Cake") {
  return prisma.recipe.create({
    data: {
      title,
      instructions: "Mix and bake for thirty minutes at least.",
      ownerId,
      categoryId: "test-cat",
      areaId: "test-area",
    },
  });
}

describe("GET /api/users/:id/recipes (integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
    await ensureCategoryAndArea();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("should answer 401 without access token", async () => {
    const { userId } = await register(userA);

    await request(app).get(`/api/users/${userId}/recipes`).expect(401);
  });

  it("should answer 404 when the profile user does not exist", async () => {
    const { accessToken } = await register(userB);

    const res = await request(app)
      .get("/api/users/clxxxxxxxxxxxxxxxxxxxxxxxx/recipes")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);

    expect(res.body).toMatchObject({ error: "User not found" });
  });

  it("should return empty page when user has no recipes", async () => {
    const owner = await register(userA);
    const viewer = await register(userB);

    const res = await request(app)
      .get(`/api/users/${owner.userId}/recipes`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  it("should list another user's recipes with isFavorite for the viewer", async () => {
    const owner = await register(userA);
    const viewer = await register(userB);

    const recipeFav = await createRecipe(owner.userId, "Favorite Cake");
    const recipeOther = await createRecipe(owner.userId, "Plain Cake");

    await prisma.favorite.create({
      data: { userId: viewer.userId, recipeId: recipeFav.id },
    });

    const res = await request(app)
      .get(`/api/users/${owner.userId}/recipes?page=1&limit=10`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .expect(200);

    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.data).toHaveLength(2);

    const byId = Object.fromEntries(
      res.body.data.map((r: { id: string; isFavorite: boolean; title: string }) => [r.id, r]),
    );

    expect(byId[recipeFav.id]).toMatchObject({
      title: "Favorite Cake",
      isFavorite: true,
    });
    expect(byId[recipeOther.id]).toMatchObject({
      title: "Plain Cake",
      isFavorite: false,
    });
  });

  it("should not mark isFavorite from the owner's favorites", async () => {
    const owner = await register(userA);
    const viewer = await register(userB);

    const recipe = await createRecipe(owner.userId, "Only Owner Liked");

    // улюблений лише власнику, не глядачу
    await prisma.favorite.create({
      data: { userId: owner.userId, recipeId: recipe.id },
    });

    const res = await request(app)
      .get(`/api/users/${owner.userId}/recipes`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .expect(200);

    expect(res.body.data).toEqual([
      expect.objectContaining({ id: recipe.id, isFavorite: false }),
    ]);
  });
});
