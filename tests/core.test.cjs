'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../dist/core.js');

function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-10, actual + ' ≠ ' + expected); }

const sample = {
  source: 'Notícias Agrícolas',
  sourceUrl: 'https://www.noticiasagricolas.com.br/widgets/cotacoes?id=248',
  upstream: 'B3',
  priceType: 'Fechamento do pregão regular',
  tradeDate: '2026-11-13',
  fetchedAt: '2026-11-15T19:22:04.836Z',
  contract: 'BGIX26',
  contractLabel: 'Novembro/2026',
  price: 402.1,
  contracts: [
    { contract: 'BGIX26', contractLabel: 'Novembro/2026', price: 402.1, expiryYear: 2026, expiryMonth: 11, changePercent: -0.21 },
    { contract: 'BGIZ26', contractLabel: 'Dezembro/2026', price: 407.9, expiryYear: 2026, expiryMonth: 12 }
  ]
};
const now = new Date('2026-11-15T20:00:00Z');

test('aceita vírgula e ponto decimal sem converter vazio para zero', () => {
  assert.equal(core.parseDecimal(' 402,10 '), 402.1);
  assert.equal(core.parseDecimal('402.10'), 402.1);
  assert.equal(core.parseDecimal('-5,25'), -5.25);
  assert.equal(core.parseDecimal('+5.25'), 5.25);
  assert.equal(core.parseDecimal(',5'), 0.5);
  for (const invalid of ['', ' ', null, 402, 'Infinity', 'NaN', '1e3', '1.234,56', '1,234.56', '12 34', '--2', ',']) {
    assert.equal(core.parseDecimal(invalid), null, String(invalid));
  }
});

test('não há valor de exemplo: arroba e oferta começam vazias e 52% é o principal', () => {
  assert.deepEqual(core.DEFAULTS, { bgi: '', ajuste: '0', oferta: '' });
  assert.equal(core.RENDIMENTO_PRINCIPAL, 52);
  const checked = core.validate(core.DEFAULTS);
  assert.equal(checked.ok, false);
  assert.equal(checked.emptyBgi, true);
  assert.deepEqual(Object.keys(checked.errors), ['bgi']);
});

test('valida limites: oferta vazia é opcional, ajuste vai de −50 a +50', () => {
  const optional = core.validate({ bgi: '402,10', ajuste: '-50', oferta: '' });
  assert.equal(optional.ok, true);
  assert.equal(optional.values.oferta, null);
  assert.equal(core.validate({ bgi: '402', ajuste: '50', oferta: '0' }).ok, true);
  const invalid = core.validate({ bgi: '0', ajuste: '50,01', oferta: '-1' });
  assert.equal(invalid.ok, false);
  assert.deepEqual(Object.keys(invalid.errors), ['bgi', 'ajuste', 'oferta']);
  assert.equal(core.validate({ bgi: 'abc', ajuste: '', oferta: '15' }).ok, false);
});

test('equivalente é arroba × rendimento ÷ 15 e a diferença compara a oferta', () => {
  const results = core.calculate({ bgi: 402.1, ajuste: 0, oferta: 15 });
  assert.deepEqual(results.map(r => r.rendimento), [50, 52, 55]);
  const main = results.find(r => r.principal);
  assert.equal(main.rendimento, 52);
  close(main.equivalente, 402.1 * 52 / 1500);
  close(main.diferenca, 15 / (402.1 * 52 / 1500) - 1);
  close(results[0].equivalente, 402.1 / 30);
  close(results[2].equivalente, 402.1 * 55 / 1500);
});

test('sem oferta, calcula o equivalente e deixa a diferença nula', () => {
  for (const values of [{ bgi: 402, ajuste: 0, oferta: null }, { bgi: 402, ajuste: 0 }]) {
    const results = core.calculate(values);
    close(results[1].equivalente, 13.936);
    assert.equal(results[1].diferenca, null);
  }
});

test('ajuste comercial multiplica o equivalente em eixo separado', () => {
  const base = core.calculate({ bgi: 402, ajuste: 0, oferta: 15 });
  close(base[1].diferenca * 100, 7.634902411021804);
  const discount = core.calculate({ bgi: 402, ajuste: -5, oferta: 15 });
  const premium = core.calculate({ bgi: 402, ajuste: 5, oferta: 15 });
  base.forEach((result, index) => {
    close(discount[index].equivalente, result.equivalente * 0.95);
    close(premium[index].equivalente, result.equivalente * 1.05);
  });
});

