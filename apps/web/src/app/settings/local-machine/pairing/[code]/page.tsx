import { redirect } from "next/navigation";
import { LocalMachinePairing } from "@/features/local-machine/pairing";
import { getAuthSession } from "@/lib/auth/session";

export const metadata = { title: "Conectar máquina local · Flow Dev" };

export default async function LocalMachinePairingPage({ params }: PageProps<"/settings/local-machine/pairing/[code]">) {
  const { code } = await params;
  const returnPath = `/settings/local-machine/pairing/${encodeURIComponent(code)}`;
  if (!(await getAuthSession())) redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  return <LocalMachinePairing code={code} />;
}
