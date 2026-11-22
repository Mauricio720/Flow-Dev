import { taskImages } from "../src/infra/database/schema";
import { approvedWork, gitClone, linkClone, openInput } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";

const TASK_ID = "00000000-0000-4000-8000-000000000011";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
export const imageId = (number: number) => `00000000-0000-4000-8000-0000000001${String(number).padStart(2, "0")}`;
const letter = (number: number) => String.fromCharCode(64 + number);

export async function attachmentWorld(issueImageCount: number) {
  const numbers = Array.from({ length: issueImageCount }, (_value, index) => index + 1);
  const body = numbers.map((number) => `![tela ${letter(number)}](https://github.com/acme/private/blob/flow-dev-assets/issue-images/${TASK_ID}/${imageId(number)}.png?raw=true)`).join("\n");
  const setup = await approvedWork(body || "Corpo");
  for (const number of numbers) {
    const content = new Uint8Array([...PNG, number]);
    await setup.database.insert(taskImages).values({ id: imageId(number), taskId: setup.taskId, projectId: setup.project.id, uploadedByUserId: setup.ownerId, contentType: "image/png", byteSize: content.byteLength, sha256: String(number).padStart(64, "0"), content });
  }
  await linkClone(setup, await gitClone());
  const harness = await terminalHarness(setup);
  const upload = (name: string, content: Uint8Array) => harness.attachments.upload({ userId: setup.ownerId }, { projectId: setup.project.id, taskId: setup.taskId, name, content });
  const open = (overrides: Record<string, unknown> = {}) => harness.caller.terminal.open(openInput(setup, overrides) as never);
  return { setup, harness, upload, open };
}
