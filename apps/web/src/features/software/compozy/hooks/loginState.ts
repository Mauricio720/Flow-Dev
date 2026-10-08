import type { LoginPoll, LoginProvider, LoginStart } from "../contract";

export type LoginUi =
  | { phase: "idle" }
  | { phase: "starting"; provider: LoginProvider }
  | { phase: "waiting"; start: LoginStart }
  | { phase: "confirm"; start: LoginStart; identityLabel: string; differs: boolean }
  | { phase: "confirming"; start: LoginStart; identityLabel: string }
  | { phase: "connected"; identityLabel: string }
  | { phase: "failed"; message: string };

export type LoginAction =
  | { type: "starting"; provider: LoginProvider }
  | { type: "started"; start: LoginStart }
  | { type: "polled"; start: LoginStart; poll: LoginPoll }
  | { type: "confirming" }
  | { type: "connected"; identityLabel: string }
  | { type: "failed"; message: string }
  | { type: "reset" };

const EXPIRED_MESSAGE = "A autorização expirou. Inicie novamente para gerar um novo código.";
const DECLINED_MESSAGE = "A autorização foi recusada ou falhou. A conta anterior continua ativa; tente novamente.";

function applyPoll(state: LoginUi, start: LoginStart, poll: LoginPoll): LoginUi {
  if (poll.state === "pending") return state;
  if (poll.state === "awaiting_confirmation") return { phase: "confirm", start, identityLabel: poll.identityLabel, differs: poll.differsFromCurrent };
  if (poll.state === "confirmed") return { phase: "connected", identityLabel: poll.identityLabel };
  return { phase: "failed", message: poll.state === "expired" ? EXPIRED_MESSAGE : DECLINED_MESSAGE };
}

export function loginReducer(state: LoginUi, action: LoginAction): LoginUi {
  if (action.type === "starting") return { phase: "starting", provider: action.provider };
  if (action.type === "started") return { phase: "waiting", start: action.start };
  if (action.type === "polled") return applyPoll(state, action.start, action.poll);
  if (action.type === "confirming" && state.phase === "confirm") return { phase: "confirming", start: state.start, identityLabel: state.identityLabel };
  if (action.type === "connected") return { phase: "connected", identityLabel: action.identityLabel };
  if (action.type === "failed") return { phase: "failed", message: action.message };
  if (action.type === "reset") return { phase: "idle" };
  return state;
}
