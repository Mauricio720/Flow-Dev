import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFrete } from './frete.js';

test('frete gratis acima de R$ 200', () => {
  assert.equal(calcularFrete(20100), 0);
});

test('frete positivo abaixo de R$ 200', () => {
  assert.ok(calcularFrete(10000) > 0);
});
