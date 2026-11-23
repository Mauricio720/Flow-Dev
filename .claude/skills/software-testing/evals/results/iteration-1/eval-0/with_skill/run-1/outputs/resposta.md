# Plano de testes do cupom no checkout

**Contrato conhecido:** o desconto é 10% do subtotal somente quando ele é **maior** que R$ 100,00, limitado a R$ 30,00. O gateway deve receber o valor final calculado para a cobrança. Os valores esperados abaixo vêm dessa regra, e não de uma futura implementação.

| Risco e caso | Entrada e ação | Resultado observável esperado | Falha que detecta |
|---|---|---|---|
| Limite inferior | Aplicar o cupom com subtotal de R$ 99,99 e de R$ 100,00 | Desconto R$ 0,00; total igual ao subtotal | Usar `>= 100` ou conceder desconto abaixo do limite |
| Primeiro valor elegível | Aplicar com R$ 100,01 | Cupom elegível e desconto de 10%, arredondado conforme a política monetária definida | Usar `> 100,01`, perder centavos ou arredondar o subtotal antes de comparar |
| Cálculo normal | Aplicar com R$ 101,00 | Desconto R$ 10,10; total R$ 90,90 | Percentual, base de cálculo ou subtração incorretos |
| Teto | Aplicar com R$ 290,00, R$ 300,00 e R$ 310,00 | Descontos R$ 29,00, R$ 30,00 e R$ 30,00; totais R$ 261,00, R$ 270,00 e R$ 280,00 | Teto aplicado cedo demais, tarde demais ou ausente |
| Valores inválidos | Informar subtotal negativo, `NaN` ou infinito, se a API pública puder recebê-los | Entrada rejeitada antes de cobrar; nenhum valor inválido enviado ao gateway | Cobrança inválida ou desconto negativo |

**Primeira fronteira — regra de preço:** testar a API pública que calcula o total, com dados em centavos ou outra representação monetária definida pelo projeto e colaboradores simples reais. Comparar desconto e total exatos. Esses testes provam a condição estrita e o teto; não provam que o checkout usa o cálculo nem que a requisição ao gateway está correta.

**Segunda fronteira — checkout e cobrança:** exercitar o fluxo real de checkout com a regra real e substituir somente o gateway por um dublê controlado. Para R$ 100,00, R$ 101,00 e R$ 310,00, verificar respectivamente uma cobrança de R$ 100,00, R$ 90,90 e R$ 280,00, com a moeda correta e uma única tentativa por confirmação. Simular aprovação e recusa/erro do gateway; na recusa/erro, o checkout não deve apresentar pagamento concluído. Se existir reenvio ou retry, testar que ele não cria cobrança duplicada, conforme o contrato de idempotência adotado. Isso prova a ligação entre cálculo e cobrança contra o dublê; não prova compatibilidade com o fornecedor nem a jornada pela interface.

**Terceira fronteira — cliente do gateway:** exercitar o cliente HTTP real contra um servidor controlado, verificando a serialização do valor em centavos, moeda e interpretação de aprovação e recusa. Um contrato do fornecedor ou teste isolado em sandbox deve conferir a compatibilidade quando disponível. Respostas simuladas e sandbox não provam disponibilidade nem comportamento da produção.

**Jornada completa:** manter poucos testes pela interface pública, por exemplo R$ 100,00 sem desconto e R$ 101,00 com desconto, conferindo o total mostrado, o total cobrado e o resultado percebido após aprovação. Eles comprovam a conexão entre interface e checkout, mas não substituem os casos de fronteira da regra nem garantem o contrato externo.

**Decisões a fixar antes de implementar:** política de arredondamento dos 10% em centavos (inclusive R$ 100,01); se o subtotal usado no limite e no desconto é antes de frete, impostos ou outros descontos; comportamento para cupom desconhecido/repetido; estado do pedido e política de retry após erro de gateway. Até isso ser definido, não inventar valores esperados para esses cenários. Nenhum teste foi executado: esta entrega é somente o planejamento pedido.
