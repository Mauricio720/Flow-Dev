import type { OpenPoint } from "../openPoints";
import type { ReaderTab } from "../packageReader";
import { chunksOf } from "./documentChunks";
import { productView } from "./productView";
import { projectionWarnings } from "./projectionWarnings";
import { specOverview } from "./specOverview";
import { technicalView } from "./technicalView";
import { VIEW_SCHEMA_VERSION, type ArtifactRef, type ArtifactView, type TraceLink } from "./viewTypes";

type Input = { artifact: ArtifactRef; tabs: ReaderTab[]; points: OpenPoint[] };

export function artifactView({ artifact, tabs, points }: Input): ArtifactView {
  const chunks = chunksOf(tabs);
  const overview = specOverview(tabs, points);
  const technical = technicalView(chunks);
  const product = productView(chunks, overview, technical.coverage);
  const relationships: TraceLink[] = product.requirements.flatMap((requirement) => requirement.tests.map((test) => ({ fromId: test, toId: requirement.code, type: "validates" as const })));
  return { artifact, viewSchemaVersion: VIEW_SCHEMA_VERSION, overview, product, technical, relationships, validationWarnings: projectionWarnings(overview, product, technical) };
}
