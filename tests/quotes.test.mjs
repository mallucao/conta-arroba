import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseQuoteHtml, fetchQuote, QUOTE_SOURCE_URL } from '../server/quotes.mjs';

const fixture = await readFile(new URL('./fixtures/na-bgi-2026-11-13.html', import.meta.url), 'utf8');
const now = new Date('2026-11-15T15:00:00Z');

test('publisher factual widget selects the explicit nearest valid expiry', () => {
  const quote = parseQuoteHtml(fixture, now);
  assert.equal(quote.contract, 'BGIX26');
  assert.equal(quote.contractLabel, 'Novembro/2026');
  assert.equal(quote.price, 402.1);
  assert.equal(quote.tradeDate, '2026-11-13');
  assert.equal(quote.contracts.length, 6);
  assert.equal(quote.contracts.find(c => c.contract === 'BGIH27').price, 407.85);
  assert.equal(quote.sourceUrl, QUOTE_SOURCE_URL);
  assert.equal(quote.fetchedAt, now.toISOString());
});

test('history markup chooses newest trade date independently of table order', () => {
  const table = fixture.match(/<table\b[^>]*>([^]*?)<\/table>/)[0].replace(/<tfoot>[^]*?<\/tfoot>/, '');
  const html = `<h1>Boi Gordo - B3 (Pregão Regular)</h1><div class="fechamento">Fechamento: 12/11/2026</div>${table.replace('402,10', '403,05')}<div class="fechamento">Fechamento: 13/11/2026</div>${table}`;
  assert.equal(parseQuoteHtml(html, now).price, 402.1);
});

test('rejects wrong source, malformed table, invalid and future trade dates', () => {
  for (const html of ['', '<table></table>', fixture.replace('Boi Gordo - B3 (Pregão Regular)', 'Milho'), fixture.replace('13/11/2026', '31/02/2026'), fixture.replace('13/11/2026', '16/11/2026'), fixture.replace('Fech. 13/11/2026', 'Fech. xyz'), fixture.replaceAll('<tbody>', '<bad>')]) {
    assert.throws(() => parseQuoteHtml(html, now));
  }
});

test('ignores invalid prices, malformed labels, expired contracts and handles accents', () => {
  const html = fixture.replace('402,10', 'NaN').replace('Dezembro/2026', 'Outubro/2026');
  assert.equal(parseQuoteHtml(html, now).contract, 'BGIF27');
  for (const invalid of ['0', '-1', 'Infinity', '1x', '9'.repeat(400)]) {
    assert.equal(parseQuoteHtml(fixture.replace('402,10', invalid), now).contract, 'BGIZ26');
  }
  assert.equal(parseQuoteHtml(fixture.replace('Novembro/2026', 'Março/2027'), now).contract, 'BGIZ26');
});

test('trade date uses São Paulo calendar rather than UTC', () => {
  assert.throws(() => parseQuoteHtml(fixture.replace('13/11/2026', '15/11/2026'), new Date('2026-11-15T01:00:00Z')));
});

test('fetch uses a fixed public URL and validates bounded responses', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => { assert.equal(url, QUOTE_SOURCE_URL); assert.match(options.headers['User-Agent'], /^GadoBoiCalc/); return new Response(fixture); };
    assert.equal((await fetchQuote(now)).price, 402.1);
    globalThis.fetch = async () => new Response('no', { status: 503 });
    await assert.rejects(fetchQuote(now), /503/);
    globalThis.fetch = async () => new Response('x'.repeat(500_001));
    await assert.rejects(fetchQuote(now), /limite/);
  } finally { globalThis.fetch = original; }
});
