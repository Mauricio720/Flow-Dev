const TAIL_LINES = 5;

export class StderrTail {
  private lines: string[] = [];

  remember(data: string) {
    this.lines = [...this.lines, ...data.split("\n").filter(Boolean)].slice(-TAIL_LINES);
  }

  text() {
    return this.lines.join("\n");
  }
}
