import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Response } from "express";
import createHttpError from "http-errors";

// ---------- Mocks ----------

vi.mock("../../src/core/database/prisma.client.ts", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    follow: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/cloudinary.ts", () => ({
  default: {
    uploader: {
      upload: vi.fn(),
    },
  },
}));

vi.mock("fs/promises", () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/core/logger.ts", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import prisma from "../../src/core/database/prisma.client.ts";
import cloudinary from "../../src/config/cloudinary.ts";
import {
  getCurrentUser,
  getUserById,
  updateAvatar,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
} from "../../src/controllers/users.controller.ts";
import type { AuthenticatedRequest } from "../../src/modules/auth/api/authenticated-request.ts";

// ---------- Helpers ----------

const mockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}) =>
  ({
    user: { sub: "user-1" },
    params: {},
    file: undefined,
    ...overrides,
  }) as AuthenticatedRequest;

// ---------- Tests ----------

describe("Users Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ====================== getCurrentUser ======================

  describe("getCurrentUser", () => {
    it("should return current user with counts", async () => {
      const req = mockReq();
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        avatar: null,
        _count: {
          recipes: 5,
          favorites: 3,
          followers: 10,
          following: 7,
        },
      } as any);

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        avatar: null,
        createdRecipesCount: 5,
        favoritesCount: 3,
        followersCount: 10,
        followingCount: 7,
      });
    });

    it("should throw 401 if user not found", async () => {
      const req = mockReq();
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(getCurrentUser(req, res)).rejects.toMatchObject({
        status: 401,
        message: "User not found",
      });
    });
  });

  // ====================== getUserById ======================

  describe("getUserById", () => {
    it("should return public user profile", async () => {
      const req = mockReq({ params: { id: "user-2" } });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-2",
        name: "Other User",
        email: "other@example.com",
        avatar: "https://example.com/avatar.jpg",
        _count: {
          recipes: 8,
          followers: 15,
        },
      } as any);

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: "user-2",
        name: "Other User",
        email: "other@example.com",
        avatar: "https://example.com/avatar.jpg",
        createdRecipesCount: 8,
        followersCount: 15,
      });
    });

    it("should throw 404 if user not found", async () => {
      const req = mockReq({ params: { id: "missing" } });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(getUserById(req, res)).rejects.toMatchObject({
        status: 404,
        message: "User not found",
      });
    });
  });

  // ====================== updateAvatar ======================

  describe("updateAvatar", () => {
    it("should throw 400 if no file provided", async () => {
      const req = mockReq({ file: undefined });
      const res = mockRes();

      await expect(updateAvatar(req, res)).rejects.toMatchObject({
        status: 400,
        message: "Avatar file is required",
      });
    });

    it("should upload avatar and return new url", async () => {
      const req = mockReq({
        file: {
          path: "/tmp/test-avatar.jpg",
          originalname: "avatar.jpg",
          mimetype: "image/jpeg",
        } as any,
      });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        avatar: null,
      } as any);

      vi.mocked(cloudinary.uploader.upload).mockResolvedValue({
        secure_url: "https://res.cloudinary.com/demo/avatar.jpg",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        avatar: "https://res.cloudinary.com/demo/avatar.jpg",
      } as any);

      await updateAvatar(req, res);

      expect(cloudinary.uploader.upload).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { avatar: "https://res.cloudinary.com/demo/avatar.jpg" },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        avatar: "https://res.cloudinary.com/demo/avatar.jpg",
      });
    });

    it("should throw 400 on invalid image from Cloudinary", async () => {
      const req = mockReq({
        file: {
          path: "/tmp/bad-file.jpg",
        } as any,
      });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        avatar: null,
      } as any);

      const cloudinaryError = new Error("Invalid image file");
      (cloudinaryError as any).http_code = 400;

      vi.mocked(cloudinary.uploader.upload).mockRejectedValue(cloudinaryError);

      await expect(updateAvatar(req, res)).rejects.toMatchObject({
        status: 400,
        message: "Invalid image file",
      });
    });
  });

  // ====================== getFollowers ======================

  describe("getFollowers", () => {
    it("should return list of followers", async () => {
      const req = mockReq({ params: { id: "user-2" } });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2" } as any);
      vi.mocked(prisma.follow.findMany).mockResolvedValue([
        {
          follower: { id: "user-1", name: "Follower 1", avatar: null },
        },
        {
          follower: { id: "user-3", name: "Follower 2", avatar: "url" },
        },
      ] as any);

      await getFollowers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        users: [
          { id: "user-1", name: "Follower 1", avatar: null },
          { id: "user-3", name: "Follower 2", avatar: "url" },
        ],
      });
    });

    it("should throw 404 if user not found", async () => {
      const req = mockReq({ params: { id: "missing" } });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(getFollowers(req, res)).rejects.toMatchObject({
        status: 404,
        message: "User not found",
      });
    });
  });

  // ====================== getFollowing ======================

  describe("getFollowing", () => {
    it("should return list of following users", async () => {
      const req = mockReq();
      const res = mockRes();

      vi.mocked(prisma.follow.findMany).mockResolvedValue([
        {
          following: { id: "user-2", name: "Following 1", avatar: null },
        },
      ] as any);

      await getFollowing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        users: [{ id: "user-2", name: "Following 1", avatar: null }],
      });
    });
  });

  // ====================== followUser ======================

  describe("followUser", () => {
    it("should follow a user", async () => {
      const req = mockReq({ params: { id: "user-2" } });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2" } as any);
      vi.mocked(prisma.follow.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.follow.create).mockResolvedValue({} as any);

      await followUser(req, res);

      expect(prisma.follow.create).toHaveBeenCalledWith({
        data: {
          followerId: "user-1",
          followingId: "user-2",
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Successfully followed",
      });
    });

    it("should throw 400 when trying to follow yourself", async () => {
      const req = mockReq({ params: { id: "user-1" } });
      const res = mockRes();

      await expect(followUser(req, res)).rejects.toMatchObject({
        status: 400,
        message: "You cannot follow yourself",
      });
    });

    it("should throw 400 when already following", async () => {
      const req = mockReq({ params: { id: "user-2" } });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2" } as any);
      vi.mocked(prisma.follow.findUnique).mockResolvedValue({
        followerId: "user-1",
        followingId: "user-2",
      } as any);

      await expect(followUser(req, res)).rejects.toMatchObject({
        status: 400,
        message: "You are already following this user",
      });
    });

    it("should throw 404 if target user not found", async () => {
      const req = mockReq({ params: { id: "missing" } });
      const res = mockRes();

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(followUser(req, res)).rejects.toMatchObject({
        status: 404,
        message: "User not found",
      });
    });
  });

  // ====================== unfollowUser ======================

  describe("unfollowUser", () => {
    it("should unfollow a user", async () => {
      const req = mockReq({ params: { id: "user-2" } });
      const res = mockRes();

      vi.mocked(prisma.follow.deleteMany).mockResolvedValue({ count: 1 });

      await unfollowUser(req, res);

      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
        where: {
          followerId: "user-1",
          followingId: "user-2",
        },
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it("should throw 404 if not following", async () => {
      const req = mockReq({ params: { id: "user-2" } });
      const res = mockRes();

      vi.mocked(prisma.follow.deleteMany).mockResolvedValue({ count: 0 });

      await expect(unfollowUser(req, res)).rejects.toMatchObject({
        status: 404,
        message: "You are not following this user",
      });
    });
  });
});
