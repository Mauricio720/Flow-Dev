import type postgres from "postgres";
import type { SecretAnswerAck, SecretAnswerDelivery, SecretAnswerSender } from "../../application/terminal/secretAnswerTransport";
import { SECRET_ANSWER_ACK_CHANNEL, SECRET_ANSWER_CHANNEL } from "../../application/terminal/secretAnswerTransport";
import { encodeSecretAnswer } from "./secretAnswerChunks";

const ACK_TIMEOUT_MS = 1_500;

export class PostgresSecretAnswerSender implements SecretAnswerSender {
  constructor(private readonly sql: postgres.Sql, private readonly ackTimeoutMs = ACK_TIMEOUT_MS) {}

  async deliver(input: SecretAnswerDelivery): Promise<boolean> {
    let resolveAck!: (accepted: boolean) => void;
    const ack = new Promise<boolean>((resolve) => { resolveAck = resolve; });
    const subscription = this.sql.listen(SECRET_ANSWER_ACK_CHANNEL, (payload) => {
      const message = parseAck(payload);
      if (message?.deliveryId === input.deliveryId) resolveAck(message.accepted);
    });
    const listening = await subscription;
    const timer = setTimeout(() => resolveAck(false), this.ackTimeoutMs);
    try {
      for (const payload of encodeSecretAnswer(input)) await this.sql.notify(SECRET_ANSWER_CHANNEL, payload);
      return await ack;
    } finally {
      clearTimeout(timer);
      await listening.unlisten();
    }
  }
}

function parseAck(payload: string): SecretAnswerAck | null {
  try {
    const value = JSON.parse(payload) as SecretAnswerAck;
    return typeof value.deliveryId === "string" && typeof value.accepted === "boolean" ? value : null;
  } catch {
    return null;
  }
}
