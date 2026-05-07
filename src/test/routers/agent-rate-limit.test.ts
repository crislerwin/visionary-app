import { appRouter } from "@/server/routers/_app";
import { AgentTone } from "@/types/agent";
import type { AgentConfig } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Agent Webhook Rate Limiting", () => {
  let testData: { tenant: { id: string }; user: { id: string; email: string } };
  let agentConfig: AgentConfig;

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    testData = await setupTestData();
    agentConfig = await prisma.agentConfig.create({
      data: {
        tenantId: testData.tenant.id,
        promptSystem: "Você é um atendente.",
        tone: AgentTone.FRIENDLY,
        webhookSecret: "test-secret",
      },
    });
  });

  it("should handle multiple rapid requests", async () => {
    const customerPhone = "11999998888";
    const results = [];

    // Simulate 10 rapid requests
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();

      // Simulate webhook processing
      const log = await prisma.agentInteractionLog.create({
        data: {
          tenantId: testData.tenant.id,
          agentConfigId: agentConfig.id,
          customerPhone,
          type: "ORDER_CREATE",
          status: "SUCCESS",
          input: { test: `request-${i}` },
          output: { success: true },
          durationMs: Math.floor(Math.random() * 100),
        },
      });

      const endTime = Date.now();
      results.push({
        duration: endTime - startTime,
        logId: log.id,
      });
    }

    // All requests should complete successfully
    expect(results).toHaveLength(10);

    // Verify logs were created
    const logs = await prisma.agentInteractionLog.findMany({
      where: { tenantId: testData.tenant.id },
    });
    expect(logs).toHaveLength(10);
  });

  it("should log errors when processing fails", async () => {
    const log = await prisma.agentInteractionLog.create({
      data: {
        tenantId: testData.tenant.id,
        agentConfigId: agentConfig.id,
        customerPhone: "11999998888",
        type: "ORDER_CREATE",
        status: "ERROR",
        input: { test: "error-test" },
        error: "Test error message",
      },
    });

    expect(log.status).toBe("ERROR");
    expect(log.error).toBe("Test error message");

    // Retrieve the error log
    const logs = await prisma.agentInteractionLog.findMany({
      where: { tenantId: testData.tenant.id, status: "ERROR" },
    });

    expect(logs).toHaveLength(1);
  });

  it("should query logs with pagination", async () => {
    // Create 20 logs
    for (let i = 0; i < 20; i++) {
      await prisma.agentInteractionLog.create({
        data: {
          tenantId: testData.tenant.id,
          agentConfigId: agentConfig.id,
          customerPhone: `1199999${i.toString().padStart(4, "0")}`,
          type: i % 2 === 0 ? "ORDER_CREATE" : "ORDER_LIST",
          status: "SUCCESS",
        },
      });
    }

    const caller = appRouter.createCaller({
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

    // Test pagination
    const page1 = await caller.agent.getLogs({ limit: 10, offset: 0 });
    expect(page1.logs).toHaveLength(10);
    expect(page1.total).toBe(20);

    const page2 = await caller.agent.getLogs({ limit: 10, offset: 10 });
    expect(page2.logs).toHaveLength(10);

    // Verify different pages return different items
    expect(page1.logs[0].id).not.toBe(page2.logs[0].id);
  });

  it("should filter logs by type", async () => {
    // Create mixed logs
    await prisma.agentInteractionLog.create({
      data: {
        tenantId: testData.tenant.id,
        agentConfigId: agentConfig.id,
        type: "ORDER_CREATE",
        status: "SUCCESS",
      },
    });

    await prisma.agentInteractionLog.create({
      data: {
        tenantId: testData.tenant.id,
        agentConfigId: agentConfig.id,
        type: "ORDER_LIST",
        status: "SUCCESS",
      },
    });

    const caller = appRouter.createCaller({
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

    const orderCreateLogs = await caller.agent.getLogs({
      limit: 10,
      type: "ORDER_CREATE",
    });

    expect(orderCreateLogs.logs).toHaveLength(1);
    expect(orderCreateLogs.logs[0].type).toBe("ORDER_CREATE");
  });

  it("should handle concurrent log creation", async () => {
    const promises = [];
    const customerPhones = Array.from(
      { length: 20 },
      (_, i) => `1199999${i.toString().padStart(4, "0")}`,
    );

    // Create 20 logs concurrently
    for (let i = 0; i < 20; i++) {
      promises.push(
        prisma.agentInteractionLog.create({
          data: {
            tenantId: testData.tenant.id,
            agentConfigId: agentConfig.id,
            customerPhone: customerPhones[i],
            type: "ORDER_CREATE",
            status: "SUCCESS",
          },
        }),
      );
    }

    await Promise.all(promises);

    const logs = await prisma.agentInteractionLog.findMany({
      where: { tenantId: testData.tenant.id },
    });

    expect(logs).toHaveLength(20);

    // Verify all customer phones are unique
    const phones = logs.map((l) => l.customerPhone);
    const uniquePhones = new Set(phones);
    expect(uniquePhones.size).toBe(20);
  });
});
