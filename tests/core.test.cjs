'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../dist/core.js');

function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-10, actual + ' ≠ ' + expected); }

test('aceita vírgula e ponto decimal sem converter vazio para zero', () => {
  assert.equal(core.parseDecimal(' 398,50 '), 398.5);
  assert.equal(core.parseDecimal('398.50'), 398.5);
  assert.equal(core.parseDecimal('-5,25'), -5.25);
  assert.equal(core.parseDecimal('+5.25'), 5.25);
  assert.equal(core.parseDecimal(',5'), 0.5);
  for (const invalid of ['', ' ', null, 398, 'Infinity', 'NaN', '1e3', '1.234,56', '1,234.56', '12 34', '--2', ',']) {
    assert.equal(core.parseDecimal(invalid), null, String(invalid));
  }
});

test('valida limites e permite oferta zero e ajuste negativo', () => {
  assert.equal(core.validate({ bgi: '398', ajuste: '-50', oferta: '0' }).ok, true);
  assert.equal(core.validate({ bgi: '398', ajuste: '50', oferta: '15' }).ok, true);
  const invalid = core.validate({ bgi: '0', ajuste: '50,01', oferta: '-1' });
  assert.equal(invalid.ok, false);
  assert.deepEqual(Object.keys(invalid.errors), ['bgi', 'ajuste', 'oferta']);
  assert.equal(core.validate({ bgi: '-1', ajuste: '-50,01', oferta: '' }).ok, false);
});

test('exemplo inicial de 398 preserva precisão antes da diferença', () => {
  const checked = core.validate(core.DEFAULTS);
  assert.equal(checked.ok, true);
  const results = core.calculate(checked.values);
  close(results[0].equivalente, 398 / 30);
  close(results[1].equivalente, 398 * 52 / 1500);
  close(results[2].equivalente, 398 * 55 / 1500);
  results.forEach(result => close(result.diferenca, 15 / result.equivalente - 1));
});

test('referência anterior de 402 e ajuste comercial operam em eixos distintos', () => {
  const results = core.calculate({ bgi: 402, ajuste: 0, oferta: 15 });
  close(results[0].equivalente, 13.4);
  close(results[1].equivalente, 13.936);
  close(results[2].equivalente, 14.74);
  close(results[1].diferenca * 100, 7.634902411021804);
  const discount = core.calculate({ bgi: 402, ajuste: -5, oferta: 15 });
  const premium = core.calculate({ bgi: 402, ajuste: 5, oferta: 15 });
  results.forEach((result, index) => {
    close(discount[index].equivalente, result.equivalente * 0.95);
    close(premium[index].equivalente, result.equivalente * 1.05);
  });
});

test('zero, igualdade, preços abaixo e números extremos permanecem definidos', () => {
  assert.equal(core.calculate({ bgi: 450, ajuste: 0, oferta: 15 })[0].diferenca, 0);
  assert.equal(core.calculate({ bgi: 450, ajuste: 0, oferta: 0 })[0].diferenca, -1);
  assert.ok(core.calculate({ bgi: 450, ajuste: 0, oferta: 14 })[0].diferenca < 0);
  assert.throws(() => core.calculate({ bgi: 0, ajuste: 0, oferta: 15 }), RangeError);
  assert.throws(() => core.calculate({ bgi: 398, ajuste: Infinity, oferta: 15 }), RangeError);
  assert.throws(() => core.calculate({ bgi: Number.MIN_VALUE, ajuste: -50, oferta: Number.MAX_VALUE }), RangeError);
});

test('restaura apenas dados locais válidos e ignora JSON incompatível', () => {
  const inputs = { bgi: '398,50', ajuste: '-2', oferta: '15.25' };
  assert.deepEqual(core.restore(JSON.stringify({ version: 1, inputs })), inputs);
  for (const stored of [null, 'bad JSON', '{}', '{"version":2}', JSON.stringify({ version: 1, inputs: { ...inputs, oferta: '' } }), JSON.stringify({ version: 1, inputs: { ...inputs, bgi: 398 } })]) {
    assert.equal(core.restore(stored), null);
  }
});
