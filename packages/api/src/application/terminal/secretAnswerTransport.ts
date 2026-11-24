import type { ValidatedAnswers } from "../services/terminal/questionAnswerValidation";

export const SECRET_ANSWER_HIDDEN = "(resposta oculta)";
export const SECRET_ANSWER_CHANNEL = "flow_session_secret_answer";
export const SECRET_ANSWER_ACK_CHANNEL = "flow_session_secret_ack";

export type SecretAnswerDelivery = { requestId: string; deliveryId: string; answers: ValidatedAnswers; answeredBy: string; at: string };
export type SecretAnswerChunk = { requestId: string; deliveryId: string; sequence: number; total: number; data: string };
export type SecretAnswerAck = { deliveryId: string; accepted: boolean };

export interface SecretAnswerSender {
  deliver(input: SecretAnswerDelivery): Promise<boolean>;
}

export interface SecretAnswerListener {
  start(): Promise<void>;
  stop(): Promise<void>;
}
