import type { SessionPrincipal } from "../context";
import type { CheckBindingInput, ProjectCompozyService, SaveBindingInput } from "../application/services/project-compozy/projectCompozyService";
import { mapProjectCompozyBinding } from "./mappers/projectCompozyDtoMapper";

export class ProjectCompozyController {
  constructor(private readonly service: ProjectCompozyService) {}

  async get(actor: SessionPrincipal, projectId: string) {
    const { binding, compozy, canEdit } = await this.service.get(actor, projectId);
    return { binding: binding ? mapProjectCompozyBinding(binding) : null, compozy, canEdit };
  }

  async save(actor: SessionPrincipal, input: SaveBindingInput) {
    const binding = await this.service.save(actor, input);
    logBindingChecked(binding.projectId, binding.state, binding.failureCode);
    return mapProjectCompozyBinding(binding);
  }

  async check(actor: SessionPrincipal, input: CheckBindingInput) {
    const binding = await this.service.check(actor, input);
    logBindingChecked(binding.projectId, binding.state, binding.failureCode);
    return mapProjectCompozyBinding(binding);
  }
}

function logBindingChecked(projectId: string, state: string, failureCode: string | null) {
  console.info(JSON.stringify({ event: "compozy.binding_checked", projectId, state, failureCode }));
}
