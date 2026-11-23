# Escolha e desenho dos testes

## Uma ficha por risco

Antes de adicionar um teste, preencha mentalmente ou em uma tabela curta:

| Campo | Pergunta |
|---|---|
| Contrato | Qual promessa pública ou critério de aceite está em jogo? |
| Falha | Que implementação incorreta plausível deve ser detectada? |
| Cenário | Que entrada e estado inicial distinguem correto de incorreto? |
| Oráculo | Que saída, estado ou efeito verificável prova o resultado? |
| Fronteira | Que código e recurso reais precisam participar? |
| Limite | Qual falha ainda passaria depois desse teste? |

Se não houver falha plausível ou oráculo independente, esclareça o requisito antes de multiplicar testes. Em código gerado por IA, compare exemplos esperados com a especificação ou com uma derivação humana verificável: copiar a função para calcular o esperado cria dois erros iguais.

## Guia de fronteiras

| Risco dominante | Primeiro teste útil | Falha que ainda escapa |
|---|---|---|
| Regra, cálculo ou transição | API pública com casos principal, limite e erro | Wiring, serialização, persistência |
| Consulta, schema ou mapeamento | Leitura e escrita isoladas no banco de teste compatível | Integração com outras partes do sistema |
| Cliente HTTP ou mensageria | Cliente real contra servidor/dublê controlado | Mudança no contrato do fornecedor |
| Contrato entre serviços | Verificação de contrato consumidor/provedor disponível | Jornada completa e operação em produção |
| Jornada do usuário | Poucos fluxos críticos pela interface pública | Combinações detalhadas das regras internas |

Um teste pode atravessar mais de uma linha; o ponto é saber o que ele demonstra. Teste estreito costuma dar diagnóstico rápido; teste amplo comprova conexões adicionais, com maior custo e dependência de ambiente. A definição local de “unidade” ou “integração” pode variar.

## Dublês e efeitos externos

- Use objetos reais simples para preservar a colaboração que interessa. Não simule o código cujo comportamento é o alvo do teste.
- Substitua relógio, aleatoriedade e fornecedores externos para controlar entradas variáveis ou custosas. Verifique que a configuração de teste não permite efeitos reais indesejados.
- Se usar um fake de banco, registre que ele pode não reproduzir dialeto SQL, transações, constraints ou índices do banco de produção. Se esses detalhes são o risco, teste com a tecnologia real em ambiente isolado.
- Uma asserção de chamada é adequada para um efeito contratado como “publicar evento uma vez” ou “não cobrar após cancelamento”. Chamada interna entre classes da aplicação costuma ser detalhe de implementação.

## Seleção proporcional

Comece pelos caminhos cujo erro teria impacto maior ou é mais provável na mudança. Acrescente cenários só quando cobrem uma falha distinta. Compare custo de escrever, executar e manter com a informação obtida. Percentual de cobertura é indicador de onde olhar; não é meta que decide sozinha a qualidade. TDD é uma opção útil quando ajuda a descobrir contrato e design, não um requisito universal.
