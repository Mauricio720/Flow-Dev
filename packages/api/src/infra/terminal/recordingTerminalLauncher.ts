import { writeFile } from "node:fs/promises";
import type { TerminalCommand, TerminalLauncher } from "../../application/terminal/terminalLauncher";

export class RecordingTerminalLauncher implements TerminalLauncher {
  constructor(private readonly recordFile: string) {}

  async launch(command: TerminalCommand) {
    await writeFile(this.recordFile, JSON.stringify({ file: command.file, args: command.args }), "utf8");
  }
}
