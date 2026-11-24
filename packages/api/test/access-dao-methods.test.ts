import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssignmentService } from "../src/application/services/access/assignmentService";
import { AccessController } from "../src/controllers/accessController";
import { designateAdmin, fixture, type Fixture } from "./fixture";
import { insertGithubUser, insertGoogleUser, linkGithub, linkPassword } from "./access-methods-support";

let state: Fixture;
beforeEach(async () => { state = await fixture(); });
afterEach(async () => { await state.close(); });
const controller = () => new AccessController(new AssignmentService(state.permissions), state.permissions);
const USER_PAGE_SIZE = 50;
const EXTRA_GOOGLE_USERS = USER_PAGE_SIZE + 2;
const FIXTURE_USERS = 2;

describe("user lookup across sign-in methods", () => {
  it("V-03a finds a Google-only user with empty GitHub fields and the Google email", async () => {
    const ana = await insertGoogleUser(state, { name: "Ana Souza", email: "ana@gmail.com" });
    expect(await state.permissions.findUser(ana.id)).toMatchObject({ id: ana.id, githubId: null, githubLogin: null, email: "ana@gmail.com", displayName: "Ana Souza", assignmentCount: 0 });
  });

  it("keeps a GitHub-created user identified by the GitHub login and hides the synthetic email", async () => {
    const alice = await insertGithubUser(state, { login: "alice", githubId: "1001" });
    expect(await state.permissions.findUser(alice.id)).toMatchObject({ id: alice.id, githubId: "1001", githubLogin: "alice", email: null });
  });

  it("returns null for an unknown user", async () => expect(await state.permissions.findUser("00000000-0000-4000-8000-000000000999")).toBeNull());

  it("V-03a answers me for a Google-only user as non admin with only the Google method", async () => {
    const ana = await insertGoogleUser(state, { name: "Ana Souza", email: "ana@gmail.com" });
    expect(await controller().me({ userId: ana.id })).toEqual({ id: ana.id, githubLogin: null, isAdmin: false, lastProjectId: null, methods: { github: false, google: true, password: false } });
  });

  it("reports every method linked to the same user", async () => {
    const ana = await insertGoogleUser(state, { name: "Ana Souza", email: "ana@gmail.com" });
    await linkGithub(state, ana.id, "1001");
    await linkPassword(state, ana.id);
    expect((await controller().me({ userId: ana.id })).methods).toEqual({ github: true, google: true, password: true });
  });

  it("keeps answering me for a GitHub-created user", async () => {
    const me = await controller().me({ userId: state.member.id });
    expect(me).toEqual({ id: state.member.id, githubLogin: "Member", isAdmin: false, lastProjectId: null, methods: { github: true, google: false, password: false } });
  });
});

describe("assignment and administrator search for users of any method", () => {
  it("V-03b lets the administrator assign a project to a Google-only user and lists it for them", async () => {
    const ana = await insertGoogleUser(state, { name: "Ana Souza", email: "ana@gmail.com" });
    const alfa = await state.project(undefined, "Alfa");
    const service = new AssignmentService(state.permissions);
    await service.assign({ userId: state.admin.id }, { userId: ana.id, projectId: alfa.id });
    expect((await state.caller(ana.id).list({})).items.map((project) => project.name)).toEqual(["Alfa"]);
    expect((await service.listAssignments({ userId: state.admin.id }, ana.id)).items.map((project) => project.id)).toEqual([alfa.id]);
    expect(await state.permissions.findUser(ana.id)).toMatchObject({ assignmentCount: 1 });
  });

  it("V-03c shows the email in the administrator search only for the user without GitHub", async () => {
    const ana = await insertGoogleUser(state, { name: "Ana Souza", email: "ana@gmail.com" });
    const anaDev = await insertGithubUser(state, { login: "ana-dev", githubId: "1001" });
    const page = await controller().users({ userId: state.admin.id }, { search: "Ana" });
    expect(page.items).toHaveLength(2);
    expect(page.items.find((item) => item.id === ana.id)).toMatchObject({ githubLogin: null, email: "ana@gmail.com", displayName: "Ana Souza" });
    expect(page.items.find((item) => item.id === anaDev.id)).toMatchObject({ githubLogin: "ana-dev", email: null });
  });

  it("pages through users without GitHub without repeating or skipping any", async () => {
    for (let index = 0; index < EXTRA_GOOGLE_USERS; index++) await insertGoogleUser(state, { name: `Pessoa ${String(index).padStart(2, "0")}`, email: `pessoa${index}@gmail.com` });
    const first = await controller().users({ userId: state.admin.id }, {});
    const second = await controller().users({ userId: state.admin.id }, { cursor: first.nextCursor ?? undefined });
    expect(first.items).toHaveLength(USER_PAGE_SIZE);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(EXTRA_GOOGLE_USERS + FIXTURE_USERS);
  });
});

describe("administrator designation stays tied to the GitHub identity", () => {
  it("V-03d treats a user without a linked GitHub as non admin even with the administrator's name", async () => {
    const lookalike = await insertGoogleUser(state, { name: "admin", email: "admin@gmail.com" });
    expect(await state.permissions.isAdmin(lookalike.id)).toBe(false);
    expect((await controller().me({ userId: lookalike.id })).isAdmin).toBe(false);
  });

  it("V-03d makes a Google user an administrator only after linking the designated GitHub account", async () => {
    const ana = await insertGoogleUser(state, { name: "Ana Souza", email: "ana@gmail.com" });
    await designateAdmin(state, "9001", "ana-dev");
    expect(await state.permissions.isAdmin(ana.id)).toBe(false);
    await linkGithub(state, ana.id, "9001");
    expect(await state.permissions.isAdmin(ana.id)).toBe(true);
  });

  it("V-08b keeps the GitHub-designated administrator and leaves the designation list unchanged", async () => {
    await insertGoogleUser(state, { name: "Admin", email: "admin@gmail.com" });
    await state.permissions.replaceAdmins([{ githubUserId: "77", resolvedLogin: "admin" }]);
    expect(await state.permissions.isAdmin(state.admin.id)).toBe(true);
    expect(await state.permissions.isAdmin(state.member.id)).toBe(false);
    const designations = await state.client`select github_user_id, resolved_login from admin_designations`;
    expect([...designations]).toEqual([{ github_user_id: "77", resolved_login: "admin" }]);
  });
});
