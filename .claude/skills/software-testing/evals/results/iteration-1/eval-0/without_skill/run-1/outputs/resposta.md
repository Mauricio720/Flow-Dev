# Plano de testes para cupom no checkout

Antes de implementar, fixaria o contrato: o percentual incide sobre o subtotal antes do desconto; a condição é **subtotal > R$ 100,00**; o desconto é `min(10% do subtotal, R$ 30,00)`; o gateway recebe o total após o desconto, em centavos. Falta definir a regra de arredondamento dos 10% quando o resultado tem frações de centavo. Essa decisão deve ser explícita antes de fechar as expectativas monetárias desses casos. Também convém esclarecer se frete e taxas compõem o subtotal; os exemplos abaixo consideram apenas o subtotal dos itens.

| Subtotal | Desconto esperado | Total esperado | Motivo |
| --- | ---: | ---: | --- |
| R$ 0,00 | R$ 0,00 | R$ 0,00 | Base sem elegibilidade; se checkout de valor zero for proibido, validar a rejeição em vez de cobrar. |
| R$ 99,99 | R$ 0,00 | R$ 99,99 | Abaixo do limiar. |
| R$ 100,00 | R$ 0,00 | R$ 100,00 | Fronteira estrita: igualdade não vale. |
| R$ 100,01 | Elegível; 10% sujeito ao arredondamento acordado | Subtotal menos desconto arredondado | Primeiro centavo acima do limiar. |
| R$ 100,10 | R$ 10,01 | R$ 90,09 | Percentual com resultado exato em centavos. |
| R$ 299,90 | R$ 29,99 | R$ 269,91 | Abaixo do teto, sem ambiguidade de arredondamento. |
| R$ 300,00 | R$ 30,00 | R$ 270,00 | Ponto em que percentual e teto coincidem. |
| R$ 300,10 | R$ 30,00 | R$ 270,10 | Acima do teto. |

Testaria também o checkout sem cupom: desconto zero e cobrança pelo subtotal. Para subtotal negativo, esperaria validação de entrada e nenhuma chamada ao gateway. Se houver entrada de código de cupom, acrescentaria casos de código inválido ou não aplicável conforme a política de produto definida; não presumiria se a compra deve ser recusada ou prosseguir sem desconto.

## Níveis e dublês

1. **Unidade — regra de preço:** testes parametrizados para a tabela, incluindo as duas fronteiras e o teto; verificar desconto, total e representação exata em centavos. Após decidir o arredondamento, acrescentar valores que gerem frações de centavo e verificar que o teto nunca é excedido. A função de cálculo deve ser testada sem gateway. Isso prova a aritmética e a condição local, mas não prova que o checkout usa o resultado na cobrança.
2. **Integração do checkout — orquestração:** usar um *fake* ou *stub* do gateway com um *spy* para registrar a chamada. Em aprovação, verificar que o valor enviado é o total calculado, na moeda e unidade esperadas, e que pedido/recibo registram subtotal, desconto e total coerentes. Repetir para R$ 100,00, R$ 100,01 e R$ 300,10. Em recusa e falha de comunicação, verificar que a compra não é marcada como paga e que o erro é tratado conforme o contrato. Se existir retentativa, verificar chave de idempotência e ausência de cobranças duplicadas. Esses testes provam o fluxo da aplicação, mas o dublê não prova formato, autenticação nem comportamento reais do provedor.
3. **Contrato/adaptador do gateway:** testar serialização do valor em centavos, moeda, campos obrigatórios, interpretação de aprovação/recusa e tratamento de timeout/erro contra o contrato oficial ou ambiente de teste do gateway. Isso detecta divergências de protocolo, mas ainda não prova uma cobrança real ponta a ponta nem disponibilidade do serviço em produção.
4. **Fluxo ponta a ponta:** em ambiente de teste isolado do provedor, concluir uma compra com cupom aplicável e conferir o valor capturado e o estado do pedido; incluir ao menos uma compra de R$ 100,00 sem desconto. Isso cobre a integração dos componentes e a cobrança simulada, mas não garante comportamento da produção, todos os meios de pagamento ou ausência de falhas futuras.

Executaria primeiro os testes de unidade e integração com dublê para orientar a implementação. Manteria os testes com o gateway real de teste em uma suíte separada, pois dependem de rede, credenciais e disponibilidade externa.
