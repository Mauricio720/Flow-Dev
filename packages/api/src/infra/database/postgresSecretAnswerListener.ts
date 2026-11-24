import type postgres from "postgres";
import type { SecretAnswerAck, SecretAnswerListener } from "../../application/terminal/secretAnswerTransport";
import { SECRET_ANSWER_ACK_CHANNEL, SECRET_ANSWER_CHANNEL } from "../../application/terminal/secretAnswerTransport";
import { decodeSecretAnswer, parseChunk } from "./secretAnswerChunks";

const ASSEMBLY_TTL_MS = 5_000;
type Assembly = { requestId: string; total: number; chunks: Map<number, string>; createdAt: number };

export class PostgresSecretAnswerListener implements SecretAnswerListener {
  private subscription: Awaited<ReturnType<postgres.Sql["listen"]>> | null = null;
  private readonly assemblies = new Map<string, Assembly>();

  constructor(private readonly sql: postgres.Sql, private readonly receive: (delivery: NonNullable<ReturnType<typeof decodeSecretAnswer>>) => Promise<boolean>) {}

  async start() {
    if (!this.subscription) this.subscription = await this.sql.listen(SECRET_ANSWER_CHANNEL, (payload) => { void this.accept(payload).catch(() => undefined); });
  }

  async stop() {
    const subscription = this.subscription;
    this.subscription = null;
    this.assemblies.clear();
    await subscription?.unlisten();
  }

  private async accept(payload: string) {
    const chunk = parseChunk(payload);
    if (!chunk) return;
    this.expireAssemblies();
    const assembly = this.assemblyFor(chunk);
    if (!assembly) return this.ack(chunk.deliveryId, false);
    assembly.chunks.set(chunk.sequence, chunk.data);
    if (assembly.chunks.size !== assembly.total) return;
    this.assemblies.delete(chunk.deliveryId);
    const delivery = decodeSecretAnswer(Array.from({ length: assembly.total }, (_, index) => assembly.chunks.get(index) ?? ""));
    const valid = delivery?.requestId === chunk.requestId && delivery.deliveryId === chunk.deliveryId;
    let accepted = false;
    if (valid) accepted = await this.receive(delivery!).catch(() => false);
    await this.ack(chunk.deliveryId, accepted);
  }

  private assemblyFor(chunk: NonNullable<ReturnType<typeof parseChunk>>) {
    const current = this.assemblies.get(chunk.deliveryId);
    if (current && (current.requestId !== chunk.requestId || current.total !== chunk.total)) {
      this.assemblies.delete(chunk.deliveryId);
      return null;
    }
    const assembly = current ?? { requestId: chunk.requestId, total: chunk.total, chunks: new Map(), createdAt: Date.now() };
    this.assemblies.set(chunk.deliveryId, assembly);
    return assembly;
  }

  private expireAssemblies() {
    const cutoff = Date.now() - ASSEMBLY_TTL_MS;
    for (const [deliveryId, item] of this.assemblies) if (item.createdAt < cutoff) this.assemblies.delete(deliveryId);
  }

  private ack(deliveryId: string, accepted: boolean) {
    const message: SecretAnswerAck = { deliveryId, accepted };
    return this.sql.notify(SECRET_ANSWER_ACK_CHANNEL, JSON.stringify(message));
  }
}
