import { basics } from "./basics";
import { createLog } from "./lib";
import { runExit, runInterrupt, runResume, runWait } from "./lifecycle";
import { runHooks } from "./hooks";
import { runMulti } from "./multi";
import { runPermissions } from "./permissions";

const CASES = { basics, permissions: runPermissions, resume: runResume, interrupt: runInterrupt, hooks: runHooks, wait: runWait, exit: runExit, multi: runMulti };

const name = process.argv[2] as keyof typeof CASES | undefined;
const run = name ? CASES[name] : undefined;
if (!name || !run) {
  console.error(`uso: spike-session.ts <${Object.keys(CASES).join("|")}>`);
  process.exit(2);
}
const log = createLog(name);
run(log, ...process.argv.slice(3)).then(
  () => process.exit(0),
  (error) => {
    log.line(`ERRO ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    process.exit(1);
  },
);
