export const QUOTE_SOURCE_URL = 'https://www.noticiasagricolas.com.br/widgets/cotacoes?id=248';
const MAX_BYTES = 500_000;
const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const CODES = 'FGHJKMNQUVXZ';
const plain = value => value.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const normalized = value => plain(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function todayInSaoPaulo(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function tradeDate(raw, today) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) throw new Error('Data do fechamento ausente ou inválida.');
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso || Number(year) < 2000 || iso > today) {
    throw new Error('Data do fechamento inválida ou futura.');
  }
  return iso;
}

function decimal(raw) {
  const value = plain(raw);
  if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(value)) return null;
  const result = Number(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(result) ? result : null;
}

/** Public publisher widget; explicit expiry, not TradingView's BGI1! series. */
export function parseQuoteHtml(html, now = new Date()) {
  if (typeof html !== 'string' || !html || html.length > MAX_BYTES || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('Resposta de cotação ou horário inválido.');
  }
  const clean = html.replace(/<!--[^]*?-->/g, '').replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, '');
  if (!normalized(clean).includes('boi gordo - b3 (pregao regular)')) throw new Error('Fonte de cotação inesperada.');
  const today = todayInSaoPaulo(now);
  const candidates = [];
  for (const match of clean.matchAll(/<table\b[^>]*>([^]*?)<\/table\s*>/gi)) {
    const table = match[1];
    const headings = [...table.matchAll(/<th\b[^>]*>([^]*?)<\/th\s*>/gi)].map(m => normalized(m[1]));
    if (!headings.includes('contrato - mes') || !headings.includes('fechamento (r$/@)')) continue;
    const prefix = clean.slice(0, match.index);
    const previousDates = [...prefix.matchAll(/class=["'][^"']*\bfechamento\b[^"']*["'][^>]*>\s*Fechamento:\s*([^<]*)/gi)];
    const widgetDate = /Fech\.\s*([^<\s]+)\s*</i.exec(table);
    const rawDate = widgetDate?.[1] ?? previousDates.at(-1)?.[1]?.trim();
    const date = tradeDate(rawDate ?? '', today);
    const minimumMonth = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
    const contracts = [];
    const tbody = /<tbody\b[^>]*>([^]*?)<\/tbody\s*>/i.exec(table)?.[1];
    if (!tbody) continue;
    for (const row of tbody.matchAll(/<tr\b[^>]*>([^]*?)<\/tr\s*>/gi)) {
      const cells = [...row[1].matchAll(/<td\b[^>]*>([^]*?)<\/td\s*>/gi)].map(m => plain(m[1]));
      const expiry = /^([a-z]+)\s*\/\s*(\d{4})$/.exec(normalized(cells[0] ?? ''));
      if (!expiry) continue;
      const month = MONTHS.indexOf(expiry[1]);
      const year = Number(expiry[2]);
      const price = decimal(cells[1] ?? '');
      if (month < 0 || year < 2000 || year > 2099 || year * 12 + month < minimumMonth || price === null || price <= 0) continue;
      const contract = `BGI${CODES[month]}${String(year).slice(-2)}`;
      if (contracts.some(item => item.contract === contract)) continue;
      const changePercent = decimal(cells[2] ?? '');
      contracts.push({ contract, contractLabel: cells[0], price, expiryYear: year, expiryMonth: month + 1, ...(changePercent === null ? {} : { changePercent }) });
    }
    contracts.sort((a, b) => a.expiryYear - b.expiryYear || a.expiryMonth - b.expiryMonth);
    if (contracts.length) candidates.push({ date, contracts });
  }
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  const selected = candidates[0];
  if (!selected) throw new Error('Nenhum fechamento com vencimento e preço válidos.');
  const first = selected.contracts[0];
  return { source: 'Notícias Agrícolas', sourceUrl: QUOTE_SOURCE_URL, upstream: 'B3', priceType: 'Fechamento do pregão regular', tradeDate: selected.date, fetchedAt: now.toISOString(), contract: first.contract, contractLabel: first.contractLabel, price: first.price, contracts: selected.contracts };
}

export async function fetchQuote(now = new Date()) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(QUOTE_SOURCE_URL, { headers: { Accept: 'text/html', 'User-Agent': 'GadoBoiCalc/1.0 (cattle-price reference)' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Fonte de cotação respondeu HTTP ${response.status}.`);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Resposta da fonte excede o limite.');
    if (!response.body) throw new Error('Fonte retornou uma resposta vazia.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let html = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Resposta da fonte excede o limite.'); }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    return parseQuoteHtml(html, now);
  } finally { clearTimeout(timer); }
}
