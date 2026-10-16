# CH-resume-deterministic-run: Retomar após interrupção

```yaml
charter:
  id: CH-resume-deterministic-run
  mission: Caio verifica se uma execução interrompida pode ser retomada sem esconder falhas nem duplicar trabalho.
  mode: charter-with-tour
  persona:
    name: Caio
    device: laptop
    network: flaky
    locale: pt-BR
  journey: J-deterministic-issue-delivery
  scenarios: [FLOW-resume-one-execution]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - Interromper a conexão durante uma etapa executada em ambiente isolado.
      - Recarregar e comparar a identidade e o estado da execução antes de tentar novamente.
      - Solicitar parada e observar o estado real do trabalho persistente.
    must_avoid:
      - Não derrubar processos de produção ou compartilhar credenciais.
      - Não iniciar uma segunda execução enquanto a primeira estiver incerta.
```
