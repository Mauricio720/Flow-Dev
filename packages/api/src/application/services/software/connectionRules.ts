import { SoftwareError } from "./softwareErrors";

export const LABEL_MAX_LENGTH = 60;
const CONTROL_CHARACTERS = /\p{Cc}/u;

export function normalizeLabel(value: string) {
  const label = value.trim().replace(/\s+/g, " ");
  const valid = label.length > 0 && label.length <= LABEL_MAX_LENGTH && !CONTROL_CHARACTERS.test(label);
  if (!valid) throw new SoftwareError("label_invalid", { label: "Use de 1 a 60 caracteres sem controles" });
  return label;
}
