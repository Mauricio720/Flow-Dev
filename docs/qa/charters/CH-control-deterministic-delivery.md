# CH-control-deterministic-delivery: Completar o fluxo com etapas controladas

```yaml
charter:
  id: CH-control-deterministic-delivery
  mission: Marina conclui uma Issue controlando cada etapa e confirma que o modo escolhido governa a Review, o QA e a liberação.
  mode: scenario-based
  persona:
    name: Marina
    device: laptop
    network: wifi-fast
    locale: pt-BR
  journey: J-deterministic-issue-delivery
  scenarios: [FLOW-choose-and-run-deterministic, FLOW-review-findings-before-release]
  tour: Feature Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - Escolher cada modo disponível em planos próprios e confirmar o modo após recarregar.
      - Aprovar Spec e tarefas sem iniciar implementação automaticamente.
      - Executar Review com achados e verificar que a liberação continua bloqueada até uma rodada limpa atual.
    must_avoid:
      - Não executar tarefas de Issues reais fora de um ambiente isolado de QA.
      - Não publicar commits ou Pull Requests durante a sessão.
```
