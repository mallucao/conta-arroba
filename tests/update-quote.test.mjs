import test from 'node:test';
import assert from 'node:assert/strict';
import { pickNext, toFileContent, summarize } from '../server/update-quote.mjs';

const base = {
  tradeDate: '2026-11-13',
  contract: 'BGIX26',
  contractLabel: 'Novembro/2026',
  price: 402.1,
  contracts: [{ contract: 'BGIX26', contractLabel: 'Novembro/2026', price: 402.1 }, { contract: 'BGIZ26', contractLabel: 'Dezembro/2026', price: 407.9 }]
};

test('grava quando não há arquivo, quando o pregão avança ou quando um preço muda', () => {
  assert.equal(pickNext(null, base).action, 'write');
  assert.equal(pickNext({ version: 1 }, base).action, 'write');
  assert.equal(pickNext(base, { ...base, tradeDate: '2026-11-16' }).action, 'write');
  assert.equal(pickNext(base, { ...base, contracts: [{ ...base.contracts[0], price: 403 }, base.contracts[1]] }).action, 'write');
  assert.equal(pickNext(base, { ...base, contracts: [base.contracts[0]] }).action, 'write');
});

test('mantém o arquivo quando a fonte falha, repete o mesmo pregão ou volta no tempo', () => {
  assert.equal(pickNext(base, null).action, 'keep');
  assert.equal(pickNext(base, { ...base, fetchedAt: 'outro horário' }).action, 'unchanged');
  const back = pickNext(base, { ...base, tradeDate: '2026-11-12' });
  assert.equal(back.action, 'keep');
  assert.match(back.reason, /voltou/);
});

test('arquivo leva versão, termina com quebra de linha e o resumo usa data brasileira', () => {
  const text = toFileContent(base);
  assert.ok(text.endsWith('\n'));
  assert.equal(JSON.parse(text).version, 1);
  assert.equal(JSON.parse(text).price, 402.1);
  assert.equal(summarize(base), '13/11/2026 Novembro/2026 R$ 402,10/@');
});
