import { appRouter } from "@/server/routers/_app";
import { MemberRole } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Team Router", () => {
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

  describe("list", () => {
    it("should return members and pending invites", async () => {
      await prisma.invite.create({
        data: {
          email: `pending-${Date.now()}@test.com`,
          token: `token-${Date.now()}`,
          tenantId: testData.tenant.id,
          invitedBy: testData.user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await caller.team.list({ tenantId: testData.tenant.id });
      expect(result.members.length).toBeGreaterThanOrEqual(1);
      expect(result.pendingInvites.length).toBe(1);
      expect(result.canManageRoles).toBe(true);
    });
  });

  describe("invite", () => {
    it("should create an invite", async () => {
      const email = `new-invite-${Date.now()}@test.com`;
      const result = await caller.team.invite({
        tenantId: testData.tenant.id,
        email,
        role: MemberRole.MEMBER,
      });

      expect(result.email).toBe(email);
      expect(result.role).toBe("MEMBER");
    });

    it("should reject duplicate invite", async () => {
      const email = `dup-invite-${Date.now()}@test.com`;
      await caller.team.invite({
        tenantId: testData.tenant.id,
        email,
        role: MemberRole.MEMBER,
      });

      await expect(
        caller.team.invite({
          tenantId: testData.tenant.id,
          email,
          role: MemberRole.MEMBER,
        }),
      ).rejects.toThrow("Invite already sent");
    });

    it("should reject invite for existing member", async () => {
      const existingUser = await prisma.user.create({
        data: {
          email: `existing-${Date.now()}@test.com`,
          name: "Existing",
          memberships: {
            create: {
              tenantId: testData.tenant.id,
              role: "MEMBER",
            },
          },
        },
      });

      await expect(
        caller.team.invite({
          tenantId: testData.tenant.id,
          email: existingUser.email,
          role: MemberRole.MEMBER,
        }),
      ).rejects.toThrow("already a member");
    });

    it("should add existing user as direct member without invite", async () => {
      const user = await prisma.user.create({
        data: {
          email: `direct-${Date.now()}@test.com`,
          name: "Direct User",
        },
      });

      const result = await caller.team.invite({
        tenantId: testData.tenant.id,
        email: user.email,
        role: MemberRole.ADMIN,
      });

      expect(result.directMember).toBe(true);
      expect(result.email).toBe(user.email);
      expect(result.role).toBe("ADMIN");

      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: testData.tenant.id,
          },
        },
      });
      expect(membership).not.toBeNull();
      expect(membership?.role).toBe("ADMIN");
    });
  });

  describe("cancelInvite", () => {
    it("should cancel a pending invite", async () => {
      const invite = await prisma.invite.create({
        data: {
          email: `cancel-${Date.now()}@test.com`,
          token: `cancel-token-${Date.now()}`,
          tenantId: testData.tenant.id,
          invitedBy: testData.user.id,
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const result = await caller.team.cancelInvite({
        tenantId: testData.tenant.id,
        inviteId: invite.id,
      });
      expect(result.success).toBe(true);

      const deleted = await prisma.invite.findUnique({ where: { id: invite.id } });
      expect(deleted).toBeNull();
    });
  });

  describe("updateRole", () => {
    it("should update a member role", async () => {
      const member = await prisma.user.create({
        data: {
          email: `member-role-${Date.now()}@test.com`,
          name: "Member Role",
          memberships: {
            create: {
              tenantId: testData.tenant.id,
              role: "MEMBER",
            },
          },
        },
      });

      const result = await caller.team.updateRole({
        tenantId: testData.tenant.id,
        userId: member.id,
        role: MemberRole.VIEWER,
      });

      expect(result.role).toBe("VIEWER");
    });
  });

  describe("remove", () => {
    it("should remove a member", async () => {
      const member = await prisma.user.create({
        data: {
          email: `remove-${Date.now()}@test.com`,
          name: "Remove Me",
          memberships: {
            create: {
              tenantId: testData.tenant.id,
              role: "MEMBER",
            },
          },
        },
      });

      const result = await caller.team.remove({
        tenantId: testData.tenant.id,
        userId: member.id,
      });

      expect(result.success).toBe(true);

      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: member.id,
            tenantId: testData.tenant.id,
          },
        },
      });
      expect(membership).toBeNull();
    });

    it("should prevent self-removal", async () => {
      await expect(
        caller.team.remove({
          tenantId: testData.tenant.id,
          userId: testData.user.id,
        }),
      ).rejects.toThrow("Use leave endpoint");
    });
  });
});
