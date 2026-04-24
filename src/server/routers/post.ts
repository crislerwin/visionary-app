import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tenantProcedure, router } from "@/lib/trpc/trpc";
import { prisma } from "@/lib/db";

const postFilterSchema = z.object({
  tenantId: z.string(),
  published: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const createPostSchema = z.object({
  tenantId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().max(10000).optional(),
  published: z.boolean().default(false),
});

const updatePostSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(10000).optional().nullable(),
  published: z.boolean().optional(),
});

const deletePostSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
});

export const postRouter = router({
  list: tenantProcedure.input(postFilterSchema).query(async ({ ctx, input }) => {
    const where = {
      tenantId: input.tenantId,
      ...(input.published !== undefined && { published: input.published }),
    };

    const posts = await prisma.post.findMany({
      where,
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    let nextCursor: typeof input.cursor | undefined = undefined;
    if (posts.length > input.limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem?.id;
    }

    return {
      posts,
      nextCursor,
    };
  }),

  byId: tenantProcedure.input(z.object({ id: z.string(), tenantId: z.string() })).query(async ({ input }) => {
    const post = await prisma.post.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!post) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Post not found",
      });
    }

    return post;
  }),

  create: tenantProcedure.input(createPostSchema).mutation(async ({ ctx, input }) => {
    const post = await prisma.post.create({
      data: {
        title: input.title,
        content: input.content,
        published: input.published,
        authorId: ctx.user.id,
        tenantId: input.tenantId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return post;
  }),

  update: tenantProcedure.input(updatePostSchema).mutation(async ({ ctx, input }) => {
    const existingPost = await prisma.post.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
      },
    });

    if (!existingPost) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Post not found",
      });
    }

    // Only author or admin can update
    if (existingPost.authorId !== ctx.user.id) {
      // Check if user is admin/owner in tenant
      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: ctx.user.id,
            tenantId: input.tenantId,
          },
        },
      });

      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this post",
        });
      }
    }

    const post = await prisma.post.update({
      where: { id: input.id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.published !== undefined && { published: input.published }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return post;
  }),

  delete: tenantProcedure.input(deletePostSchema).mutation(async ({ ctx, input }) => {
    const existingPost = await prisma.post.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
      },
    });

    if (!existingPost) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Post not found",
      });
    }

    // Only author or admin can delete
    if (existingPost.authorId !== ctx.user.id) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: ctx.user.id,
            tenantId: input.tenantId,
          },
        },
      });

      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this post",
        });
      }
    }

    await prisma.post.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),
});
