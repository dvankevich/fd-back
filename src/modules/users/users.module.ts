import type { RequestHandler } from "express";
import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import { authModule } from "../auth/index.ts";
import { mediaModule } from "../media/index.ts";
import type { ImageStorage } from "../media/index.ts";
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
};

export const createUsersModule = ({
  client = prisma,
  images = mediaModule.imageStorage,
  authenticate = authModule.authenticate,
}: UsersModuleOptions = {}): UsersModule => {
  const users = new PrismaUsersRepository(client);
  const service = new UsersService(users);
  const follows = new FollowsService({ follows: new PrismaFollowsRepository(client), users });
  const avatars = new AvatarService({ users, images });

  return {
    path: `${API_PREFIX}/users`,
    router: createUsersRouter({
      controller: new UsersController({ users: service, follows, avatars }),
      authenticate,
    }),
    service,
    follows,
    avatars,
  };
};

export const usersModule = createUsersModule();
