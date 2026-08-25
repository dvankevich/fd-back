import type { Response } from "express";
import { NotFoundError, BadRequestError } from "../../../core/exceptions/errors.ts";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { PageRequest } from "../../../core/paginator.ts";
import type { AuthenticatedRequest } from "../../auth/api/authenticated-request.ts";
import type { RecipesService } from "../../recipes/application/recipes.service.ts";
import type { AvatarService } from "../application/avatar.service.ts";
import type { FollowsService } from "../application/follows.service.ts";
import type { UsersService } from "../application/users.service.ts";
import { USERS_MESSAGE } from "../domain/users.messages.ts";
import type { UsersRepository } from "../domain/users.port.ts";

type UsersControllerOptions = {
  users: UsersService;
  usersRepo: UsersRepository;
  follows: FollowsService;
  avatars: AvatarService;
  recipes: RecipesService;
};

export class UsersController {
  private readonly users: UsersService;
  private readonly usersRepo: UsersRepository;
  private readonly follows: FollowsService;
  private readonly avatars: AvatarService;
  private readonly recipes: RecipesService;

  constructor({ users, usersRepo, follows, avatars, recipes }: UsersControllerOptions) {
    this.users = users;
    this.usersRepo = usersRepo;
    this.follows = follows;
    this.avatars = avatars;
    this.recipes = recipes;
  }

  getCurrent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.users.getCurrent(req.user.sub));
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.users.getPublic(String(req.params.id)));
  };

  updateAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.file?.path) {
      throw new BadRequestError(USERS_MESSAGE.avatarRequired);
    }
    res.status(HTTP_STATUS.ok).json(
      await this.avatars.update({ userId: req.user.sub, filePath: req.file.path }),
    );
  };

  getFollowers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const profileId = String(req.params.id);
    const viewerId = req.user.sub;

    res.status(HTTP_STATUS.ok).json(
      await this.follows.listFollowers(profileId, viewerId),
    );
  };

  getFollowing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.follows.listFollowing(req.user.sub));
  };

  follow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await this.follows.follow({
      followerId: req.user.sub,
      followingId: String(req.params.id),
    });
    res.status(HTTP_STATUS.created).json({ message: USERS_MESSAGE.followed });
  };

  unfollow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await this.follows.unfollow({
      followerId: req.user.sub,
      followingId: String(req.params.id),
    });
    res.status(HTTP_STATUS.noContent).end();
  };

  listRecipes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const ownerId = String(req.params.id);
    const page = res.locals.query as PageRequest;
    const viewerId = req.user.sub;

    if (!(await this.usersRepo.exists(ownerId))) {
      throw new NotFoundError(USERS_MESSAGE.userNotFound);
    }

    const result = await this.recipes.listByOwner({
      ownerId,
      page,
      viewerId,
    });

    res.status(HTTP_STATUS.ok).json(result);
  };
}
