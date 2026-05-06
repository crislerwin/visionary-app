import { describe, expect, it } from "vitest";
import {
  createTRPCContext,
  protectedProcedure,
  publicProcedure,
  router,
  tenantProcedure,
} from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";

describe("createTRPCContext", () => {
  it("should create context with all options", () => {
    const session = {
      user: { id: "user-1", name: "Test User", email: "test@test.com" },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const ctx = createTRPCContext({
      session,
      tenantId: "tenant-1",
      headers: new Headers(),
    });

    expect(ctx.session).toEqual(session);
    expect(ctx.tenantId).toBe("tenant-1");
    expect(ctx.user).toEqual(session.user);
  });

  it("should create context with null values", () => {
    const ctx = createTRPCContext({});

    expect(ctx.session).toBeUndefined();
    expect(ctx.tenantId).toBeUndefined();
    expect(ctx.user).toBeNull();
  });
});

describe("tRPC Procedures", () => {
  // Test router creation
  describe("router", () => {
    it("should create a router with procedures", () => {
      const testRouter = router({
        testQuery: publicProcedure.query(() => "test"),
      });

      expect(testRouter).toBeDefined();
      expect(testRouter._def.procedures.testQuery).toBeDefined();
    });
  });

  // Test protectedProcedure
  describe("protectedProcedure", () => {
    it("should throw UNAUTHORIZED for null session", async () => {
      const ctx = {
        session: null,
        user: null,
        tenantId: null,
        headers: new Headers(),
      };

      const caller = router({
        protected: protectedProcedure.query(({ ctx }) => ctx.user),
      }).createCaller(ctx);

      await expect(caller.protected()).rejects.toThrow(TRPCError);
      await expect(caller.protected()).rejects.toThrow("You must be logged in");
    });

    it("should pass for valid session", async () => {
      const ctx = {
        session: {
          user: { id: "user-1", name: "Test User", email: "test@test.com" },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        user: { id: "user-1", name: "Test User", email: "test@test.com" },
        tenantId: null,
        headers: new Headers(),
      };

      const caller = router({
        protected: protectedProcedure.query(({ ctx }) => ctx.user?.id),
      }).createCaller(ctx);

      const result = await caller.protected();
      expect(result).toBe("user-1");
    });
  });

  // Test tenantProcedure
  describe("tenantProcedure", () => {
    it("should throw BAD_REQUEST for missing tenantId", async () => {
      const ctx = {
        session: {
          user: { id: "user-1", name: "Test User", email: "test@test.com" },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        user: { id: "user-1", name: "Test User", email: "test@test.com" },
        tenantId: null,
        headers: new Headers(),
      };

      const caller = router({
        tenant: tenantProcedure.query(({ ctx }) => ctx.tenantId),
      }).createCaller(ctx);

      await expect(caller.tenant()).rejects.toThrow(TRPCError);
      await expect(caller.tenant()).rejects.toThrow("No tenant selected");
    });

    it("should pass for valid tenant", async () => {
      const ctx = {
        session: {
          user: { id: "user-1", name: "Test User", email: "test@test.com" },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        user: { id: "user-1", name: "Test User", email: "test@test.com" },
        tenantId: "tenant-1",
        headers: new Headers(),
      };

      const caller = router({
        tenant: tenantProcedure.query(({ ctx }) => ctx.tenantId),
      }).createCaller(ctx);

      const result = await caller.tenant();
      expect(result).toBe("tenant-1");
    });
  });

  // Test publicProcedure (should always pass)
  describe("publicProcedure", () => {
    it("should work without authentication", async () => {
      const ctx = {
        session: null,
        user: null,
        tenantId: null,
        headers: new Headers(),
      };

      const caller = router({
        public: publicProcedure.query(() => "public data"),
      }).createCaller(ctx);

      const result = await caller.public();
      expect(result).toBe("public data");
    });
  });
});
