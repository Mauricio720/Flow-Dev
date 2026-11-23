import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR } from "./paths";

export type Log = { line(text: string): void; json(label: string, value: unknown): void };

export function createLog(name: string): Log {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `${name}.log`);
  writeFileSync(file, "");
  const write = (text: string) => {
    const stamped = `${new Date().toISOString()} ${text}`;
    appendFileSync(file, `${stamped}\n`);
    console.log(stamped);
  };
  return { line: write, json: (label, value) => write(`${label} ${JSON.stringify(value)}`) };
}

export function verdict(log: Log, id: string, passed: boolean, evidence: string) {
  log.line(`VERDICT ${id} ${passed ? "PASSOU" : "FALHOU"} :: ${evidence}`);
}
