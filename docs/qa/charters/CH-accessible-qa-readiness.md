# CH-accessible-qa-readiness: Ler o resultado de QA

```yaml
charter:
  id: CH-accessible-qa-readiness
  mission: Lia planeja e consulta QA por teclado e leitor de tela para decidir se a Issue está pronta ou bloqueada.
  mode: scenario-based
  persona:
    name: Lia
    device: laptop
    network: wifi-fast
    locale: pt-BR
  journey: J-deterministic-issue-delivery
  scenarios: [FLOW-qa-results-and-readiness]
  tour: Back-Button Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - Planejar QA e confirmar que nenhuma sessão de navegador começa sem ação explícita.
      - Percorrer resultados, decisões humanas e histórico com teclado e leitor de tela.
      - Usar voltar e atualizar para confirmar que a seleção e o relatório não se perdem.
    must_avoid:
      - Não marcar QA como aprovado sem sessões reais e evidências independentes.
      - Não executar correções ou retestes automaticamente.
```
