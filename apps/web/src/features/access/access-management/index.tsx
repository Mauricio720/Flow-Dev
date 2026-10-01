"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AccessFilters } from "./components/AccessFilters";
import { UserAccessRow } from "./components/UserAccessRow";

const SEARCH_DEBOUNCE_MS = 250;

type User = { id: string; githubLogin: string; displayName?: string; avatarUrl?: string };
type Project = { id: string; name: string };

export function AccessManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void trpc.access.users
        .query({ search: search || undefined })
        .then((page) => setUsers(page.items))
        .catch(() => setStatus("Não foi possível atualizar o diretório."));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    void trpc.projects.list
      .query({})
      .then((page) => setProjects(page.items))
      .catch(() => setStatus("Não foi possível carregar os projetos."));
  }, []);
  async function changeAccess(userId: string, action: "assign" | "remove") {
    if (!selectedProject) return setStatus("Escolha um projeto antes de continuar.");
    try {
      await trpc.access[action].mutate({ userId, projectId: selectedProject });
      setStatus(action === "assign" ? "Projeto atribuído." : "Atribuição removida.");
    } catch {
      setStatus("Não foi possível alterar a atribuição.");
    }
  }
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <p className="font-mono text-xs text-ink-3">ADMINISTRAÇÃO</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Acesso aos projetos</h1>
      <p className="mt-3 text-sm leading-6 text-ink-2">
        Atribua apenas projetos existentes a pessoas que já entraram com GitHub.
      </p>
      <AccessFilters
        search={search}
        onSearch={setSearch}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
      />
      {status && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {status}
        </p>
      )}
      <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-raised">
        {users.map((user) => (
          <UserAccessRow
            key={user.id}
            user={user}
            disabled={!selectedProject}
            onChangeAccess={(userId, action) => void changeAccess(userId, action)}
          />
        ))}
      </ul>
      {users.length === 0 && <p className="mt-6 text-sm text-ink-2">Nenhuma conta encontrada.</p>}
    </section>
  );
}
