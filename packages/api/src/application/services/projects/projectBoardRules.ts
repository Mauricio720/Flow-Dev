import type { BoardOwnerKind, BoardReference } from "../../github/projectBoardGateway";
import { ProjectValidationError } from "./projectErrors";

export const BOARD_URL_MAX = 200;
const BOARD_HOST = "github.com";
const BACKLOG_STATUS_NAME = "backlog";
const READY_STATUS_NAME = "ready";
const NUMBER_FIELD_TYPE = "NUMBER";
const OWNER_KINDS: Record<string, BoardOwnerKind> = { orgs: "organization", users: "user" };
// Matches /orgs/<login>/projects/<number> or /users/<login>/projects/<number>, with an optional view suffix.
const BOARD_PATH = /^\/(orgs|users)\/([A-Za-z0-9-]{1,39})\/projects\/([1-9]\d{0,8})(\/.*)?$/;

export type StatusOption = { id: string; name: string };
export type BoardFieldCandidate = { id?: string; dataType?: string } | null | undefined;

export function parseBoardUrl(value: string): BoardReference {
  const url = safeUrl(value.trim());
  const match = url && url.protocol === "https:" && url.hostname === BOARD_HOST ? url.pathname.match(BOARD_PATH) : null;
  if (!match) throw new ProjectValidationError("Board URL is invalid");
  return { ownerKind: OWNER_KINDS[match[1]!]!, owner: match[2]!, number: Number(match[3]) };
}

export function findBacklogOption(options: StatusOption[]) {
  return findStatusOption(options, BACKLOG_STATUS_NAME);
}

export function findReadyOption(options: StatusOption[]) {
  return findStatusOption(options, READY_STATUS_NAME);
}

function findStatusOption(options: StatusOption[], name: string) {
  return options.find((option) => option.name.trim().toLowerCase() === name) ?? null;
}

export function findPriorityFieldId(candidates: BoardFieldCandidate[]) {
  return candidates.find((field) => field?.id && field.dataType === NUMBER_FIELD_TYPE)?.id ?? null;
}

function safeUrl(value: string) {
  if (!value || value.length > BOARD_URL_MAX) return null;
  try { return new URL(value); } catch { return null; }
}
