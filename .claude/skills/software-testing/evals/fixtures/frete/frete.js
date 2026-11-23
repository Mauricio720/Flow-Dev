export function calcularFrete(subtotalCentavos) {
  if (subtotalCentavos > 20000) return 0;
  return 1500;
}
