import type { Response } from "express";
import createHttpError from "http-errors";
import fs from "fs/promises";
import prisma from "../core/database/prisma.client.ts";
import type { AuthenticatedRequest } from "../modules/auth/api/authenticated-request.ts";
import cloudinary from "../config/cloudinary.ts";
import logger from "../core/logger.ts";

// ====================== GET /api/users/me ======================

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      _count: {
        select: {
          recipes: true,
          favorites: true,
          followers: true,
          following: true,
        },
      },
    },
  });

  if (!user) {
    throw createHttpError(401, "User not found");
  }

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdRecipesCount: user._count.recipes,
    favoritesCount: user._count.favorites,
    followersCount: user._count.followers,
    followingCount: user._count.following,
  });
};

// ====================== GET /api/users/:id ======================

export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      _count: {
        select: {
          recipes: true,
          followers: true,
        },
      },
    },
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdRecipesCount: user._count.recipes,
    followersCount: user._count.followers,
  });
};

// ====================== PATCH /api/users/avatar ======================

export const updateAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user.sub;

  if (!req.file) {
    throw createHttpError(400, "Avatar file is required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  if (!user) {
    await fs.unlink(req.file.path).catch(() => {});
    throw createHttpError(401, "User not found");
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "foodies/avatars",
      public_id: `user_${userId}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
      ],
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: result.secure_url },
      select: { avatar: true },
    });

    logger.info({ userId }, "Avatar updated");

    res.status(200).json({ avatar: updatedUser.avatar });
  } catch (err: any) {
    logger.error({ err, userId }, "Failed to upload avatar");

    // Помилки від Cloudinary (невалідний файл тощо) → 400
    if (
      err.http_code === 400 ||
      err.message?.toLowerCase().includes("invalid image")
    ) {
      throw createHttpError(400, "Invalid image file");
    }

    throw createHttpError(500, "Failed to upload avatar");
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
};

// ====================== GET /api/users/:id/followers ======================

export const getFollowers = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const id = req.params.id as string;

  const userExists = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!userExists) {
    throw createHttpError(404, "User not found");
  }

  const followers = await prisma.follow.findMany({
    where: { followingId: id },
    select: {
      follower: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    users: followers.map((f) => f.follower),
  });
};

// ====================== GET /api/users/following ======================

export const getFollowing = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user.sub;

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: {
      following: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    users: following.map((f) => f.following),
  });
};

// ====================== POST /api/users/:id/follow ======================

export const followUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const currentUserId = req.user.sub;
  const targetUserId = req.params.id as string;

  if (currentUserId === targetUserId) {
    throw createHttpError(400, "You cannot follow yourself");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    throw createHttpError(404, "User not found");
  }

  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    },
  });

  if (existingFollow) {
    throw createHttpError(400, "You are already following this user");
  }

  await prisma.follow.create({
    data: {
      followerId: currentUserId,
      followingId: targetUserId,
    },
  });

  logger.info(
    { followerId: currentUserId, followingId: targetUserId },
    "User followed",
  );

  res.status(201).json({ message: "Successfully followed" });
};

// ====================== DELETE /api/users/:id/follow ======================

export const unfollowUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const currentUserId = req.user.sub;
  const targetUserId = req.params.id as string;

  const deleted = await prisma.follow.deleteMany({
    where: {
      followerId: currentUserId,
      followingId: targetUserId,
    },
  });

  if (deleted.count === 0) {
    throw createHttpError(404, "You are not following this user");
  }

  logger.info(
    { followerId: currentUserId, followingId: targetUserId },
    "User unfollowed",
  );

  res.status(204).end();
};
