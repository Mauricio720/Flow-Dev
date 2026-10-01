import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEARCH_MAX_LENGTH = 200;

type Project = { id: string; name: string };

type Props = {
  search: string;
  onSearch: (value: string) => void;
  projects: Project[];
  selectedProject: string;
  onSelectProject: (value: string) => void;
};

export function AccessFilters({ search, onSearch, projects, selectedProject, onSelectProject }: Props) {
  return (
    <>
      <Label className="mt-8 block" htmlFor="user-search">
        Buscar usuário
      </Label>
      <Input
        id="user-search"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder="login do GitHub"
        className="mt-2 h-11"
      />
      <Label className="mt-4 block" htmlFor="project-target">
        Projeto
      </Label>
      <Select value={selectedProject} onValueChange={onSelectProject}>
        <SelectTrigger id="project-target" className="mt-2 h-11 w-full">
          <SelectValue placeholder="Selecione um projeto" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
