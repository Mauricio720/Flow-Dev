import { TaskError } from "./taskErrors";

const MAX_MESSAGE_CODE_POINTS = 10_000;
const MAX_HISTORY_BYTES = 100_000;

export function validateUserMessage(message: string) {
  if (!message.trim()) throw new TaskError("blank_message");
  if ([...message].length > MAX_MESSAGE_CODE_POINTS) throw new TaskError("input_limit");
  return message;
}

export function buildGenerationInput<T extends object>(input: T): T {
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > MAX_HISTORY_BYTES) throw new TaskError("input_capacity");
  return input;
}

export function validateHistorySearch(search?: string) {
  if (search && [...search].length > 200) throw new TaskError("input_limit");
  return search;
}
