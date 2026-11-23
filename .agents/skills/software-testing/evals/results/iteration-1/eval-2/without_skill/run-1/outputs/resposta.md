# Teste de regressão do frete grátis

Crie um teste no nível mais próximo da regra de cálculo, usando o mesmo caminho pelo qual o pedido real obtém o frete. Com um pedido elegível cujo subtotal considerado pela regra seja **R$ 200,00**, afirme que o frete calculado é **R$ 0,00**. Inclua valores vizinhos para delimitar a fronteira: **R$ 199,99** deve manter o frete normal e **R$ 200,01** deve receber frete grátis. Use valores monetários exatos (centavos inteiros ou decimal), sem ponto flutuante; deixe explícito se descontos entram no valor usado pela regra.

## Verificação mínima para o agente

1. Execute o teste novo na versão com o bug, antes da correção, e confirme que **falha especificamente no pedido de R$ 200,00**: o resultado é frete cobrado quando o esperado é zero.
2. Execute o mesmo teste após a correção e confirme que passa. Rode também os testes existentes do cálculo de frete para detectar efeitos sobre as faixas vizinhas.
3. Registre os comandos e resultados dessas execuções. Só declare que o teste cobre a regressão se houver evidência de que ele detectava o defeito e passa com a correção.

Se o teste novo **já passava antes da correção**, não o aceite como prova de regressão. Verifique se o pedido realmente chega ao cálculo alterado, se o subtotal usado é exatamente R$ 200,00, se um cupom, configuração, mock ou arredondamento antecipa o frete grátis e se a asserção observa o valor final correto. Ajuste o cenário para reproduzir a falha e repita a sequência. Se o comportamento antigo não puder ser reproduzido, investigue a causa e relate essa limitação; não atribua ao teste uma proteção que ele não demonstrou.
