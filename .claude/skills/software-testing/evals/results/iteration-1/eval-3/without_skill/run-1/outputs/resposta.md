# Revisão dos testes de frete

Executei `node --test` na fixture: **2 testes passaram, nenhum falhou**. Esse resultado não demonstra conformidade com o contrato do README.

## Defeitos que passam com a suíte verde

- **Limite inclusivo incorreto, já presente na implementação.** O contrato dá frete grátis a partir de 20.000 centavos, inclusive. `calcularFrete(20000)` retorna 1.500 porque a condição usa `> 20000`. O teste de frete grátis usa somente 20.100 centavos.
- **Subtotal negativo aceito, já presente na implementação.** `calcularFrete(-1)` retorna 1.500, embora o contrato exija rejeição. Não há teste para entrada negativa.
- **Valor incorreto abaixo do limite pode passar.** O teste com 10.000 centavos exige apenas resultado maior que zero. Uma implementação que cobrasse 1, 1.499 ou 2.000 centavos passaria nesse caso, apesar de o valor contratado ser exatamente 1.500 centavos. Outros subtotais abaixo do limite, inclusive zero e 19.999, também não são exercitados.

## Dois testes que adicionaria primeiro

```js
test('frete gratis no limite inclusivo de R$ 200', () => {
  assert.equal(calcularFrete(20000), 0);
});

test('rejeita subtotal negativo', () => {
  assert.throws(() => calcularFrete(-1));
});
```

Esses dois testes cobrem regras explícitas sem qualquer verificação atual e **falham na implementação existente**, revelando defeitos reais mesmo com a suíte atual verde. Em seguida, trocaria a asserção `> 0` por `=== 1500` e verificaria o valor imediatamente abaixo do limite (19.999 centavos).

Nenhum arquivo da fixture foi alterado.
