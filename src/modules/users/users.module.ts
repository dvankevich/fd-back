import type { RequestHandler } from "express";
import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import { authModule } from "../auth/index.ts";
import { mediaModule } from "../media/index.ts";
import type { ImageStorage } from "../media/index.ts";
import { recipesModule } from "../recipes/index.ts";
import type { RecipesService } from "../recipes/application/recipes.service.ts";
import { UsersController } from "./api/users.controller.ts";
import { createUsersRouter } from "./api/users.routes.ts";
import { AvatarService } from "./application/avatar.service.ts";
import { FollowsService } from "./application/follows.service.ts";
import { UsersService } from "./application/users.service.ts";
import { PrismaFollowsRepository } from "./infrastructure/follows.repository.ts";
import { PrismaUsersRepository } from "./infrastructure/users.repository.ts";
import "./api/users.openapi.ts";

export type UsersModule = ApiModule & {
  service: UsersService;
  follows: FollowsService;
  avatars: AvatarService;
};

type UsersModuleOptions = {
  client?: PrismaClient;
  images?: ImageStorage;
  authenticate?: RequestHandler;
  recipes?: RecipesService;
};

export const createUsersModule = ({
  client = prisma,
  images = mediaModule.imageStorage,
  authenticate = authModule.authenticate,
  recipes = recipesModule.service,
}: UsersModuleOptions = {}): UsersModule => {
  const usersRepo = new PrismaUsersRepository(client);
  const service = new UsersService(usersRepo);
  const follows = new FollowsService({
    follows: new PrismaFollowsRepository(client),
    users: usersRepo,
  });
  const avatars = new AvatarService({ users: usersRepo, images });

  return {
    path: `${API_PREFIX}/users`,
    router: createUsersRouter({
      controller: new UsersController({
        users: service,
        usersRepo,
        follows,
        avatars,
        recipes,
      }),
      authenticate,
    }),
    service,
    follows,
    avatars,
  };
};

export const usersModule = createUsersModule();
