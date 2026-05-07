import { appRouter } from "@/server/routers/_app";
import { MemberRole } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Tenant Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: { tenant: { id: string; slug: string }; user: { id: string; email: string } };

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
      user: {
        id: testData.user.id,
        email: testData.user.email,
        name: "Test User",
        image: null,
      },
    });
  });

  describe("bySlug", () => {
    it("should return tenant by slug", async () => {
      const result = await caller.tenant.bySlug({ slug: testData.tenant.slug });
      expect(result).toHaveProperty("id", testData.tenant.id);
      expect(result).toHaveProperty("slug", testData.tenant.slug);
    });

    it("should throw NOT_FOUND for non-existent slug", async () => {
      await expect(
        caller.tenant.bySlug({ slug: "non-existent-slug" }),
      ).rejects.toThrow();
    });
  });

  describe("getCurrent", () => {
    it("should return current tenant", async () => {
      const result = await caller.tenant.getCurrent();
      expect(result).toHaveProperty("id", testData.tenant.id);
    });

    it("should include members in response", async () => {
      const result = await caller.tenant.getCurrent();
      expect(result.members).toBeDefined();
      expect(Array.isArray(result.members)).toBe(true);
    });
  });

  describe("update", () => {
    it("should update tenant name", async () => {
      const newName = `Updated Name ${Date.now()}`;
      const result = await caller.tenant.update({
        id: testData.tenant.id,
        name: newName,
      });

      expect(result.name).toBe(newName);

      const dbTenant = await prisma.tenant.findUnique({
        where: { id: testData.tenant.id },
      });
      expect(dbTenant?.name).toBe(newName);
    });

    it("should update tenant config fields", async () => {
      const result = await caller.tenant.update({
        id: testData.tenant.id,
        whatsappPhone: "+5511999999999",
        description: "Updated description",
      });

      expect(result.whatsappPhone).toBe("+5511999999999");
      expect(result.description).toBe("Updated description");
    });

    it("should throw FORBIDDEN when updating another tenant", async () => {
      const otherTenant = await prisma.tenant.create({
        data: {
          name: "Other Restaurant",
          slug: `other-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          owner: {
            create: {
              email: `other-${Date.now()}@example.com`,
              name: "Other Owner",
            },
          },
        },
      });

      await expect(
        caller.tenant.update({
          id: otherTenant.id,
          name: "Hacked Name",
        }),
      ).rejects.toThrow();
    });
  });

  describe("updateConfig", () => {
    it("should update payment options config", async () => {
      const result = await caller.tenant.updateConfig({
        paymentOptions: {
          pix: { enabled: true, key: "test-pix-key" },
          creditCard: { enabled: true },
          cash: { enabled: true, change: true },
        },
      });

      expect(result).toHaveProperty("id", testData.tenant.id);

      const dbTenant = await prisma.tenant.findUnique({
        where: { id: testData.tenant.id },
      });
      const config = dbTenant?.config as Record<string, unknown> | null;
      expect(config).toHaveProperty("paymentOptions");
    });

    it("should update branding colors config", async () => {
      const result = await caller.tenant.updateConfig({
        branding: {
          colors: {
            primary: "#FF0000",
            secondary: "#00FF00",
          },
        },
      });

      expect(result).toHaveProperty("id", testData.tenant.id);
    });
  });

  describe("listMembers", () => {
    it("should return tenant members", async () => {
      const result = await caller.tenant.listMembers();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("inviteMember", () => {
    it("should create an invite for a new member", async () => {
      const email = `invite-${Date.now()}@test.com`;
      const result = await caller.tenant.inviteMember({
        email,
        role: MemberRole.MEMBER,
      });

      expect(result).toHaveProperty("token");
      expect(result.email).toBe(email);
      expect(result.role).toBe("MEMBER");
    });

    it("should throw when inviting existing member", async () => {
      const existingUser = await prisma.user.create({
        data: {
          email: `existing-${Date.now()}@test.com`,
          name: "Existing User",
        },
      });

      await prisma.membership.create({
        data: {
          userId: existingUser.id,
          tenantId: testData.tenant.id,
          role: MemberRole.MEMBER,
        },
      });

      await expect(
        caller.tenant.inviteMember({
          email: existingUser.email,
          role: MemberRole.MEMBER,
        }),
      ).rejects.toThrow();
    });
  });

  describe("removeMember", () => {
    it("should remove a member from tenant", async () => {
      const memberToRemove = await prisma.user.create({
        data: {
          email: `remove-${Date.now()}@test.com`,
          name: "Member to Remove",
        },
      });

      await prisma.membership.create({
        data: {
          userId: memberToRemove.id,
          tenantId: testData.tenant.id,
          role: MemberRole.MEMBER,
        },
      });

      const result = await caller.tenant.removeMember({
        userId: memberToRemove.id,
      });

      expect(result.success).toBe(true);

      const membership = await prisma.membership.findFirst({
        where: {
          userId: memberToRemove.id,
          tenantId: testData.tenant.id,
        },
      });
      expect(membership).toBeNull();
    });

    it("should throw when removing non-existent member", async () => {
      await expect(
        caller.tenant.removeMember({
          userId: "non-existent-user-id",
        }),
      ).rejects.toThrow();
    });
  });
});
