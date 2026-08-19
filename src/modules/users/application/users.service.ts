import { NotFoundError, UnauthorizedError } from "../../../core/exceptions/errors.ts";
import { toCurrentUserView, toPublicUserView } from "../domain/user.mapper.ts";
import type { CurrentUserView, PublicUserView } from "../domain/user.view.ts";
import { USERS_MESSAGE } from "../domain/users.messages.ts";
import type { UsersRepository } from "../domain/users.port.ts";

export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getCurrent(userId: string): Promise<CurrentUserView> {
    const user = await this.users.findCurrent(userId);

    if (!user) {
      throw new UnauthorizedError(USERS_MESSAGE.currentUserGone);
    }

    return toCurrentUserView(user);
  }

  async getPublic(userId: string): Promise<PublicUserView> {
    const user = await this.users.findPublic(userId);

    if (!user) {
      throw new NotFoundError(USERS_MESSAGE.userNotFound);
    }

    return toPublicUserView(user);
  }
}
