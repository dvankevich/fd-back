import { describe, expect, it } from "vitest";
import type { Nullable, Optional } from "../../../core/types/common.ts";
import type {
  AuthAccount,
  AuthUser,
  AuthUserRepository,
  NewAccount,
  PasswordHasher,
  RotatedSession,
  TokenPair,
} from "../domain/auth.ports.ts";
import { AuthService } from "./auth.service.ts";

const account: AuthAccount = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  avatar: null,
  password: "hash:securepass123",
};

class FakeUserRepository implements AuthUserRepository {
  readonly created: NewAccount[] = [];

  constructor(private readonly stored: Nullable<AuthAccount> = account) {}

  async create(input: NewAccount): Promise<AuthUser> {
    this.created.push(input);
    return { id: "user-2", name: input.name, email: input.email, avatar: null };
  }

  async findAccountByEmail(email: string): Promise<Nullable<AuthAccount>> {
    return this.stored?.email === email ? this.stored : null;
  }

  async exists(): Promise<boolean> {
    return true;
  }
}

class FakePasswordHasher implements PasswordHasher {
  readonly verified: Optional<string>[] = [];

  async hash(plain: string): Promise<string> {
    return `hash:${plain}`;
  }

  async verify(plain: string, storedHash: Optional<string>): Promise<boolean> {
    this.verified.push(storedHash);
    return storedHash === `hash:${plain}`;
  }
}

class FakeSessions {
  readonly calls: string[] = [];
  revokedFor: Optional<string>;

  async issue(userId: string): Promise<TokenPair> {
    this.calls.push(`issue:${userId}`);
    return { accessToken: `access:${userId}`, refreshToken: `refresh:${userId}` };
  }

  async rotate(presentedToken: string): Promise<RotatedSession> {
    this.calls.push(`rotate:${presentedToken}`);
    return { accessToken: "access", refreshToken: "refresh", userId: account.id };
  }

  async revoke({ userId }: { userId: string; refreshToken: string }): Promise<number> {
    this.calls.push(`revoke:${userId}`);
    this.revokedFor = userId;
    return 1;
  }

  async revokeAll(userId: string): Promise<number> {
    this.calls.push(`revokeAll:${userId}`);
    return 2;
  }

  async deleteExpired(userId: string): Promise<number> {
    this.calls.push(`deleteExpired:${userId}`);
    return 0;
  }
}

const createService = (users: AuthUserRepository = new FakeUserRepository()) => {
  const passwords = new FakePasswordHasher();
  const sessions = new FakeSessions();
  return { service: new AuthService({ users, passwords, sessions }), passwords, sessions };
};

describe("AuthService", () => {
  it("should store the password hashed and open a session on register", async () => {
    const users = new FakeUserRepository();
    const { service, sessions } = createService(users);

    const result = await service.register({
      email: "new@example.com",
      password: "securepass123",
      name: "New User",
    });

    expect(users.created).toEqual([
      { email: "new@example.com", name: "New User", password: "hash:securepass123" },
    ]);
    expect(result.tokens).toEqual({ accessToken: "access:user-2", refreshToken: "refresh:user-2" });
    expect(sessions.calls).toEqual(["issue:user-2"]);
  });

  it("should reject an unknown email with the same message as a wrong password", async () => {
    const { service, passwords } = createService(new FakeUserRepository(null));

    await expect(
      service.login({ email: "ghost@example.com", password: "securepass123" }),
    ).rejects.toMatchObject({ status: 401, message: "Invalid credentials" });
    expect(passwords.verified).toEqual([undefined]);
  });

  it("should reject a wrong password", async () => {
    const { service } = createService();

    await expect(
      service.login({ email: account.email, password: "wrong-password" }),
    ).rejects.toMatchObject({ status: 401, message: "Invalid credentials" });
  });

  it("should drop expired sessions before issuing a new one on login", async () => {
    const { service, sessions } = createService();

    const result = await service.login({ email: account.email, password: "securepass123" });

    expect(sessions.calls).toEqual([`deleteExpired:${account.id}`, `issue:${account.id}`]);
    expect(result.user).toEqual({
      id: account.id,
      name: account.name,
      email: account.email,
      avatar: null,
    });
  });

  it("should revoke only the presented session on logout", async () => {
    const { service, sessions } = createService();

    await expect(service.logout({ userId: account.id, refreshToken: "refresh" })).resolves.toBe(1);
    expect(sessions.calls).toEqual([`revoke:${account.id}`]);
  });

  it("should revoke every session when logout has no refresh token", async () => {
    const { service, sessions } = createService();

    await expect(service.logout({ userId: account.id, refreshToken: undefined })).resolves.toBe(2);
    expect(sessions.calls).toEqual([`revokeAll:${account.id}`]);
  });

  it("should hand the presented token to the session rotation", async () => {
    const { service, sessions } = createService();

    await expect(service.refresh("presented")).resolves.toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      userId: account.id,
    });
    expect(sessions.calls).toEqual(["rotate:presented"]);
  });
});
