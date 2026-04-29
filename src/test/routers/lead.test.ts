import { appRouter } from "@/server/routers/_app";
import { LeadStatus } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Lead Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
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
          name: "Test Admin",
          image: null,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      tenantId: testData.tenant.id,
      user: null,
    });
    adminCaller = caller;
  });

  describe("create", () => {
    it("should create a new lead", async () => {
      const result = await caller.lead.create({
        name: "John Doe",
        email: `john-${Date.now()}@test.com`,
        phone: "5511999999999",
        businessSize: "SMALL",
        employeeCount: 5,
        currentTool: "Excel",
      });

      expect(result.status).toBe(LeadStatus.PENDING);
      expect(result.name).toBe("John Doe");
      expect(result.email).toBe(result.email);
    });

    it("should reject duplicate email", async () => {
      const email = `dup-lead-${Date.now()}@test.com`;
      await caller.lead.create({ name: "First", email });

      await expect(caller.lead.create({ name: "Second", email })).rejects.toThrow("already exists");
    });

    it("should reject existing user email", async () => {
      await expect(
        caller.lead.create({
          name: "Test",
          email: testData.user.email,
        }),
      ).rejects.toThrow("already exists");
    });
  });

  describe("list", () => {
    it("should return paginated leads filtered by status", async () => {
      await prisma.lead.create({
        data: {
          name: "Lead 1",
          email: `lead1-${Date.now()}@test.com`,
          status: LeadStatus.PENDING,
        },
      });

      await prisma.lead.create({
        data: {
          name: "Lead 2",
          email: `lead2-${Date.now()}@test.com`,
          status: LeadStatus.APPROVED,
        },
      });

      const result = await adminCaller.lead.list({
        status: LeadStatus.PENDING,
        page: 1,
        pageSize: 20,
      });
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.leads.every((l) => l.status === LeadStatus.PENDING)).toBe(true);
    });
  });

  describe("get", () => {
    it("should return lead details", async () => {
      const lead = await prisma.lead.create({
        data: {
          name: "Detail Lead",
          email: `detail-${Date.now()}@test.com`,
        },
      });

      const result = await adminCaller.lead.get({ leadId: lead.id });
      expect(result.name).toBe("Detail Lead");
    });
  });

  describe("update", () => {
    it("should update lead notes", async () => {
      const lead = await prisma.lead.create({
        data: {
          name: "Note Lead",
          email: `note-${Date.now()}@test.com`,
        },
      });

      const result = await adminCaller.lead.update({
        leadId: lead.id,
        notes: "Updated notes",
      });

      expect(result.notes).toBe("Updated notes");
    });
  });

  describe("approve", () => {
    it("should approve lead and create tenant + membership + invite", async () => {
      const lead = await prisma.lead.create({
        data: {
          name: "Approve Lead",
          email: `approve-${Date.now()}@test.com`,
        },
      });

      const result = await adminCaller.lead.approve({
        leadId: lead.id,
        tenantName: "Approve Test",
        role: "MEMBER",
      });

      expect(result.lead.status).toBe(LeadStatus.APPROVED);
      expect(result.lead.approvedAt).toBeTruthy();
      expect(result.lead.tenantId).toBeTruthy();
      expect(result.inviteUrl).toBeTruthy();

      const invite = await prisma.invite.findFirst({
        where: { email: lead.email },
      });
      expect(invite).not.toBeNull();
    });

    it("should not approve already processed lead", async () => {
      const lead = await prisma.lead.create({
        data: {
          name: "Done Lead",
          email: `done-${Date.now()}@test.com`,
          status: LeadStatus.APPROVED,
        },
      });

      await expect(adminCaller.lead.approve({ leadId: lead.id, role: "MEMBER" })).rejects.toThrow(
        "not in PENDING",
      );
    });
  });

  describe("reject", () => {
    it("should reject lead with reason", async () => {
      const lead = await prisma.lead.create({
        data: {
          name: "Reject Lead",
          email: `reject-${Date.now()}@test.com`,
        },
      });

      const result = await adminCaller.lead.reject({
        leadId: lead.id,
        reason: "Does not fit criteria",
      });

      expect(result.status).toBe(LeadStatus.REJECTED);
      expect(result.rejectionReason).toBe("Does not fit criteria");
    });
  });
});
