import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import type { LocalCommand, LocalEvent } from "../../application/services/local-execution/localProtocol";
import { validateLocalCommand, validateLocalEvent } from "../../application/services/local-execution/localProtocol";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { localPayloadHash } from "../../application/services/local-execution/localHash";
import { withJournalLock } from "./journalLock";

type JournalEntry = { command: LocalCommand; state: "intent" | "accepted" | "unknown"; runtimeId: string | null; events: LocalEvent[]; uploadedSequences?: number[] };
type Journal = { version: 1; entries: JournalEntry[] };

export class LocalCommandJournal {
  constructor(private readonly path: string, private readonly now: () => Date = () => new Date()) {}

  async dispatch(input: unknown, submit: (command: LocalCommand) => Promise<string>): Promise<{ replayed: boolean; runtimeId: string | null; state: JournalEntry["state"] }> {
    return withJournalLock(this.path, () => this.dispatchLocked(input, submit));
  }

  private async dispatchLocked(input: unknown, submit: (command: LocalCommand) => Promise<string>): Promise<{ replayed: boolean; runtimeId: string | null; state: JournalEntry["state"] }> {
    const command = validateLocalCommand(input);
    if (Date.parse(command.leaseExpiresAt) <= this.now().getTime()) throw new LocalExecutionError("command_expired");
    const journal = await this.read();
    const current = journal.entries.find((entry) => entry.command.commandId === command.commandId);
    if (current) return this.replay(current, command);
    const entry: JournalEntry = { command, state: "intent", runtimeId: null, events: [] };
    await this.write({ ...journal, entries: [...journal.entries, entry] });
    try {
      entry.runtimeId = await submit(command);
      entry.state = "accepted";
    } catch {
      entry.state = "unknown";
    }
    await this.replace(entry);
    return { replayed: false, runtimeId: entry.runtimeId, state: entry.state };
  }

  async recordEvent(value: unknown) {
    return withJournalLock(this.path, () => this.recordEventLocked(value));
  }

  private async recordEventLocked(value: unknown) {
    const event = validateLocalEvent(value);
    const journal = await this.read();
    const entry = journal.entries.find((candidate) => candidate.command.commandId === event.commandId);
    if (!entry || entry.command.runId !== event.runId) throw new LocalExecutionError("command_unavailable");
    if (entry.command.fence !== event.fence) throw new LocalExecutionError("stale_fence");
    const prior = entry.events.find((candidate) => candidate.sequence === event.sequence);
    if (prior) {
      if (prior.payloadHash !== event.payloadHash) throw new LocalExecutionError("event_conflict");
      return { acknowledgedSequence: event.sequence, replayed: true };
    }
    const expected = Math.max(0, ...entry.events.map((candidate) => candidate.sequence)) + 1;
    if (event.sequence !== expected) throw new LocalExecutionError("event_gap");
    entry.events.push(event);
    await this.replace(entry);
    return { acknowledgedSequence: event.sequence, replayed: false };
  }

  async recover(commandId: string) {
    const entry = (await this.read()).entries.find((candidate) => candidate.command.commandId === commandId);
    if (!entry) throw new LocalExecutionError("command_unavailable");
    return entry.state === "intent" ? { ...entry, state: "unknown" as const } : entry;
  }

  async forRun(runId: string) {
    const entry = (await this.read()).entries.find((candidate) => candidate.command.runId === runId);
    if (!entry) throw new LocalExecutionError("command_unavailable");
    const preparation = entry.command.kind === "prepare" ? { preparationId: entry.command.payload.preparationId, actionId: entry.command.payload.actionId, sourceSnapshotId: entry.command.payload.sourceSnapshotId, checkoutLabel: entry.command.payload.checkoutLabel } : null;
    return { commandId: entry.command.commandId, kind: entry.command.kind, state: entry.state === "intent" ? "unknown" as const : entry.state, runtimeId: entry.runtimeId, preparation, events: entry.events };
  }

  async activeCommands() {
    return (await this.read()).entries.filter((entry) => entry.command.kind === "start" && !entry.events.some((event) => event.kind === "terminal")).map((entry) => ({ ...entry }));
  }

  async unsentEvents() {
    return (await this.read()).entries.flatMap((entry) => entry.events.filter((event) => !entry.uploadedSequences?.includes(event.sequence)));
  }

  async acknowledgeEvent(commandId: string, sequence: number) {
    return withJournalLock(this.path, async () => {
      const journal = await this.read();
      const entry = journal.entries.find((candidate) => candidate.command.commandId === commandId);
      if (!entry || !entry.events.some((event) => event.sequence === sequence)) throw new LocalExecutionError("command_unavailable");
      entry.uploadedSequences = [...new Set([...(entry.uploadedSequences ?? []), sequence])];
      await this.replace(entry);
    });
  }

  private replay(entry: JournalEntry, command: LocalCommand) {
    if (entry.command.payloadHash !== command.payloadHash || entry.command.fence !== command.fence) throw new LocalExecutionError("command_payload_changed");
    return { replayed: true, runtimeId: entry.runtimeId, state: entry.state === "intent" ? "unknown" as const : entry.state };
  }

  private async replace(entry: JournalEntry) {
    const journal = await this.read();
    await this.write({ ...journal, entries: journal.entries.map((candidate) => candidate.command.commandId === entry.command.commandId ? entry : candidate) });
  }

  private async read(): Promise<Journal> {
    try { return parseJournal(JSON.parse(await readFile(this.path, "utf8"))); }
    catch (error) { if (isMissing(error)) return { version: 1, entries: [] }; throw new LocalExecutionError("invalid_input", { cause: error }); }
  }

  private async write(value: Journal) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = this.path + "." + randomUUID() + ".tmp";
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(JSON.stringify(value)); await file.sync(); } finally { await file.close(); }
    await rename(temporary, this.path);
    const directory = await open(dirname(this.path), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  }
}

function parseJournal(value: unknown): Journal { if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("entries" in value) || !Array.isArray(value.entries)) throw new Error("journal_invalid"); return value as Journal; }
function isMissing(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"; }
