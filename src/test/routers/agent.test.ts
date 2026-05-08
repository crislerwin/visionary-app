import { appRouter } from "@/server/routers/_app";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupTestData } from "../database";

describe("Agent Router", () => {
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
      user: {
        id: testData.user.id,
        email: testData.user.email,
        name: "Test User",
        image: null,
      },
    });
  });

  describe("createConfig", () => {
    it("should create agent config with default agentName", async () => {
      const result = await caller.agent.createConfig({
        promptSystem: "Você é um atendente simpático.",
        tone: "CASUAL" as const,
      });

      expect(result.config.agentName).toBe("Sofia");
    });

    it("should create agent config with custom agentName", async () => {
      const result = await caller.agent.createConfig({
        promptSystem: "Você é um atendente simpático.",
        tone: "CASUAL" as const,
        agentName: "Roberto",
      });

      expect(result.config.agentName).toBe("Roberto");
    });

    it("should create agent config successfully", async () => {
      const result = await caller.agent.createConfig({
        promptSystem: "Você é um atendente simpático.",
        welcomeMessage: "Olá! Como posso ajudar?",
        tone: "CASUAL" as const,
        autoConfirm: true,
        workingHours: {
          monday: [{ open: "09:00", close: "18:00" }],
        },
      });

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config.promptSystem).toBe("Você é um atendente simpático.");
      expect(result.config.tone).toBe("CASUAL");
      expect(result.config.autoConfirm).toBe(true);
      expect(result.config.webhookSecret).toBeDefined();
    });

    it("should fail when creating duplicate config", async () => {
      await caller.agent.createConfig({
        promptSystem: "Test",
        tone: "FRIENDLY" as const,
      });

      await expect(
        caller.agent.createConfig({
          promptSystem: "Test 2",
          tone: "FORMAL" as const,
        }),
      ).rejects.toThrow(/already exists/);
    });

    it("should validate promptSystem is required", async () => {
      await expect(
        caller.agent.createConfig({
          promptSystem: "",
          tone: "FRIENDLY" as const,
        }),
      ).rejects.toThrow();
    });
  });

  describe("getConfig", () => {
    it("should retrieve existing config", async () => {
      await caller.agent.createConfig({
        promptSystem: "Você é um atendente.",
        tone: "PROFESSIONAL" as const,
      });

      const result = await caller.agent.getConfig();

      expect(result.config).toBeDefined();
      expect(result.config.promptSystem).toBe("Você é um atendente.");
      expect(result.config.tone).toBe("PROFESSIONAL");
    });

    it("should return empty config when not created", async () => {
      const result = await caller.agent.getConfig();
      expect(result.config).toBeNull();
    });
  });

  describe("updateConfig", () => {
    beforeEach(async () => {
      await caller.agent.createConfig({
        promptSystem: "Config inicial",
        tone: "FRIENDLY" as const,
      });
    });

    it("should update config fields", async () => {
      const result = await caller.agent.updateConfig({
        promptSystem: "Novo prompt atualizado",
        tone: "FORMAL" as const,
        autoConfirm: true,
      });

      expect(result.success).toBe(true);
      expect(result.config.promptSystem).toBe("Novo prompt atualizado");
      expect(result.config.tone).toBe("FORMAL");
      expect(result.config.autoConfirm).toBe(true);
    });

    it("should update agentName", async () => {
      const result = await caller.agent.updateConfig({
        agentName: "Carolina",
      });

      expect(result.success).toBe(true);
      expect(result.config.agentName).toBe("Carolina");
    });

    it("should regenerate webhook secret", async () => {
      const oldConfig = await caller.agent.getConfig();
      const oldSecret = oldConfig.config?.webhookSecret;

      const result = await caller.agent.regenerateWebhookSecret();

      expect(result.webhookSecret).toBeDefined();
      expect(result.webhookSecret).not.toBe(oldSecret);
      expect(result.webhookSecret).toHaveLength(64); // hex of 32 bytes
    });
  });

  describe("deleteConfig", () => {
    beforeEach(async () => {
      await caller.agent.createConfig({
        promptSystem: "Config para deletar",
        tone: "FRIENDLY" as const,
      });
    });

    it("should delete config successfully", async () => {
      const result = await caller.agent.deleteConfig();

      expect(result.success).toBe(true);

      const check = await caller.agent.getConfig();
      expect(check.config).toBeNull();
    });
  });

  describe("getLogs", () => {
    it("should return empty array when no logs", async () => {
      const result = await caller.agent.getLogs({ limit: 10 });
      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
