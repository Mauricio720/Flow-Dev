import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { fixture, type Fixture } from "./fixture";
import { createProjectsRouter } from "../src/routers/projects";
import { LocalCheckoutController } from "../src/controllers/localCheckoutController";
import { LocalCheckoutService } from "../src/application/services/projects/localCheckoutService";
import { DrizzleLocalCheckoutDao } from "../src/infra/database/dao/projects/drizzleLocalCheckoutDao";
import { ExecGitCheckoutInspector } from "../src/infra/terminal/execGitCheckoutInspector";

let state: Fixture | undefined;
const folders: string[] = [];

export async function closeCheckoutFixture() {
  await state?.close();
  state = undefined;
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
}

export async function clone(remotes: string[], name = "shop") {
  const base = await mkdtemp(join(tmpdir(), "checkout-"));
  folders.push(base);
  const root = join(base, "Área de trabalho", name);
  await mkdir(root, { recursive: true });
  execFileSync("git", ["init", "-q"], { cwd: root });
  remotes.forEach((url, index) => execFileSync("git", ["remote", "add", index === 0 ? "origin" : `extra${index}`, url], { cwd: root }));
  return root;
}

export async function setup() {
  state = await fixture();
  const project = await state.project();
  const service = new LocalCheckoutService({ checkouts: new DrizzleLocalCheckoutDao(state.database), inspector: new ExecGitCheckoutInspector(), projects: state.dao, permissions: state.permissions });
  const router = createProjectsRouter(state.controller, undefined, new LocalCheckoutController(service));
  const caller = (userId: string) => router.createCaller({ principal: { userId }, requestId: "integration" });
  await state.permissions.assign(state.member.id, project.id, state.admin.id);
  return { state, project, caller };
}

export async function failureOf(promise: Promise<unknown>) {
  const error = await promise.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}


export const SSH_REMOTE = "git@github.com:acme/private.git";
