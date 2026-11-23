---
name: software-testing
description: Planeja, escreve, executa, depura e revisa testes de software durante desenvolvimento com IA. Use quando o usuário pedir estratégia ou casos de teste, implementação ou melhoria de testes automatizados, TDD, reprodução de bug, regressão, investigação de falha ou flakiness, revisão de testes em código ou PR, avaliação de cobertura, escolha entre unidade/integração/E2E/contrato ou evidência de verificação antes da entrega. Também use quando uma tarefa de implementação exigir decidir que comportamentos testar. Não use para uma explicação teórica isolada sem código, requisitos ou decisão de teste concreta.
---

# Testes de software no ciclo de desenvolvimento

Esta skill transforma requisitos e riscos em evidência executável. Um teste útil identifica um comportamento que importa, detecta uma falha plausível e produz um diagnóstico compreensível. Nomes de níveis, contagem de casos e porcentagem de cobertura não substituem essa análise.

## Escolha o trabalho pelo pedido

| Pedido | Entrega esperada |
|---|---|
| Planejar uma funcionalidade | Matriz curta de comportamentos, riscos, fronteiras, casos e evidência esperada. Não escreva código se o usuário pediu apenas planejamento. |
| Implementar ou evoluir código | Testes proporcionais ao risco junto da mudança; execução dos comandos pertinentes; relato do que foi observado. |
| Corrigir um bug | Reprodução do sintoma, correção mínima e teste de regressão que distingue o comportamento antigo do correto. |
| Revisar testes ou PR | Achados priorizados com arquivo/linha, cenário que escapa ou falso alarme, consequência e correção proporcional. Não altere arquivos se o pedido for somente revisão. |
| Investigar falha ou instabilidade | Evidência da falha, hipóteses discriminadas por experimento, causa encontrada ou limite da investigação. |
| Explorar um fluxo ou preparar QA | Roteiro curto de riscos, dados e observações a coletar; registro dos defeitos encontrados e do que ainda não foi exercitado. |
| Verificar entrega | Comandos executados após as mudanças, resultados, requisitos conferidos e riscos ainda sem evidência. |

Leia `references/escolha-e-desenho.md` ao decidir fronteiras, dublês ou casos. Leia `references/revisao-e-diagnostico.md` ao revisar uma suíte, um PR ou uma falha intermitente. `references/fontes-do-topico.md` registra a proveniência e os limites da síntese.

## Comece pelo contrato observável

1. Leia as instruções do projeto, o pedido, os critérios de aceite, o código afetado e os testes próximos. Identifique framework, comandos, fixtures, convenções e restrições de ambiente antes de escolher ferramentas.
2. Separe **comportamento exigido**, **comportamento atual** e **suposição**. Se houver ambiguidade material que impeça definir o resultado correto, pergunte; avance nos cenários independentes.
3. Para cada risco relevante, escreva: entrada ou estado inicial, ação, resultado observável, falha que o teste deveria detectar e fronteira que precisa ser real. Inclua o caso principal, bordas e erros que possam mudar uma decisão do produto. Evite matrizes cartesianas sem risco concreto.
4. Trate o requisito, contrato público, exemplo de negócio ou bug reproduzido como oráculo. Não derive o valor esperado apenas da implementação que acabou de ser escrita por IA. Se requisito e código divergem, registre a divergência antes de ajustar o teste.

## Escolha testes pelo tipo de falha

- **Regra independente:** exercite a API pública da função, classe ou módulo com colaboradores reais quando isso mantiver o teste rápido e controlado. Verifique saída ou mudança de estado visível.
- **Fronteira com banco, fila, arquivo ou serialização:** inclua ao menos um teste que prove a interação real pertinente. Use dados isolados e, quando a compatibilidade for importante, a mesma tecnologia de produção em ambiente de teste.
- **Serviço externo:** controle respostas para testar seu cliente sem depender do fornecedor. Um dublê só prova o comportamento contra a resposta simulada; quando a compatibilidade do contrato for crítica, verifique-a separadamente com contrato, sandbox ou outro mecanismo disponível no projeto.
- **Interface ou fluxo completo:** cubra poucas jornadas críticas para verificar a conexão entre partes. Prefira asserções sobre resultado percebido pelo usuário; não replique todos os casos da regra em E2E.

