import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SEARCH_FIELD_ID = "catalog-search";
const SEARCH_MAX_LENGTH = 120;

type Props = { value: string; onChange: (value: string) => void };

export function CatalogSearch({ value, onChange }: Props) {
  return (
    <div role="search" className="mt-8 flex max-w-md flex-col gap-2">
      <Label htmlFor={SEARCH_FIELD_ID} className="text-ink-3">Buscar por projeto ou repositório</Label>
      <Input id={SEARCH_FIELD_ID} type="search" value={value} maxLength={SEARCH_MAX_LENGTH} autoComplete="off" placeholder="Nome do projeto ou owner/repositório" onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
