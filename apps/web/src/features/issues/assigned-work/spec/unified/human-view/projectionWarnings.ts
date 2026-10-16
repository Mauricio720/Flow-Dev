import type { SpecOverview } from "./overviewTypes";
import type { ProductView, TechnicalView } from "./viewTypes";

const MISSING_WHAT = "O resumo executivo não traz o rótulo “O que muda”; o que será entregue precisa ser lido na parte de produto.";
const NO_STORIES = "Nenhuma história de usuário foi reconhecida no catálogo.";
const NO_COVERAGE = "A matriz de cobertura não foi reconhecida no contrato de testes; os vínculos entre requisitos e testes ficam desconhecidos.";

function duplicates(values: string[]) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function unknownStories(product: ProductView, technical: TechnicalView) {
  const known = new Set(product.requirements.map((requirement) => requirement.code));
  return [...new Set(technical.coverage.flatMap((row) => row.stories))].filter((code) => !known.has(code));
}

function undescribedTests(technical: TechnicalView) {
  if (technical.testCases.length === 0) return [];
  const known = new Set(technical.testCases.map((item) => item.id));
  return [...new Set(technical.coverage.flatMap((row) => row.tests))].filter((id) => !known.has(id));
}

export function projectionWarnings(overview: SpecOverview, product: ProductView, technical: TechnicalView): string[] {
  const warnings: string[] = [];
  if (!overview.what) warnings.push(MISSING_WHAT);
  if (product.requirements.length === 0) warnings.push(NO_STORIES);
  if (product.requirements.length > 0 && technical.coverage.length === 0) warnings.push(NO_COVERAGE);
  for (const code of duplicates(product.requirements.map((requirement) => requirement.code))) warnings.push(`A história ${code} aparece mais de uma vez no catálogo.`);
  const unknown = unknownStories(product, technical);
  if (unknown.length > 0) warnings.push(`A matriz de cobertura cita ${unknown.join(", ")}, que não está no catálogo de histórias.`);
  const undescribed = undescribedTests(technical);
  if (undescribed.length > 0) warnings.push(`A matriz de cobertura cita ${undescribed.join(", ")} sem descrição no contrato de testes.`);
  return warnings;
}
