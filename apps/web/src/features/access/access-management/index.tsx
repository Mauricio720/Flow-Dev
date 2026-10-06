"use client";

import { useCallback, useEffect, useState } from "react";
import type { RouterOutputs } from "@flow-dev/api";
import { trpc } from "@/lib/trpc/client";
import { AccessFilters } from "./components/AccessFilters";
import { UserAccessRow } from "./components/UserAccessRow";

type UsersPage = RouterOutputs["access"]["users"];
type User = UsersPage["items"][number];
type Project = RouterOutputs["projects"]["list"]["items"][number];
type Assignments = Record<string, RouterOutputs["access"]["userAssignments"]["items"]>;

export function AccessManagement({ initialPage, initialProjects }: { initialPage: UsersPage; initialProjects: Project[] }) {
  const [users, setUsers] = useState<User[]>(initialPage.items);
  const [projects] = useState<Project[]>(initialProjects);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [selectedProject, setSelectedProject] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const loadAssignments = useCallback(async (currentUsers: User[]) => {
    const entries = await Promise.all(currentUsers.map(async (user) => [user.id, (await allPages((cursor) => trpc.access.userAssignments.query({ userId: user.id, cursor }))).flatMap((page) => page.items)] as const));
    setAssignments(Object.fromEntries(entries));
  }, []);

  const loadUsers = useCallback(async (value: string) => {
    try {
      const pages = await allPages((cursor) => trpc.access.users.query({ search: value || undefined, cursor }));
      const currentUsers = pages.flatMap((page) => page.items);
      setUsers(currentUsers);
      await loadAssignments(currentUsers);
    } catch {
      setStatus("Não foi possível atualizar o diretório.");
    }
  }, [loadAssignments]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(search), 250);
    return () => window.clearTimeout(timer);
  }, [loadUsers, search]);

  async function changeAccess(userId: string, action: "assign" | "remove") {
    if (!selectedProject) return setStatus("Escolha um projeto antes de continuar.");
    try {
      await trpc.access[action].mutate({ userId, projectId: selectedProject });
      await loadUsers(search);
      setStatus(action === "assign" ? "Projeto atribuído." : "Atribuição removida.");
    } catch {
      await loadUsers(search);
      setStatus("Não foi possível confirmar a alteração. Confira as atribuições atuais.");
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <p className="font-mono text-xs text-ink-3">ADMINISTRAÇÃO</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Acesso aos projetos</h1>
      <p className="mt-3 text-sm leading-6 text-ink-2">Atribua apenas projetos existentes a pessoas que já entraram com GitHub.</p>
      <AccessFilters search={search} onSearch={setSearch} projects={projects} selectedProject={selectedProject} onSelectProject={setSelectedProject} />
      {status && <p role="alert" className="mt-3 text-sm text-destructive">{status}</p>}
      <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-raised">
        {users.map((user) => (
          <UserAccessRow key={user.id} user={user} selectedProjectId={selectedProject} assignedProjectIds={(assignments[user.id] ?? []).map((project) => project.id)} onChangeAccess={(userId, action) => void changeAccess(userId, action)} />
        ))}
      </ul>
      {users.length === 0 && <p className="mt-6 text-sm text-ink-2">Nenhuma conta encontrada.</p>}
    </section>
  );
}

async function allPages<T extends { nextCursor: string | null }>(load: (cursor?: string) => Promise<T>) {
  const pages: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await load(cursor);
    pages.push(page);
    const next = page.nextCursor ?? undefined;
    if (next === cursor) break;
    cursor = next;
  } while (cursor);
  return pages;
}
