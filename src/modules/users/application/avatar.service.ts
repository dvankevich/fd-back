import { AppError, InternalServerError, UnauthorizedError } from "../../../core/exceptions/errors.ts";
import logger from "../../../core/logger.ts";
import type { ImageStorage } from "../../media/index.ts";
import type { AvatarView } from "../domain/user.view.ts";
import { USERS_MESSAGE } from "../domain/users.messages.ts";
import type { UsersRepository } from "../domain/users.port.ts";

export const AVATAR_UPLOAD = {
  folder: "foodies/avatars",
  publicIdPrefix: "user_",
  transformation: { width: 400, height: 400, crop: "fill", gravity: "face" },
} as const;

type AvatarServiceOptions = { users: UsersRepository; images: ImageStorage };

type UpdateAvatarInput = { userId: string; filePath: string };

export class AvatarService {
  private readonly users: UsersRepository;
  private readonly images: ImageStorage;

  constructor({ users, images }: AvatarServiceOptions) {
    this.users = users;
    this.images = images;
  }

  async update({ userId, filePath }: UpdateAvatarInput): Promise<AvatarView> {
    if (!(await this.users.exists(userId))) {
      throw new UnauthorizedError(USERS_MESSAGE.currentUserGone);
    }

    const uploaded = await this.images
      .upload({
        path: filePath,
        folder: AVATAR_UPLOAD.folder,
        publicId: `${AVATAR_UPLOAD.publicIdPrefix}${userId}`,
        overwrite: true,
        transformation: AVATAR_UPLOAD.transformation,
      })
      .catch((err: unknown) => {
        throw this.uploadFailed({ err, userId });
      });

    const avatar = (await this.users.updateAvatar({ userId, avatar: uploaded.url })) ?? uploaded.url;

    logger.info({ userId }, "Avatar updated");

    return { avatar };
  }

  private uploadFailed({ err, userId }: { err: unknown; userId: string }): unknown {
    if (err instanceof AppError) {
      return err;
    }
    logger.error({ err, userId }, USERS_MESSAGE.avatarUploadFailed);
    return new InternalServerError(USERS_MESSAGE.avatarUploadFailed);
  }
}
