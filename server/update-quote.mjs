#!/usr/bin/env node
// Busca o último fechamento publicado e grava dist/quote.json quando houver novidade.
// Regras: nunca substitui por um pregão mais antigo; se a fonte falhar, mantém o arquivo anterior.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchQuote } from './quotes.mjs';

export const QUOTE_FILE = new URL('../dist/quote.json', import.meta.url);

function sameContracts(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((item, index) => item.contract === b[index].contract && item.price === b[index].price && item.contractLabel === b[index].contractLabel);
}

export function pickNext(previous, next) {
  if (!next) return { action: 'keep', reason: 'a fonte não devolveu uma cotação válida' };
  if (previous && typeof previous.tradeDate === 'string') {
    if (next.tradeDate < previous.tradeDate) return { action: 'keep', reason: `a fonte voltou de ${previous.tradeDate} para ${next.tradeDate}` };
    if (next.tradeDate === previous.tradeDate && sameContracts(previous.contracts, next.contracts)) return { action: 'unchanged' };
  }
  return { action: 'write' };
}

export function toFileContent(quote) {
  return JSON.stringify({ version: 1, ...quote }, null, 2) + '\n';
}

export function summarize(quote) {
  const [year, month, day] = quote.tradeDate.split('-');
  const price = quote.price.toFixed(2).replace('.', ',');
  return `${day}/${month}/${year} ${quote.contractLabel} R$ ${price}/@`;
}

async function writeOutputs(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value).replace(/\r?\n/g, ' ')}`).join('\n') + '\n';
  await appendFile(process.env.GITHUB_OUTPUT, lines);
}

export async function main() {
  let previous = null;
  try { previous = JSON.parse(await readFile(QUOTE_FILE, 'utf8')); } catch (_) { previous = null; }
  let next = null;
  let failure = null;
  try { next = await fetchQuote(); } catch (error) { failure = error; }
  const decision = pickNext(previous, next);
  if (decision.action === 'write') {
    await writeFile(QUOTE_FILE, toFileContent(next));
    console.log(`Cotação gravada: ${summarize(next)}`);
    await writeOutputs({ changed: 'true', summary: summarize(next) });
    return;
  }
  if (decision.action === 'unchanged') {
    console.log(`Sem novidade: ${summarize(previous)}`);
    await writeOutputs({ changed: 'false', summary: summarize(previous) });
    return;
  }
  const reason = failure ? failure.message : decision.reason;
  if (previous && previous.tradeDate) {
    console.error(`Cotação anterior mantida (${summarize(previous)}): ${reason}`);
    await writeOutputs({ changed: 'false', summary: summarize(previous) });
    return;
  }
  console.error(`Sem cotação para gravar: ${reason}`);
  await writeOutputs({ changed: 'false', summary: 'falha' });
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
