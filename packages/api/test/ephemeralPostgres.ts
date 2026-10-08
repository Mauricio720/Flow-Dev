import { execFile, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const MEMORY_DIRECTORY = "/dev/shm";
const DIRECTORY_PREFIX = "flow-test-postgres-";
const SUPERUSER = "flow_test";
const LOOPBACK = "127.0.0.1";
const MISSING_BINARIES = "Integration tests need a local PostgreSQL installation (pg_config, initdb, pg_ctl) or TEST_DATABASE_URL pointing to a disposable server";
const DISPOSABLE_SETTINGS = ["fsync=off", "synchronous_commit=off", "full_page_writes=off", "wal_level=minimal", "max_wal_senders=0", "max_connections=200", "shared_buffers=256MB", "max_wal_size=256MB", "checkpoint_timeout=30min"];

type Cluster = { bin: string; root: string; data: string };

export async function startEphemeralPostgres() {
  const root = await mkdtemp(join(existsSync(MEMORY_DIRECTORY) ? MEMORY_DIRECTORY : tmpdir(), DIRECTORY_PREFIX));
  const cluster = { bin: await binaryDirectory(), root, data: join(root, "data") };
  const stop = () => stopCluster(cluster);
  process.once("exit", stop);
  const password = randomBytes(24).toString("hex");
  await initialize(cluster, password);
  const port = await freePort();
  await run(join(cluster.bin, "pg_ctl"), ["-D", cluster.data, "-w", "-l", join(root, "server.log"), "-o", serverOptions(cluster, port), "start"]);
  return { url: `postgres://${SUPERUSER}:${password}@${LOOPBACK}:${port}/postgres`, stop };
}

async function binaryDirectory() {
  try {
    return (await run("pg_config", ["--bindir"])).stdout.trim();
  } catch (error) {
    throw new Error(MISSING_BINARIES, { cause: error });
  }
}

async function initialize(cluster: Cluster, password: string) {
  const passwordFile = join(cluster.root, "password");
  await writeFile(passwordFile, password, { mode: 0o600 });
  await run(join(cluster.bin, "initdb"), ["-D", cluster.data, "-U", SUPERUSER, "-A", "scram-sha-256", `--pwfile=${passwordFile}`, "--no-sync"]);
}

function serverOptions(cluster: Cluster, port: number) {
  const settings = [`port=${port}`, `listen_addresses=${LOOPBACK}`, `unix_socket_directories=${cluster.root}`, ...DISPOSABLE_SETTINGS];
  return settings.map((setting) => `-c ${setting}`).join(" ");
}

function stopCluster(cluster: Cluster) {
  spawnSync(join(cluster.bin, "pg_ctl"), ["-D", cluster.data, "-m", "immediate", "stop"], { stdio: "ignore" });
  rmSync(cluster.root, { recursive: true, force: true });
}

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, LOOPBACK, () => {
      const address = probe.address();
      probe.close(() => (address && typeof address === "object" ? resolve(address.port) : reject(new Error("No free port for the test PostgreSQL server"))));
    });
  });
}
