import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireViewerIdentity } from "./lib/auth";

/**
 * Workspace color palette. Assigned deterministically based on the user's
 * workspace count at creation time, cycling through the palette.
 */
const COLOR_PALETTE = [
  "blue",
  "emerald",
  "amber",
  "violet",
  "rose",
  "cyan",
  "orange",
  "teal",
] as const;

export const listWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireViewerIdentity(ctx);
    return await ctx.db
      .query("workspaces")
      .withIndex("by_ownerTokenIdentifier_and_lastAccessedAt", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(20);
  },
});

export const createWorkspace = mutation({
  args: {
    name: v.optional(v.string()),
    repositoryId: v.optional(v.id("repositories")),
  },
  handler: async (ctx, args) => {
    const identity = await requireViewerIdentity(ctx);

    // Validate repository ownership if provided. Also resolve name from the
    // repo when the caller didn't provide one.
    let resolvedName = args.name?.trim() || "";
    if (args.repositoryId) {
      const repository = await ctx.db.get(args.repositoryId);
      if (!repository || repository.ownerTokenIdentifier !== identity.tokenIdentifier) {
        throw new Error("Repository not found.");
      }
      if (!resolvedName) {
        resolvedName = repository.sourceRepoName;
      }

      // Prevent duplicate workspace for the same repo.
      const existing = await ctx.db
        .query("workspaces")
        .withIndex("by_ownerTokenIdentifier_and_repositoryId", (q) =>
          q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("repositoryId", args.repositoryId),
        )
        .take(1);
      if (existing.length > 0) {
        // Return the existing workspace instead of creating a duplicate.
        await ctx.db.patch(existing[0]._id, { lastAccessedAt: Date.now() });
        return existing[0]._id;
      }
    }

    // Assign color based on current workspace count (cycles through palette).
    const existingCount = await ctx.db
      .query("workspaces")
      .withIndex("by_ownerTokenIdentifier_and_lastAccessedAt", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .take(20);

    const color = COLOR_PALETTE[existingCount.length % COLOR_PALETTE.length];

    return await ctx.db.insert("workspaces", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      repositoryId: args.repositoryId,
      name: resolvedName || "Workspace",
      color,
      lastAccessedAt: Date.now(),
    });
  },
});

export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await requireViewerIdentity(ctx);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Workspace not found.");
    }

    // The default workspace (no bound repository) cannot be deleted.
    if (!workspace.repositoryId) {
      throw new Error("The default workspace cannot be deleted.");
    }

    // Unlink threads from this workspace (don't delete them — just orphan them
    // so they become visible in a "General" context or can be re-assigned).
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_workspaceId_and_lastMessageAt", (q) => q.eq("workspaceId", args.workspaceId))
      .take(200);
    for (const thread of threads) {
      await ctx.db.patch(thread._id, { workspaceId: undefined });
    }

    await ctx.db.delete(args.workspaceId);
  },
});

export const touchWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await requireViewerIdentity(ctx);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Workspace not found.");
    }
    await ctx.db.patch(args.workspaceId, { lastAccessedAt: Date.now() });
  },
});

/**
 * Bootstrap a default workspace for new users. Creates a single "General"
 * workspace that is not tied to any repository — the standard landing
 * workspace every user starts with after onboarding.
 *
 * Idempotent: if the user already has at least one workspace, this is a no-op.
 */
export const initializeWorkspaces = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireViewerIdentity(ctx);

    // Skip if the user already has workspaces.
    const existingWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_ownerTokenIdentifier_and_lastAccessedAt", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .take(1);
    if (existingWorkspaces.length > 0) {
      return { created: 0 };
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_ownerTokenIdentifier_and_lastMessageAt", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .take(200);

    const now = Date.now();

    // Always create a default "General" workspace. This is the workspace
    // every new user lands in — it is not tied to any repository.
    const color = COLOR_PALETTE[0];
    const generalId = await ctx.db.insert("workspaces", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      name: "General",
      color,
      lastAccessedAt: now,
    });

    // Assign all existing threads to the default workspace.
    for (const thread of threads) {
      await ctx.db.patch(thread._id, { workspaceId: generalId });
    }

    return { created: 1 };
  },
});
