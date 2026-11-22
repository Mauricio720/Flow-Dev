import { describe, expect, it } from "vitest";
import { buildTerminalCommand } from "./terminalCommand";

const BASE = { checkoutPath: "/home/ana/Área de trabalho/shop", contextDir: "/state/flow-dev/terminal-sessions/s1/contexto" };

describe("buildTerminalCommand", () => {
  it("V-04a runs gnome-terminal with the prompt as a single argument", () => {
    const command = buildTerminalCommand({ ...BASE, prompt: "faça isto e aquilo" });
    expect(command.file).toBe("gnome-terminal");
    expect(command.args.filter((arg) => arg === "faça isto e aquilo")).toHaveLength(1);
  });

  it("V-04b keeps a prompt starting with --help literal and last, after the separator", () => {
    const { args } = buildTerminalCommand({ ...BASE, prompt: "--help" });
    expect(args.at(-1)).toBe("--help");
    expect(args.at(-2)).toBe("--");
  });

  it("V-04c uses the exact argument order recorded in the spike", () => {
    const { args } = buildTerminalCommand({ ...BASE, prompt: "p" });
    expect(args).toEqual([`--working-directory=${BASE.checkoutPath}`, "--", "claude", "--dangerously-skip-permissions", "--plugin-dir", BASE.contextDir, "--", "p"]);
  });

  it("V-04g passes quotes, command substitution, backticks and newlines byte for byte", () => {
    const prompt = "Teste \"aspas\" 'simples' $(whoami) `crase`\n\nlinha \\ $HOME";
    expect(buildTerminalCommand({ ...BASE, prompt }).args.at(-1)).toBe(prompt);
  });

  it("adds no isolation flags, so the session keeps the person's own setup", () => {
    const { args } = buildTerminalCommand({ ...BASE, prompt: "p" });
    expect(args.join(" ")).not.toMatch(/--setting-sources|--model|--add-dir/);
  });
});
