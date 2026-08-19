import { describe, expect, it } from "vitest";
import { BadRequestError } from "../../../core/exceptions/errors.ts";
import type { Nullable } from "../../../core/types/common.ts";
import type { ImageStorage, UploadImageInput, UploadedImage } from "../../media/index.ts";
import type { CurrentUserRow, PublicUserRow, UsersRepository } from "../domain/users.port.ts";
import { AVATAR_UPLOAD, AvatarService } from "./avatar.service.ts";

const userId = "user-1";
const uploadedUrl = "https://res.cloudinary.com/demo/avatar.jpg";

class FakeUsers implements UsersRepository {
  readonly saved: string[] = [];

  constructor(private readonly known = true) {}

  async findCurrent(): Promise<Nullable<CurrentUserRow>> {
    return null;
  }

  async findPublic(): Promise<Nullable<PublicUserRow>> {
    return null;
  }

  async exists(): Promise<boolean> {
    return this.known;
  }

  async updateAvatar({ avatar }: { userId: string; avatar: string }): Promise<Nullable<string>> {
    this.saved.push(avatar);
    return avatar;
  }
}

class FakeImages implements ImageStorage {
  readonly uploads: UploadImageInput[] = [];

  constructor(private readonly failure?: unknown) {}

  async upload(input: UploadImageInput): Promise<UploadedImage> {
    this.uploads.push(input);
    if (this.failure) {
      throw this.failure;
    }
    return { url: uploadedUrl };
  }
}

describe("AvatarService", () => {
  it("should upload to the avatar folder under a stable public id and save the url", async () => {
    const users = new FakeUsers();
    const images = new FakeImages();
    const service = new AvatarService({ users, images });

    await expect(service.update({ userId, filePath: "/tmp/upload.png" })).resolves.toEqual({
      avatar: uploadedUrl,
    });
    expect(images.uploads).toEqual([
      {
        path: "/tmp/upload.png",
        folder: AVATAR_UPLOAD.folder,
        publicId: `${AVATAR_UPLOAD.publicIdPrefix}${userId}`,
        overwrite: true,
        transformation: AVATAR_UPLOAD.transformation,
      },
    ]);
    expect(users.saved).toEqual([uploadedUrl]);
  });

  it("should answer 401 when the user behind the token is gone", async () => {
    const service = new AvatarService({ users: new FakeUsers(false), images: new FakeImages() });

    await expect(service.update({ userId, filePath: "/tmp/upload.png" })).rejects.toMatchObject({
      status: 401,
      message: "User not found",
    });
  });

  it("should keep a rejected image a 400", async () => {
    const images = new FakeImages(new BadRequestError("Invalid image file"));
    const service = new AvatarService({ users: new FakeUsers(), images });

    await expect(service.update({ userId, filePath: "/tmp/upload.png" })).rejects.toMatchObject({
      status: 400,
      message: "Invalid image file",
    });
  });

  it("should turn a storage outage into a 500", async () => {
    const images = new FakeImages(new Error("socket hang up"));
    const service = new AvatarService({ users: new FakeUsers(), images });

    await expect(service.update({ userId, filePath: "/tmp/upload.png" })).rejects.toMatchObject({
      status: 500,
      message: "Failed to upload avatar",
    });
  });
});
