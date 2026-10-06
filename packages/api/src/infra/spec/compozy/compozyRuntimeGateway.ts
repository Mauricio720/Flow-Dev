import type { CreateRuntimeSession, ResolveRuntimeInteraction, RuntimeConfiguration, RuntimeCursor, RuntimeEvent, RuntimeIdentity, SpecRuntimeGateway, SubmitSpecPrompt } from "../../../application/spec/specRuntimeGateway";
import { replayEvents } from "./compozyEvents";
import { listInteractions, resolveInteraction } from "./compozyInteractions";
import { runPreflight } from "./compozyPreflight";
import { submitPrompt } from "./compozyPrompt";
import { createSession } from "./compozySession";
import { inspectSession, requestStop } from "./compozyStop";
import { unixSocketTransport, type CompozyTransport } from "./compozyTransport";

export type TransportFactory = (socketPath: string) => CompozyTransport;

export class CompozyRuntimeGateway implements SpecRuntimeGateway {
  constructor(private readonly transportFor: TransportFactory = unixSocketTransport) {}

  preflight(input: RuntimeConfiguration) { return runPreflight(this.transportFor(input.socketPath), input); }
  create(input: CreateRuntimeSession) { return createSession(this.transportFor(input.socketPath), input); }
  submit(input: SubmitSpecPrompt) { return submitPrompt(this.transportFor(input.socketPath), input); }
  inspect(input: RuntimeIdentity) { return inspectSession(this.transportFor(input.socketPath), input); }
  interactions(input: RuntimeIdentity) { return listInteractions(this.transportFor(input.socketPath), input); }
  resolve(input: ResolveRuntimeInteraction) { return resolveInteraction(this.transportFor(input.socketPath), input); }
  stop(input: RuntimeIdentity) { return requestStop(this.transportFor(input.socketPath), input); }
  events(input: RuntimeCursor): AsyncIterable<RuntimeEvent> { return replayEvents(this.transportFor(input.socketPath), input); }
}
