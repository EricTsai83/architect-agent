import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireViewerIdentity } from "./lib/auth";
import { ensureHomeWorkspace, ensureRepositoryWorkspace } from "./lib/workspaces";

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
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const identity = await requireViewerIdentity(ctx);

    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Repository not found.");
    }

    return await ensureRepositoryWorkspace(ctx, {
      repositoryId: args.repositoryId,
      name: repository.sourceRepoFullName,
      ownerTokenIdentifier: identity.tokenIdentifier,
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

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_workspaceId_and_lastMessageAt", (q) => q.eq("workspaceId", args.workspaceId))
      .take(1);
    if (threads.length > 0) {
      throw new Error("Repository workspaces with conversations cannot be deleted.");
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
 * Bootstrap a default workspace for new users. Creates a single "Home"
 * workspace that is not tied to any repository — the standard landing
 * workspace every user starts with after onboarding.
 *
 * Idempotent: also repairs legacy "General" or duplicate no-repo workspaces
 * so Home stays the one repo-free workspace.
 */
export const initializeWorkspaces = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireViewerIdentity(ctx);
    return await ensureHomeWorkspace(ctx, identity.tokenIdentifier);
  },
});
