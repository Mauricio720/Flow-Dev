# Revisão e diagnóstico

## Revisão de teste ou PR

1. Leia o contrato original e o diff de produção junto do diff de testes. Liste comportamentos novos, alterados e removidos. Um teste só é suficiente se distingue uma implementação defeituosa plausível da correta.
2. Inspecione as asserções e fixtures. Tente formular o contraexemplo: “se a função sempre retornasse zero”, “se o banco não persistisse”, “se o fornecedor devolvesse 500”, o teste falharia pelo motivo certo?
3. Verifique se os recursos simulados coincidem com o risco. Um repositório mockado não demonstra uma query; uma resposta HTTP fixa não demonstra compatibilidade atual do fornecedor.
4. Procure fragilidade: ordem entre testes, dependência de data, timezone, rede e scheduler, espera por tempo fixo, estado global, limpeza incompleta, seletores internos e asserções sobre chamadas privadas.
5. Execute os testes pertinentes quando o ambiente permitir. Diferencie achado confirmado por execução, defeito inferido do código e hipótese que ainda precisa de reprodução.
6. Priorize pela falha que escaparia ou pelo falso alarme que atrapalha mudanças. Uma revisão sem achados relevantes é válida.

Formato para cada achado: **local → evidência → comportamento que escapa ou quebra indevidamente → consequência → correção mínima → verificação sugerida**. Evite exigir uma categoria específica de teste sem mostrar a falha que ela detectaria.

## Diagnosticar um teste que falha

1. Registre comando, ambiente, erro e se reproduz isolado. Compare com execução na suíte e em outra ordem, sem alterar vários fatores ao mesmo tempo.
2. Separe falha de produto, erro de expectativa, ambiente indisponível e instabilidade. Confirme com uma hipótese discriminante: por exemplo, controle o relógio, isole dados, substitua rede externa, espere uma condição observável, ou fixe a ordem de execução apenas para diagnosticar.
3. Corrija a causa. Retry ou quarentena podem conter impacto temporário, mas devem deixar o defeito visível e ter caminho para remoção; não transforme falha recorrente em “passou”.
4. Rode de novo o teste afetado e a suíte pertinente depois da correção. Reporte número de execuções apenas quando realmente repetiu a verificação.

## Revisar testes escritos por IA

- Confira se o valor esperado veio do requisito, exemplo independente ou comportamento já validado, não de uma reimplementação do algoritmo testado.
- Troque uma saída ou condição importante de modo controlado. Se o teste segue verde, a asserção pode não proteger o contrato. Reverta o experimento antes de entregar.
- Leia falhas, não só o status verde: um teste que falha por setup ou import não demonstrou sensibilidade ao comportamento.
- Verifique casos negativos e de borda que a geração tende a omitir e descarte casos redundantes ou triviais que só aumentam a manutenção.
