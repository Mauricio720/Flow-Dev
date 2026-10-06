import { isSpecRoute, type SpecReason, type SpecRoute, type SpecStage } from "./specContracts";

export type SpecEligibilityInput = {
  taskStatus: string;
  publication: { outcome: string; repositoryBindingMatches: boolean; issueId: string; issueNumber: number; title: string; bodyMarkdown: string } | null;
  planning: { status: string; selectedRoute: string } | null;
};
export type SpecEligibility = { canStart: boolean; reason: SpecReason | null; route: SpecRoute | null; firstStage: SpecStage | null };

const APPROVED_PLANNING_STATUS = "approved";
const PUBLISHED_STATUS = "published";
const CREATED_OUTCOME = "created";

const blocked = (reason: SpecReason): SpecEligibility => ({ canStart: false, reason, route: null, firstStage: null });

export function specEligibility(input: SpecEligibilityInput): SpecEligibility {
  if (!hasConfirmedPublication(input)) return blocked("publication_required");
  if (input.planning?.status !== APPROVED_PLANNING_STATUS) return blocked("planning_required");
  const route = input.planning.selectedRoute;
  if (!isSpecRoute(route)) return blocked("route_unsupported");
  return { canStart: true, reason: null, route, firstStage: route };
}

function hasConfirmedPublication(input: SpecEligibilityInput) {
  const publication = input.publication;
  if (input.taskStatus !== PUBLISHED_STATUS || publication?.outcome !== CREATED_OUTCOME || !publication.repositoryBindingMatches) return false;
  return Boolean(publication.issueId.trim() && publication.issueNumber > 0 && publication.title.trim() && publication.bodyMarkdown.trim());
}
