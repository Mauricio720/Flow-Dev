# Ensaio local de latência — sessão no Flow Dev

**Executado em:** 23/11/2026 · **Resultado:** todas as trajetórias medidas ficaram dentro das metas locais.

Comando reproduzível, no repositório:

```sh
rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts --silent=false test/session-latency.test.ts
```

O teste usa PostgreSQL descartável, 21 sessões Flow Dev concorrentes, 20 mensagens enquanto a 21ª sessão encerra e captura um Markdown alterado. O runtime é roteirizado; nenhum Claude real é iniciado. O worker registra a emissão dos callbacks, o teste consulta o banco para observar a persistência, repete a consulta da timeline no intervalo de 1.500 ms usado pela interface e responde aos 20 pedidos. A latência da resposta começa quando a mutação que a persiste retorna e termina quando o runtime roteirizado recebe o resultado.

O p95 usa posto mais próximo: posição `ceil(0,95 × n)` em uma lista ordenada. Para 20 amostras, é a 19ª observação; o máximo é informado à parte. Os valores abaixo vieram de uma execução, com relógio monotônico do processo.

| Trajetória | Amostras | p95 | Máximo | Meta |
|---|---:|---:|---:|---:|
| Início do envio → runtime receber mensagem | 20 | 1.243 ms | 1.243 ms | ≤ 2.000 ms |
| Callback de texto → primeiro polling que observou persistência no banco | 20 | 315 ms | 325 ms | diagnóstico |
| Callback de texto → primeira resposta da timeline que mostrou o texto | 20 | 349 ms | 365 ms | ≤ 3.000 ms |
| Callback de pergunta → primeiro polling que observou persistência no banco | 20 | 318 ms | 332 ms | diagnóstico |
| Callback de pergunta → primeira resposta da timeline que mostrou o pedido | 20 | 349 ms | 365 ms | ≤ 3.000 ms |
| Mutação de resposta persistida → resultado entregue ao runtime | 20 | 656 ms | 656 ms | ≤ 2.000 ms |

**O número que vale para a REQ-057 é o limite superior, não o p95 do primeiro polling.** O p95 das linhas "primeira resposta da timeline" depende da fase: as 20 observações começam juntas e consultam a cada 1.500 ms, então o resultado cai perto do instante da consulta. Em outra execução, as mesmas trajetórias deram cerca de 1.436 ms em vez de 349 ms. O pior caso para quem está com a tarefa aberta é a persistência observada (máximo de 332 ms nesta amostra) mais um intervalo inteiro de 1.500 ms mais a consulta, ou seja, cerca de 1,9 s, abaixo dos 3 s. É esse limite superior que sustenta a meta.

“Persistência observada” é o primeiro polling do teste que encontrou a linha no PostgreSQL, portanto é um limite superior para o instante do commit. “Primeira resposta da timeline” mede a chamada direta ao controller tRPC dentro do processo e a espera pelo ciclo de 1.500 ms; não mede rede do navegador nem o commit/renderização React. Os resultados cobrem filas do recorder, persistência, polling de texto e pergunta e entrega de respostas durante uma captura concorrente. A latência de entrada começa antes da mutação que grava a mensagem.

Esta é uma amostra local controlada de vinte sessões, não uma previsão de produção. O teste é executável novamente e falha se p95 de entrada ou de primeira timeline ultrapassar 2 s/3 s, ou se a resposta ao runtime ultrapassar 2 s. Nenhum intervalo ou timeout foi alterado para obter esses resultados.
