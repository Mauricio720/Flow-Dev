import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { destinationProjectId, normalizeDestination } from "@flow-dev/api/server";
import { LoginScreen } from "@/features/auth/login";
import { getAuthSession } from "@/lib/auth/session";
import { PROJECTS_PATH } from "@/lib/navigation/projectRoutes";
import { TRPC_NOT_FOUND } from "@/lib/projects/contract";
import { trpcCode } from "@/lib/trpc/error";
import { getServerCaller } from "@/lib/trpc/server";

export const metadata: Metadata = { title: "Entrar · Flow Dev" };

async function authorizedDestination(destination: string) {
  const projectId = destinationProjectId(destination);
  if (!projectId) return destination;
  try {
    await (await getServerCaller()).projects.byId({ projectId });
    return destination;
  } catch (error) {
    if (trpcCode(error) !== TRPC_NOT_FOUND) throw error;
    return PROJECTS_PATH;
  }
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const destination = normalizeDestination(typeof params.next === "string" ? params.next : PROJECTS_PATH);
  if (await getAuthSession()) redirect(await authorizedDestination(destination));
  const error = typeof params.erro === "string" ? params.erro : typeof params.error === "string" ? params.error : undefined;
  return <LoginScreen error={error} destination={destination} />;
}
