import { describe, expect, it } from "vitest";
import type { Nullable } from "../../../core/types/common.ts";
import type { CurrentUserRow, PublicUserRow, UsersRepository } from "../domain/users.port.ts";
import { UsersService } from "./users.service.ts";

const currentRow: CurrentUserRow = {
  id: "user-1",
  name: "Olena Kravets",
  email: "olena@example.com",
  avatar: null,
  _count: { recipes: 12, favorites: 5, followers: 34, following: 18 },
};

const publicRow: PublicUserRow = {
  id: "user-2",
  name: "Ivan Petrenko",
  email: "ivan@example.com",
  avatar: "https://example.com/avatar.jpg",
  _count: { recipes: 3, followers: 7 },
};

class FakeUsersRepository implements UsersRepository {
  constructor(private readonly rows: { current?: CurrentUserRow; public?: PublicUserRow } = {}) {}

  async findCurrent(): Promise<Nullable<CurrentUserRow>> {
    return this.rows.current ?? null;
  }

  async findPublic(): Promise<Nullable<PublicUserRow>> {
    return this.rows.public ?? null;
  }

  async exists(): Promise<boolean> {
    return true;
  }

  async updateAvatar(): Promise<Nullable<string>> {
    return null;
  }
}

describe("UsersService", () => {
  it("should map every count of the current user", async () => {
    const service = new UsersService(new FakeUsersRepository({ current: currentRow }));

    await expect(service.getCurrent("user-1")).resolves.toEqual({
      id: "user-1",
      name: "Olena Kravets",
      email: "olena@example.com",
      avatar: null,
      createdRecipesCount: 12,
      favoritesCount: 5,
      followersCount: 34,
      followingCount: 18,
    });
  });

  it("should answer 401 when the token belongs to a user that is gone", async () => {
    const service = new UsersService(new FakeUsersRepository());

    await expect(service.getCurrent("user-1")).rejects.toMatchObject({
      status: 401,
      message: "User not found",
    });
  });

  it("should expose only the public counts of another user", async () => {
    const service = new UsersService(new FakeUsersRepository({ public: publicRow }));

    await expect(service.getPublic("user-2")).resolves.toEqual({
      id: "user-2",
      name: "Ivan Petrenko",
      email: "ivan@example.com",
      avatar: "https://example.com/avatar.jpg",
      createdRecipesCount: 3,
      followersCount: 7,
    });
  });

  it("should answer 404 for an unknown user", async () => {
    const service = new UsersService(new FakeUsersRepository());

    await expect(service.getPublic("ghost")).rejects.toMatchObject({
      status: 404,
      message: "User not found",
    });
  });
});