test('zero, igualdade, preços abaixo e extremos permanecem definidos ou rejeitados', () => {
  assert.equal(core.calculate({ bgi: 450, ajuste: 0, oferta: 15 })[0].diferenca, 0);
  assert.equal(core.calculate({ bgi: 450, ajuste: 0, oferta: 0 })[0].diferenca, -1);
  assert.ok(core.calculate({ bgi: 450, ajuste: 0, oferta: 14 })[0].diferenca < 0);
  assert.throws(() => core.calculate({ bgi: 0, ajuste: 0, oferta: 15 }), RangeError);
  assert.throws(() => core.calculate({ bgi: 398, ajuste: Infinity, oferta: 15 }), RangeError);
  assert.throws(() => core.calculate({ bgi: 398, ajuste: 0, oferta: -1 }), RangeError);
  assert.throws(() => core.calculate({ bgi: Number.MIN_VALUE, ajuste: -50, oferta: Number.MAX_VALUE }), RangeError);
});

test('botões + e − andam por unidade, respeitam limites e escrevem com vírgula', () => {
  assert.equal(core.step('bgi', '402,10', 1), '403,10');
  assert.equal(core.step('bgi', '402.10', -1), '401,10');
  assert.equal(core.step('bgi', '', 1), '1,00');
  assert.equal(core.step('bgi', '0,50', -1), '0,00');
  assert.equal(core.step('oferta', '15', 1), '15,10');
  assert.equal(core.step('oferta', '15,05', -1), '14,95');
  assert.equal(core.step('oferta', '0', -1), '0,00');
  assert.equal(core.step('ajuste', '0', -1), '-1');
  assert.equal(core.step('ajuste', '-2,5', 1), '-1,5');
  assert.equal(core.step('ajuste', '50', 1), '50');
  assert.equal(core.step('ajuste', '-50', -1), '-50');
  assert.equal(core.step('ajuste', '1', -1), '0');
  assert.equal(core.step('bgi', 'abc', 1), null);
  assert.equal(core.step('nada', '1', 1), null);
  assert.equal(core.formatDecimal(402.1, 'bgi'), '402,10');
});

test('validateQuote aceita o arquivo gerado e rejeita dados incompletos, futuros ou trocados', () => {
  const quote = core.validateQuote({ version: 1, ...sample }, now);
  assert.equal(quote.price, 402.1);
  assert.equal(quote.contractLabel, 'Novembro/2026');
  assert.equal(quote.contracts.length, 2);
  assert.equal(quote.contracts[0].changePercent, -0.21);
  assert.equal(quote.contracts[1].changePercent, null);
  const bad = [null, {}, 'texto',
    { ...sample, price: 0 }, { ...sample, price: 398 }, { ...sample, tradeDate: '2026-11-16' }, { ...sample, tradeDate: '13/11/2026' }, { ...sample, tradeDate: '2026-02-31' },
    { ...sample, contracts: [] }, { ...sample, contract: 'BGIZ26' }, { ...sample, sourceUrl: 'http://x' }, { ...sample, fetchedAt: 'ontem' },
    { ...sample, contracts: [{ ...sample.contracts[0], price: '402,10' }] }, { ...sample, contracts: [{ ...sample.contracts[0], contract: 'GO RD' }] },
    { ...sample, contracts: [sample.contracts[0], sample.contracts[0]] }];
  for (const item of bad) assert.equal(core.validateQuote(item, now), null, JSON.stringify(item));
});

test('data do pregão não pode estar no futuro pelo calendário de São Paulo', () => {
  assert.equal(core.todayInSaoPaulo(new Date('2026-11-16T01:00:00Z')), '2026-11-15');
  assert.notEqual(core.validateQuote({ ...sample, tradeDate: '2026-11-15' }, new Date('2026-11-15T12:00:00Z')), null);
  assert.equal(core.validateQuote({ ...sample, tradeDate: '2026-11-16' }, new Date('2026-11-16T01:00:00Z')), null);
});

test('restaura estado v2, migra v1 sem a arroba de exemplo e ignora lixo', () => {
  const v2 = { version: 2, inputs: { bgi: '402,10', ajuste: '-2', oferta: '15.25' }, bgiMode: 'manual', contract: 'BGIX26' };
  assert.deepEqual(core.restore(JSON.stringify(v2)), { inputs: v2.inputs, bgiMode: 'manual', contract: 'BGIX26' });
  const v1 = core.restore(JSON.stringify({ version: 1, inputs: { bgi: '398', ajuste: '0', oferta: '15' } }));
  assert.deepEqual(v1, { inputs: { bgi: '', ajuste: '0', oferta: '15' }, bgiMode: 'auto', contract: null });
  for (const stored of [null, 'bad JSON', '{}', '{"version":3,"inputs":{}}']) assert.equal(core.restore(stored), null);
  const weird = core.restore(JSON.stringify({ version: 2, inputs: { bgi: 398, ajuste: 'x', oferta: '1e3' }, bgiMode: 'auto', contract: 'XX' }));
  assert.deepEqual(weird, { inputs: { bgi: '', ajuste: '0', oferta: '' }, bgiMode: 'auto', contract: null });
});
