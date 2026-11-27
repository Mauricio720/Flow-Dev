import type { AgentImage } from "../../application/agents/agentImages";

export function claudeStreamInput(prompt: string, images: AgentImage[]) {
  const content = [
    { type: "text", text: prompt },
    ...images.map((image) => ({ type: "image", source: { type: "base64", media_type: image.contentType, data: Buffer.from(image.content).toString("base64") } })),
  ];
  return `${JSON.stringify({ type: "user", message: { role: "user", content } })}\n`;
}
