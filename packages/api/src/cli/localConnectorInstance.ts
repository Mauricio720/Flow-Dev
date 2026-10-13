import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const CONNECTOR_SCRIPT = "localConnector";
const HANDOVER_ATTEMPTS = 20;
const HANDOVER_WAIT_MS = 500;

export type InstanceProbe = { isConnector(pid: number): Promise<boolean>; wait(ms: number): Promise<void> };

export class ConnectorAlreadyRunningError extends Error {
  constructor(readonly pid: number) {
    super(`Conector local: já existe um conector rodando nesta máquina (PID ${pid}). Encerre-o antes de iniciar outro.`);
  }
}

/** Two connectors on one machine share the journal and the checkout locks and split the runs between them. */
export async function claimConnectorInstance(path: string, probe: InstanceProbe = processProbe) {
  const holder = await holderOf(path);
  if (holder !== null && holder !== process.pid && !(await handedOver(holder, probe))) throw new ConnectorAlreadyRunningError(holder);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${process.pid}\n`, { mode: 0o600 });
}

async function holderOf(path: string) {
  const recorded = await readFile(path, "utf8").catch(() => "");
  return /^\d+\n?$/.test(recorded) ? Number(recorded.trim()) : null;
}

/** A watch-mode restart starts the new connector while the previous one is still shutting down. */
async function handedOver(holder: number, probe: InstanceProbe) {
  for (let attempt = 0; attempt < HANDOVER_ATTEMPTS; attempt += 1) {
    if (!(await probe.isConnector(holder))) return true;
    await probe.wait(HANDOVER_WAIT_MS);
  }
  return false;
}

const processProbe: InstanceProbe = {
  async isConnector(pid) {
    try { process.kill(pid, 0); } catch { return false; }
    const commandLine = await readFile(`/proc/${pid}/cmdline`, "utf8").catch(() => null);
    return commandLine === null || commandLine.includes(CONNECTOR_SCRIPT);
  },
  wait: (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms)),
};
