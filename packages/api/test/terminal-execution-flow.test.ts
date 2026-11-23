import { afterEach, describe, expect, it } from "vitest";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { LocalCheckoutController } from "../src/controllers/localCheckoutController";
import { taskImages } from "../src/infra/database/schema";
import { createLocalCheckoutService } from "../src/infra/localCheckoutComposition";
import { closeTaskFixture } from "./task-api-support";
import { terminalHarness } from "./terminal-harness";
import { approvedWork, cleanupTerminalFolders, gitClone, openInput, temporaryFolder } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const IMAGE_ID = "00000000-0000-4000-8000-000000000101";
const TASK_ID = "00000000-0000-4000-8000-000000000011";
const ISSUE_BODY = `Corpo\n![tela](https://github.com/acme/private/blob/flow-dev-assets/issue-images/${TASK_ID}/${IMAGE_ID}.png?raw=true)`;

describe("V-10a link, attach and open through the environment-selected launcher", () => {
  it("records the exact edited prompt plus the Anexos section, with the files and skills in contexto/", async () => {
    const setup = await approvedWork(ISSUE_BODY);
    await setup.database.insert(taskImages).values({ id: IMAGE_ID, taskId: setup.taskId, projectId: setup.project.id, uploadedByUserId: setup.ownerId, contentType: "image/png", byteSize: PNG.byteLength, sha256: "a".repeat(64), content: PNG });
    const recordFile = join(await temporaryFolder("launch-"), "launch.json");
    const harness = await terminalHarness(setup, { fakeLaunchFile: recordFile });
    const clone = await gitClone();
    const actor = { userId: setup.ownerId };
    const links = new LocalCheckoutController(createLocalCheckoutService(setup.database));
    expect(await links.save(actor, { projectId: setup.project.id, path: clone })).toMatchObject({ path: clone, version: 1 });
    const scope = { projectId: setup.project.id, taskId: setup.taskId };
    const preflight = await harness.caller.terminal.preflight(scope);
    expect(preflight.issueImages).toHaveLength(1);
    const note = await harness.attachments.upload(actor, { ...scope, name: "nota.md", content: new Uint8Array(Buffer.from("# nota")) });
    const print = await harness.attachments.upload(actor, { ...scope, name: "print.png", content: PNG });
    const prompt = `${preflight.defaultPrompt}\nUse o componente Button existente.`;
    const result = await harness.caller.terminal.open(openInput(setup, { prompt, attachmentIds: [note.id, print.id], issueImageIds: [] }) as never);
    const recorded = JSON.parse(await readFile(recordFile, "utf8")) as { file: string; args: string[] };
    const folder = join(harness.state, "flow-dev", "terminal-sessions", result.sessionId, "contexto");
    expect(recorded.file).toBe("gnome-terminal");
    const settings = join(harness.state, "flow-dev", "terminal-sessions", result.sessionId, "privado", "settings.json");
    expect(recorded.args.slice(0, 9)).toEqual([`--working-directory=${clone}`, "--", "claude", "--dangerously-skip-permissions", "--plugin-dir", folder, "--settings", settings, "--"]);
    const attachmentLines = [`- nota.md (text/markdown): ${join(folder, "anexos", "01-nota.md")}`, `- print.png (image/png): ${join(folder, "anexos", "02-print.png")}`];
    expect(recorded.args.at(-1)).toBe(`${prompt}\n\nAnexos (leia antes de começar):\n${attachmentLines.join("\n")}`);
    expect((await readdir(join(folder, "anexos"))).sort()).toEqual(["01-nota.md", "02-print.png"]);
    expect((await readdir(join(folder, "skills"))).sort()).toEqual(["direct-executor", "spec-conformance", "spec-to-tasks", "spec-writer"]);
    expect((await stat(join(folder, ".claude-plugin", "plugin.json"))).isFile()).toBe(true);
    expect((await harness.caller.byId(scope)).terminal.lastOpened).toMatchObject({ userName: "Member" });
  });
});
