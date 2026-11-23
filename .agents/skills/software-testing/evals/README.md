# Avaliações da skill `software-testing`

`evals.json` cobre planejamento (0), revisão de testes descritos (1), regressão (2) e revisão de arquivos reais (3). A fixture `fixtures/frete/` contém uma suíte verde que deixa passar dois defeitos frente ao README; ela é intencionalmente incorreta e não deve ser alterada durante a avaliação.

Os resultados da primeira rodada ficam em `results/iteration-1/`. Os quatro cenários passaram em ambas as configurações, com e sem a skill (20/20 critérios em cada). Isso demonstra que a versão atual funciona nesses exemplos, mas **não demonstra ganho causal** da skill. Os três primeiros prompts deixam os riscos explícitos; mesmo a fixture pequena foi resolvida pelas duas configurações. A rodada também não mede implementação de testes em projeto real, variação entre execuções ou custo de manutenção.

O `review.html` permite examinar as oito respostas. Tempo e tokens não estavam disponíveis nos retornos dos agentes; os zeros gerados pelo agregador para essas métricas não devem ser interpretados como medidas.
