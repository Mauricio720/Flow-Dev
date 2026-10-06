import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PROJECT_CREATION_PATH } from "@/lib/navigation/projectRoutes";
import type { CatalogViewer } from "../catalogState";
import type { Catalog } from "../hooks/useCatalog";
import { NoAssignments, NoMatches, NoProjectsYet } from "./CatalogStates";

type Props = { catalog: Catalog; viewer: CatalogViewer };

export function CatalogEmpty({ catalog, viewer }: Props) {
  if (catalog.appliedSearch) return <NoMatches search={catalog.appliedSearch} onClear={() => catalog.setTerm("")} />;
  if (viewer.isAdmin) return <NoProjectsYet action={<Button variant="outline" asChild><Link href={PROJECT_CREATION_PATH}>Criar projeto</Link></Button>} />;
  return <NoAssignments onRefresh={catalog.reload} />;
}
