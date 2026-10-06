import "server-only";
import { cache } from "react";
import { getServerCaller } from "@/lib/trpc/server";

export const loadViewer = cache(async () => {
  const me = await (await getServerCaller()).access.me();
  return { isAdmin: me.isAdmin, lastProjectId: me.lastProjectId };
});