Descreva a fronteira exercitada e o que foi substituído, em vez de decidir qualidade pelo rótulo “unidade” ou “integração”. Não imponha proporção fixa entre níveis. Escolha o menor conjunto que detecta falhas distintas com feedback confiável.

## Escreva e execute

1. Dê ao teste um nome que comunique condição e resultado. Organize preparação, ação e verificação de modo legível. Faça a asserção sobre um efeito observável e específico; evite `toBeTruthy`, snapshots grandes ou mera ausência de exceção quando o requisito pede um valor preciso.
2. Prefira dados pequenos que exponham a regra. Cubra fronteiras de intervalo, entradas inválidas e transições de estado quando pertinentes. Use parametrização se ela tornar os casos mais claros, não para ocultar o propósito de cada um.
3. Controle relógio, aleatoriedade, IDs, concorrência e estado compartilhado quando influenciam o resultado. Cada teste deve funcionar isoladamente e com a suíte, em ordem arbitrária. Não use esperas fixas como substituto de sincronização com a condição esperada.
4. Use dublês apenas onde a dependência torna o teste lento, variável, custoso ou difícil de isolar. Preserve colaboradores simples e reais quando isso aumenta a confiança. Verificações de chamadas fazem sentido quando a interação em si é contrato; não congele chamadas internas por conveniência.
5. Para bug, execute a reprodução antes da correção quando possível. Para testes novos de risco alto, confira a sensibilidade com um erro controlado ou uma mutação localizada e reversível. O teste deve falhar pelo motivo esperado, e voltar a passar com o comportamento correto. Não use esse experimento se o custo superar o risco.
6. Execute primeiro os testes afetados, depois a suíte e os gates exigidos pelo projeto conforme o alcance da mudança. Leia saída e código de retorno. Se um comando não puder rodar, explique por quê e não descreva o comportamento como verificado.

## Procure falhas além da suíte automatizada

Quando o risco envolve jornadas inesperadas, usabilidade ou combinações que ainda não têm oráculo claro, proponha uma exploração curta: objetivo, variações de dados/estado/ordem, observações esperadas e forma de registrar defeitos. Use o que encontrar para esclarecer o contrato e decidir quais regressões merecem automação. Uma suíte verde demonstra apenas os cenários e fronteiras que realmente exercitou.

## Revise a qualidade da evidência

Ao revisar, pergunte primeiro **que defeito concreto passaria** apesar dos testes e **que refatoração sem mudança de comportamento os quebraria**. Procure:

- requisito ou ramo relevante sem cenário; asserção fraca ou oráculo copiado do código;
- teste que apenas comprova configuração do mock, sem executar a regra real;
- mocks de colaboradores internos, métodos privados, ordem de chamadas ou estrutura DOM sem relação com o contrato;
- integração declarada mas sem fronteira real, ou dublê cujo formato pode divergir do fornecedor;
- fixture global, dados não limpos, horário atual, rede variável, corrida assíncrona, dependência entre testes;
- duplicação entre níveis, suíte lenta sem nova informação, teste trivial que aumenta manutenção sem proteger risco.

Não presuma defeito por cobertura baixa, ausência de E2E ou uso de mock. Demonstre um caminho de falha e sua importância. Cobertura aponta áreas não exercitadas, mas não prova qualidade; mutação dirigida pode investigar se asserções capturam uma alteração relevante. Para detalhes e formato de revisão, use `references/revisao-e-diagnostico.md`.

## Ao trabalhar com outras skills e etapas

Esta skill cuida da **escolha, construção e crítica dos testes**. Uma skill de implementação ou arquitetura continua responsável pela mudança de produto; `cy-final-verify`, quando aplicável, cuida do gate de evidência antes de afirmar conclusão. Em um fluxo PRD/TechSpec, compare os cenários com critérios de aceite e contratos canônicos, sem substituir requisitos por uma lista de testes produzida pelo agente.

Na resposta final, diga quais comportamentos foram cobertos, quais comandos rodaram e seus resultados, e qual risco importante continua sem prova. Em revisão, ordene achados por impacto e cite locais específicos. Se não houver problema relevante, diga isso com a extensão da inspeção realizada.
