import { appRouter } from "@/server/routers/_app";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Auth Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: { tenant: { id: string }; user: { id: string; email: string } };

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    testData = await setupTestData();
    caller = appRouter.createCaller({
      session: {
        user: {
          id: testData.user.id,
          email: testData.user.email,
          name: "Test User",
          image: null,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      tenantId: testData.tenant.id,
      user: null,
    });
  });

  describe("signUp", () => {
    it("should create a new user with auto-generated tenant", async () => {
      const result = await caller.auth.signUp({
        name: "New User",
        email: `new-user-${Date.now()}@test.com`,
        password: "password123",
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("New User");
      expect(result.email).toBe(result.email);
      expect(result.existingUser).toBe(false);
      expect(result.tenantId).toBeTruthy();

      const memberships = await prisma.membership.findMany({
        where: { userId: result.id },
      });
      expect(memberships.length).toBe(1);
      expect(memberships[0].role).toBe("OWNER");
    });

    it("should update name and password when email already exists", async () => {
      const email = `upsert-${Date.now()}@test.com`;

      // Primeiro cadastro: cria usuário + tenant
      const first = await caller.auth.signUp({
        name: "First",
        email,
        password: "password123",
      });
      expect(first.existingUser).toBe(false);
      expect(first.tenantId).toBeTruthy();

      // Segundo cadastro com mesmo email: atualiza nome e senha, mantém tenant
      const second = await caller.auth.signUp({
        name: "Updated Name",
        email,
        password: "newpassword456",
      });
      expect(second.existingUser).toBe(true);
      expect(second.id).toBe(first.id);
      expect(second.name).toBe("Updated Name");
      expect(second.tenantId).toBe(first.tenantId);

      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser?.name).toBe("Updated Name");

      // Verifica que não criou tenant duplicado
      const tenants = await prisma.tenant.findMany({
        where: { ownerId: first.id },
      });
      expect(tenants.length).toBe(1);
    });
  });

  describe("checkInvite", () => {
    it("should return invite details for valid token", async () => {
      const token = `valid-token-${Date.now()}`;
      const invite = await prisma.invite.create({
        data: {
          email: `invited-${Date.now()}@test.com`,
          token,
          tenantId: testData.tenant.id,
          invitedBy: testData.user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await caller.auth.checkInvite({ token: invite.token });
      expect(result.email).toBe(invite.email);
      expect(result.tenant.name).toBe("Test Restaurant");
    });

    it("should reject expired invite", async () => {
      const token = `expired-token-${Date.now()}`;
      const invite = await prisma.invite.create({
        data: {
          email: `expired-${Date.now()}@test.com`,
          token,
          tenantId: testData.tenant.id,
          invitedBy: testData.user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await expect(caller.auth.checkInvite({ token: invite.token })).rejects.toThrow(
        "Invite expired",
      );
    });
  });

  describe("acceptInvite", () => {
    it("should create membership and mark invite accepted", async () => {
      const email = `accept-${Date.now()}@test.com`;
      const newUser = await prisma.user.create({
        data: {
          email,
          name: "Accept User",
        },
      });

      const invite = await prisma.invite.create({
        data: {
          email,
          token: `accept-token-${Date.now()}`,
          tenantId: testData.tenant.id,
          invitedBy: testData.user.id,
          role: "ADMIN",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const acceptCaller = appRouter.createCaller({
        session: {
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            image: null,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        tenantId: null,
        user: null,
      });

      const result = await acceptCaller.auth.acceptInvite({
        token: invite.token,
        name: "Accept User",
        password: "password123",
      });
      expect(result.existingUser).toBe(true);
      expect(result.userId).toBe(newUser.id);

      const updatedInvite = await prisma.invite.findUnique({
        where: { id: invite.id },
      });
      expect(updatedInvite?.acceptedAt).not.toBeNull();

      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: newUser.id,
            tenantId: testData.tenant.id,
          },
        },
      });
      expect(membership).not.toBeNull();
      expect(membership?.role).toBe("ADMIN");
    });
  });
});
