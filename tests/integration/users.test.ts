import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app.ts";
import prisma from "../../src/core/database/prisma.client.ts";
import { cleanAuthTables, registerSession, type Session } from "./helpers/auth.ts";

const owner = { email: "users_owner@example.com", password: "securepass123", name: "Owner User" };
const other = { email: "users_other@example.com", password: "securepass123", name: "Other User" };

const authorized = (session: Session) => ({ Authorization: `Bearer ${session.accessToken}` });

describe("Users API (integration)", () => {
  let ownerSession: Session;
  let otherSession: Session;

  beforeEach(async () => {
    await cleanAuthTables();
    ownerSession = await registerSession(owner);
    otherSession = await registerSession(other);
  });

  afterAll(async () => {
    await cleanAuthTables();
    await prisma.$disconnect();
  });

  describe("GET /api/users/me", () => {
    it("should return the profile with every count", async () => {
      const res = await request(app).get("/api/users/me").set(authorized(ownerSession)).expect(200);

      expect(res.body).toEqual({
        id: ownerSession.user.id,
        name: owner.name,
        email: owner.email,
        avatar: null,
        createdRecipesCount: 0,
        favoritesCount: 0,
        followersCount: 0,
        followingCount: 0,
      });
    });

    it("should refuse a request without a token", async () => {
      await request(app).get("/api/users/me").expect(401);
    });
  });

  describe("GET /api/users/{id}", () => {
    it("should return the public profile of another user", async () => {
      const res = await request(app)
        .get(`/api/users/${otherSession.user.id}`)
        .set(authorized(ownerSession))
        .expect(200);

      expect(res.body).toEqual({
        id: otherSession.user.id,
        name: other.name,
        email: other.email,
        avatar: null,
        createdRecipesCount: 0,
        followersCount: 0,
      });
    });

    it("should answer 404 for an unknown user", async () => {
      await request(app).get("/api/users/unknown-id").set(authorized(ownerSession)).expect(404);
    });
  });

  describe("follow and unfollow", () => {
    it("should follow, show up in both lists and unfollow", async () => {
      await request(app)
        .post(`/api/users/${otherSession.user.id}/follow`)
        .set(authorized(ownerSession))
        .expect(201, { message: "Successfully followed" });

      const following = await request(app)
        .get("/api/users/following")
        .set(authorized(ownerSession))
        .expect(200);
      expect(following.body).toEqual({
        users: [{ id: otherSession.user.id, name: other.name, avatar: null }],
      });

      const followers = await request(app)
        .get(`/api/users/${otherSession.user.id}/followers`)
        .set(authorized(otherSession))
        .expect(200);
      expect(followers.body).toEqual({
        users: [{ id: ownerSession.user.id, name: owner.name, avatar: null }],
      });

      await request(app)
        .delete(`/api/users/${otherSession.user.id}/follow`)
        .set(authorized(ownerSession))
        .expect(204);

      const afterUnfollow = await request(app)
        .get("/api/users/following")
        .set(authorized(ownerSession))
        .expect(200);
      expect(afterUnfollow.body).toEqual({ users: [] });
    });

    it("should refuse to follow yourself", async () => {
      await request(app)
        .post(`/api/users/${ownerSession.user.id}/follow`)
        .set(authorized(ownerSession))
        .expect(400, { error: "You cannot follow yourself" });
    });

    it("should refuse to follow an unknown user", async () => {
      await request(app)
        .post("/api/users/unknown-id/follow")
        .set(authorized(ownerSession))
        .expect(404, { error: "User not found" });
    });

    it("should refuse a second follow", async () => {
      await request(app)
        .post(`/api/users/${otherSession.user.id}/follow`)
        .set(authorized(ownerSession))
        .expect(201);

      await request(app)
        .post(`/api/users/${otherSession.user.id}/follow`)
        .set(authorized(ownerSession))
        .expect(400, { error: "You are already following this user" });
    });

    it("should answer 404 when unfollowing someone you do not follow", async () => {
      await request(app)
        .delete(`/api/users/${otherSession.user.id}/follow`)
        .set(authorized(ownerSession))
        .expect(404, { error: "You are not following this user" });
    });

    it("should answer 404 when listing followers of an unknown user", async () => {
      await request(app).get("/api/users/unknown-id/followers").set(authorized(ownerSession)).expect(404);
    });
  });

  describe("PATCH /api/users/avatar", () => {
    it("should refuse a request without a file", async () => {
      await request(app)
        .patch("/api/users/avatar")
        .set(authorized(ownerSession))
        .expect(400, { error: "Avatar file is required" });
    });

    it("should refuse a request without a token", async () => {
      await request(app).patch("/api/users/avatar").expect(401);
    });
  });
});
