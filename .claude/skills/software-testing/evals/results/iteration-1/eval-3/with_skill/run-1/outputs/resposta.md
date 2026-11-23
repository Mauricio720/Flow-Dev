# Revisão dos testes de frete

**Resultado observado:** `node --test` passou: 2 testes, 2 aprovados. O verde não comprova todo o contrato do [README](../../../../../../fixtures/frete/README.md): a implementação atual devolve `1500` para `20000` centavos e também para `-1`, embora o contrato exija frete zero no primeiro caso e rejeição no segundo. Confirmei ambos por chamada direta a `calcularFrete`, sem modificar a fixture.

## Achados, por prioridade

1. **Limite inclusivo sem teste — `frete.test.js:5-7`.** O único caso de frete grátis usa `20100`. Se a condição for `subtotal > 20000`, como em `frete.js:2`, o teste passa mesmo cobrando R$ 15,00 para uma compra de exatamente R$ 200,00. Acrescentar o caso `calcularFrete(20000) === 0` detecta essa falha concreta.
2. **Subtotal negativo sem teste — `frete.test.js:5-11`.** Nenhum caso exige rejeição. A implementação atual devolve `1500` para `-1`, aceitando uma entrada que o contrato proíbe. Acrescentar uma chamada com `-1` e verificar rejeição pela convenção da API. Se a convenção for lançar exceção, `assert.throws(() => calcularFrete(-1))` é uma asserção apropriada; o README não define tipo ou mensagem da exceção.
3. **Valor abaixo do limite pouco protegido — `frete.test.js:9-11`.** `assert.ok(calcularFrete(10000) > 0)` aceita, por exemplo, `1` centavo ou `2000` centavos, apesar do preço contratado de `1500`. Trocar por `assert.equal(calcularFrete(10000), 1500)` protegeria o valor exato. Este risco ainda escaparia após os dois testes prioritários.

## Dois testes a adicionar primeiro

```js
test('frete é zero no subtotal de R$ 200,00', () => {
  assert.equal(calcularFrete(20000), 0);
});

test('subtotal negativo é rejeitado', () => {
  assert.throws(() => calcularFrete(-1));
});
```

Escolho esses dois primeiro porque cada um detecta um defeito **já presente** e cobre uma promessa independente do contrato: a inclusividade do limite e a validade da entrada. O teste de valor exato abaixo do limite vem em seguida; sua asserção atual ainda permite preço incorreto. Para o segundo teste, a equipe deve confirmar que “rejeitado” significa lançar exceção na API síncrona; o contrato não especifica a forma da rejeição.

**Verificação:** `node --test` no diretório `frete` terminou com código 0 (2/2 aprovados). Chamadas diretas retornaram `calcularFrete(20000) === 1500`, `calcularFrete(-1) === 1500` e `calcularFrete(10000) === 1500`. Nenhum arquivo da fixture foi editado.
