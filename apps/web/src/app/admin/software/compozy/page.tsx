import { SoftwareCompozy } from "@/features/software/compozy";
import { loadSoftware } from "@/features/software/compozy/server/loadSoftware";

export default async function SoftwareCompozyPage() {
  return <SoftwareCompozy initial={await loadSoftware()} />;
}
