import { execFileSync } from "node:child_process";
import { toolUses, type Session } from "./lib";

export function longCommandPrompt(seconds: number) {
  return `Rode exatamente o comando \`node -e "setTimeout(() => {}, ${seconds * 1000})"\` com a ferramenta Bash, em primeiro plano (sem run_in_background), e quando terminar diga FIM.`;
}

export function bashStarted(session: Session, from = 0) {
  return session.waitFor((message) => message.type === "assistant" && toolUses(message).some((use) => use.name === "Bash"), 90_000, from);
}

export function childProcessIds(): number[] {
  try {
    const output = execFileSync("pgrep", ["-P", String(process.pid)], { encoding: "utf8" });
    return output.split("\n").filter(Boolean).map(Number);
  } catch {
    return [];
  }
}
