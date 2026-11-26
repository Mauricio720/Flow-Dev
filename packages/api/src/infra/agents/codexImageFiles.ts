import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AGENT_IMAGE_EXTENSIONS, type AgentImage } from "../../application/agents/agentImages";

export async function writeCodexImageFiles(directory: string, images: AgentImage[]) {
  if (!images.length) return [];
  const imageDirectory = join(directory, "images");
  await mkdir(imageDirectory);
  const paths: string[] = [];
  for (const [index, image] of images.entries()) {
    const extension = AGENT_IMAGE_EXTENSIONS[image.contentType] ?? "bin";
    const path = join(imageDirectory, `${index + 1}.${extension}`);
    await writeFile(path, image.content);
    paths.push(path);
  }
  return paths;
}
