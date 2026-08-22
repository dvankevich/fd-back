import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { AuthenticatedRequest } from "../../auth/api/authenticated-request.ts";
import type { RecipesService } from "../../recipes/application/recipes.service.ts";
import type { UsersRepository } from "../domain/users.port.ts";
import { UsersController } from "./users.controller.ts";

const page = { page: 1, limit: 10 };

const makeRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    locals: { query: page },
  };
  return res as unknown as Response & typeof res;
};

const makeReq = (ownerId: string, viewerId = "viewer-1"): AuthenticatedRequest =>
  ({
    params: { id: ownerId },
    user: { sub: viewerId },
  }) as unknown as AuthenticatedRequest;

describe("UsersController.listRecipes", () => {
  it("should answer 404 when the profile user does not exist", async () => {
    const usersRepo = {
      exists: vi.fn(async () => false),
    };
    const recipes = {
      listByOwner: vi.fn(),
    };

    const controller = new UsersController({
      users: {} as never,
      usersRepo: usersRepo as unknown as UsersRepository,
      follows: {} as never,
      avatars: {} as never,
      recipes: recipes as unknown as RecipesService,
    });

    await expect(controller.listRecipes(makeReq("ghost"), makeRes())).rejects.toMatchObject({
      status: 404,
      message: "User not found",
    });

    expect(usersRepo.exists).toHaveBeenCalledWith("ghost");
    expect(recipes.listByOwner).not.toHaveBeenCalled();
  });

  it("should list recipes of an existing user for the viewer", async () => {
    const usersRepo = {
      exists: vi.fn(async () => true),
    };
    const payload = {
      data: [{ id: "recipe-1", isFavorite: true }],
      total: 1,
      page: 1,
      limit: 10,
    };
    const recipes = {
      listByOwner: vi.fn(async () => payload),
    };

    const controller = new UsersController({
      users: {} as never,
      usersRepo: usersRepo as unknown as UsersRepository,
      follows: {} as never,
      avatars: {} as never,
      recipes: recipes as unknown as RecipesService,
    });

    const res = makeRes();
    await controller.listRecipes(makeReq("owner-2", "viewer-9"), res);

    expect(usersRepo.exists).toHaveBeenCalledWith("owner-2");
    expect(recipes.listByOwner).toHaveBeenCalledWith({
      ownerId: "owner-2",
      page,
      viewerId: "viewer-9",
    });
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.ok);
    expect(res.json).toHaveBeenCalledWith(payload);
  });
});
