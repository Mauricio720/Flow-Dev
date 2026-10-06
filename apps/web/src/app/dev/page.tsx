import { redirect } from "next/navigation";
import { ApiStatus } from "@/features/system/api-status";
import { getAuthSession } from "@/lib/auth/session";

export default async function DevPlayground() {
  if (!(await getAuthSession())) redirect("/login");
  return <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12"><header><h1 className="text-2xl font-semibold">Flow Dev</h1><p className="text-sm text-ink-2">Saúde da API</p></header><ApiStatus /></main>;
}
