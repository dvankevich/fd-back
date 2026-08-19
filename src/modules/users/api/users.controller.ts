import fs from "fs/promises";
import type { ParamsDictionary } from "express-serve-static-core";
import { BadRequestError } from "../../../core/exceptions/errors.ts";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { AuthenticatedHandler } from "../../auth/index.ts";
import type { AvatarService } from "../application/avatar.service.ts";
import type { FollowsService } from "../application/follows.service.ts";
import type { UsersService } from "../application/users.service.ts";
import type {
  AvatarView,
  CurrentUserView,
  MessageView,
  PublicUserView,
  UsersListView,
} from "../domain/user.view.ts";
import { USERS_MESSAGE } from "../domain/users.messages.ts";
import type { UserIdParam } from "./input-dto/user-id.param.input-dto.ts";

type UsersControllerOptions = {
  users: UsersService;
  follows: FollowsService;
  avatars: AvatarService;
};

export class UsersController {
  private readonly users: UsersService;
  private readonly follows: FollowsService;
  private readonly avatars: AvatarService;

  constructor({ users, follows, avatars }: UsersControllerOptions) {
    this.users = users;
    this.follows = follows;
    this.avatars = avatars;
  }

  getCurrent: AuthenticatedHandler<ParamsDictionary, CurrentUserView> = async (req, res) => {
    res.status(HTTP_STATUS.ok).json(await this.users.getCurrent(req.user.sub));
  };

  getById: AuthenticatedHandler<UserIdParam, PublicUserView> = async (req, res) => {
    res.status(HTTP_STATUS.ok).json(await this.users.getPublic(req.params.id));
  };

  updateAvatar: AuthenticatedHandler<ParamsDictionary, AvatarView> = async (req, res) => {
    const { file } = req;

    if (!file) {
      throw new BadRequestError(USERS_MESSAGE.avatarRequired);
    }

    try {
      res.status(HTTP_STATUS.ok).json(await this.avatars.update({ userId: req.user.sub, filePath: file.path }));
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  };

  getFollowers: AuthenticatedHandler<UserIdParam, UsersListView> = async (req, res) => {
    res.status(HTTP_STATUS.ok).json(await this.follows.listFollowers(req.params.id));
  };

  getFollowing: AuthenticatedHandler<ParamsDictionary, UsersListView> = async (req, res) => {
    res.status(HTTP_STATUS.ok).json(await this.follows.listFollowing(req.user.sub));
  };

  follow: AuthenticatedHandler<UserIdParam, MessageView> = async (req, res) => {
    await this.follows.follow({ followerId: req.user.sub, followingId: req.params.id });

    res.status(HTTP_STATUS.created).json({ message: USERS_MESSAGE.followed });
  };

  unfollow: AuthenticatedHandler<UserIdParam, void> = async (req, res) => {
    await this.follows.unfollow({ followerId: req.user.sub, followingId: req.params.id });

    res.status(HTTP_STATUS.noContent).end();
  };
}
