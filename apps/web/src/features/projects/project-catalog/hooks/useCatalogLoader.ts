"use client";

import { useRouter } from "next/navigation";
import { useReducer, useRef } from "react";
import { PROJECTS_PATH, expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { catalogReducer, initialCatalogState, type CatalogLoad, type CatalogRequest } from "../catalogState";

export function useCatalogLoader(initial: CatalogLoad) {
  const router = useRouter();
  const [state, dispatch] = useReducer(catalogReducer, initial, initialCatalogState);
  const latest = useRef(0);
  function fail(error: unknown) {
    if (trpcCode(error) !== TRPC_UNAUTHORIZED) return dispatch({ type: "failed" });
    dispatch({ type: "cleared" });
    router.replace(expiredSessionPath(PROJECTS_PATH));
  }
  async function load(request: CatalogRequest) {
    const attempt = ++latest.current;
    dispatch({ type: "requested", request });
    try {
      const page = await trpc.projects.list.query({ search: request.search || undefined, cursor: request.cursor });
      if (attempt === latest.current) dispatch({ type: "loaded", request, page });
    } catch (error) {
      if (attempt === latest.current) fail(error);
    }
  }
  return { state, load };
}
