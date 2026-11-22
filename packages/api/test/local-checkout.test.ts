import { afterEach, describe, expect, it } from "vitest";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { users } from "../src/infra/database/schema";
import { SSH_REMOTE, clone, closeCheckoutFixture, failureOf, setup } from "./local-checkout-support";

afterEach(closeCheckoutFixture);

describe("projects.localCheckout", () => {
  it("V-01a saves a valid clone under a path with space and accent and reads it back", async () => {
    const { state, project, caller } = await setup();
    const path = await clone([SSH_REMOTE]);
    const saved = await caller(state.member.id).localCheckout.save({ projectId: project.id, path });
    expect(saved).toMatchObject({ path, version: 1 });
    expect(Number.isNaN(Date.parse(saved.verifiedAt))).toBe(false);
    expect(await caller(state.member.id).localCheckout.get({ projectId: project.id })).toEqual(saved);
  });

  it("V-01c refuses a missing folder and keeps the previous link", async () => {
    const { state, project, caller } = await setup();
    const path = await clone([SSH_REMOTE]);
    await caller(state.member.id).localCheckout.save({ projectId: project.id, path });
    const error = await failureOf(caller(state.member.id).localCheckout.save({ projectId: project.id, path: "/nonexistent/flow-dev" }));
    expect(error).toMatchObject({ code: "BAD_REQUEST", message: "Pasta não encontrada: /nonexistent/flow-dev." });
    expect((await caller(state.member.id).localCheckout.get({ projectId: project.id }))?.path).toBe(path);
  });

  it("refuses a relative path, a plain folder and a subfolder with the section 7.1 messages", async () => {
    const { state, project, caller } = await setup();
    const path = await clone([SSH_REMOTE]);
    const save = (value: string) => failureOf(caller(state.member.id).localCheckout.save({ projectId: project.id, path: value }));
    expect((await save("shop")).message).toBe("Informe o caminho completo da pasta, começando por /.");
    expect((await save(tmpdir())).message).toBe("Esta pasta não é a raiz de um repositório git.");
    await mkdir(join(path, "src"));
    expect((await save(join(path, "src"))).message).toBe(`Escolha a raiz do repositório: ${path}.`);
  });

  it("V-01f refuses another repository and keeps the previous link", async () => {
    const { state, project, caller } = await setup();
    const good = await clone([SSH_REMOTE]);
    await caller(state.member.id).localCheckout.save({ projectId: project.id, path: good });
    const blog = await clone(["https://github.com/acme/blog.git"], "blog");
    const error = await failureOf(caller(state.member.id).localCheckout.save({ projectId: project.id, path: blog }));
    expect(error.message).toBe("Esta pasta não é um clone de acme/private. Remotes encontrados: acme/blog.");
    expect((await caller(state.member.id).localCheckout.get({ projectId: project.id }))?.path).toBe(good);
  });

  it("V-01g accepts a fork origin when upstream is the project repository", async () => {
    const { state, project, caller } = await setup();
    const path = await clone(["git@github.com:ana/private.git", "https://github.com/ACME/Private"]);
    expect(await caller(state.member.id).localCheckout.save({ projectId: project.id, path })).toMatchObject({ path });
  });

  it("V-01i shows each person only their own link and hides the project from outsiders", async () => {
    const { state, project, caller } = await setup();
    await caller(state.member.id).localCheckout.save({ projectId: project.id, path: await clone([SSH_REMOTE]) });
    expect(await caller(state.admin.id).localCheckout.get({ projectId: project.id })).toBeNull();
    const [outsider] = await state.database.insert(users).values({ name: "Out", email: "out@test.invalid" }).returning();
    expect((await failureOf(caller(outsider!.id).localCheckout.get({ projectId: project.id }))).code).toBe("NOT_FOUND");
  });

  it("V-01j answers a stale expected version with CONFLICT and keeps the link", async () => {
    const { state, project, caller } = await setup();
    const path = await clone([SSH_REMOTE]);
    await caller(state.member.id).localCheckout.save({ projectId: project.id, path });
    const error = await failureOf(caller(state.member.id).localCheckout.save({ projectId: project.id, path, expectedVersion: 5 }));
    expect(error.code).toBe("CONFLICT");
    expect((await caller(state.member.id).localCheckout.get({ projectId: project.id }))?.version).toBe(1);
  });

  it("V-01k replaces the folder bumping the version, then removes the link", async () => {
    const { state, project, caller } = await setup();
    const first = await clone([SSH_REMOTE]);
    const second = await clone([SSH_REMOTE], "shop2");
    await caller(state.member.id).localCheckout.save({ projectId: project.id, path: first });
    const replaced = await caller(state.member.id).localCheckout.save({ projectId: project.id, path: second, expectedVersion: 1 });
    expect(replaced).toMatchObject({ path: second, version: 2 });
    expect(await caller(state.member.id).localCheckout.remove({ projectId: project.id })).toEqual({ removed: true });
    expect(await caller(state.member.id).localCheckout.get({ projectId: project.id })).toBeNull();
  });
});
