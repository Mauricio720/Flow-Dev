const KILL_ESCALATION_MS = 2000;
const GROUP_POLL_MS = 50;
const GROUP_EXIT_LIMIT_MS = 4000;

function groupAlive(pid: number) {
  try { process.kill(-pid, 0); return true; } catch { return false; }
}

function signalGroup(pid: number, signal: NodeJS.Signals) {
  try { process.kill(-pid, signal); } catch { return; }
}

export async function killGroup(pid: number) {
  signalGroup(pid, "SIGTERM");
  const escalation = setTimeout(() => signalGroup(pid, "SIGKILL"), KILL_ESCALATION_MS);
  const limit = Date.now() + GROUP_EXIT_LIMIT_MS;
  while (groupAlive(pid) && Date.now() < limit) await new Promise((resolve) => setTimeout(resolve, GROUP_POLL_MS));
  clearTimeout(escalation);
  signalGroup(pid, "SIGKILL");
}
