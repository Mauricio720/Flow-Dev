import type { SessionMessageDao } from "../../terminal/sessionInteractionPorts";

export type SystemMessageInput = { sessionId: string; content: string; requestKey: string };
export type SystemMessageSenderDeps = { messages: Pick<SessionMessageDao, "insertUserMessage"> };

export class SystemMessageSender {
  constructor(private readonly deps: SystemMessageSenderDeps) {}

  async send(input: SystemMessageInput): Promise<{ created: boolean }> {
    const { created } = await this.deps.messages.insertUserMessage(input);
    return { created };
  }
}
