import { unixSocketTransport } from "../spec/compozy/compozyTransport";

const RUNTIME_IDLE_TIMEOUT_MS = 10_000;
const RUNTIME_REQUEST_DEADLINE_MS = 20_000;

// The runtime can hold a prompt request open for the whole turn. The connector must keep polling and
// sending heartbeats meanwhile, so every runtime request is cut at a deadline and the run is watched instead.
export const boundedRuntimeTransport = (socketPath: string) => unixSocketTransport(socketPath, RUNTIME_IDLE_TIMEOUT_MS, RUNTIME_REQUEST_DEADLINE_MS);
