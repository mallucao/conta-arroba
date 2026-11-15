(function () {
  'use strict';
  const core = window.BoiCalc;
  const STORAGE_KEY = 'gado:conta-arroba:v2';
  const QUOTE_KEY = 'gado:conta-arroba:quote:v1';
  const QUOTE_URL = './quote.json';
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const STALE_DAYS = 5;
  const REFRESH_INTERVAL = 10 * 60 * 1000;
  const names = ['bgi', 'ajuste', 'oferta'];
  const el = id => document.getElementById(id);
  const fields = Object.fromEntries(names.map(name => [name, el(name)]));
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const numAdj = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dateLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const state = { quote: null, bgiMode: 'auto', contract: null, fetching: false, failed: false, lastFetch: 0 };
  let announceTimer;

  function readStorage(key) { try { return window.localStorage.getItem(key); } catch (_) { return null; } }
  function writeStorage(key, value) { try { window.localStorage.setItem(key, value); } catch (_) { /* segue sem guardar */ } }
  function parseJSON(value) { try { return JSON.parse(value); } catch (_) { return null; } }
  function setText(id, value) { el(id).textContent = value; }
  function readInputs() { return Object.fromEntries(names.map(name => [name, fields[name].value])); }
  function saveState() {
    writeStorage(STORAGE_KEY, JSON.stringify({ version: 2, inputs: readInputs(), bgiMode: state.bgiMode, contract: state.contract }));
  }

  function selectedContract() {
    if (!state.quote) return null;
    return state.quote.contracts.find(item => item.contract === state.contract) || state.quote.contracts[0];
  }
  function followsQuote() {
    const contract = selectedContract();
    const value = core.parseDecimal(fields.bgi.value);
    return Boolean(contract) && value !== null && Math.abs(value - contract.price) < 0.005;
  }
  function applyQuote() {
    const contract = selectedContract();
    if (!contract) return;
    state.contract = contract.contract;
    fields.bgi.value = core.formatDecimal(contract.price, 'bgi');
    state.bgiMode = 'auto';
  }
  function updateMode() { state.bgiMode = followsQuote() ? 'auto' : 'manual'; }

  function tradeDateLabel(iso) { return dateLong.format(new Date(iso + 'T12:00:00-03:00')); }
  function daysSince(iso) {
    const today = core.todayInSaoPaulo(new Date());
    return Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(iso + 'T12:00:00Z')) / 86400000);
  }
  function chipLabel(item) { return MONTHS[item.expiryMonth - 1] + '/' + String(item.expiryYear).slice(-2); }

  function renderQuote() {
    const quote = state.quote;
    const contract = selectedContract();
    const status = el('quote-status');
    const chips = el('contracts');
    const line2 = el('quote-line-2');
    chips.textContent = '';
    line2.textContent = '';
    if (!quote) {
      setText('quote-line-1', state.fetching ? 'Buscando a cotação…' : 'Cotação indisponível no momento.');
      line2.textContent = state.fetching ? '' : 'Informe a arroba manualmente ou toque em Atualizar.';
      setText('quote-line-3', '');
      status.dataset.tone = state.fetching ? 'neutral' : 'warn';
    } else {
      setText('quote-line-1', 'Fechamento de ' + tradeDateLabel(quote.tradeDate));
      line2.append(contract.contractLabel + ' (' + contract.contract + ') · ' + quote.priceType.toLowerCase() + ' · ' + quote.upstream + ' via ');
      const link = document.createElement('a');
      link.href = quote.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = quote.source;
      line2.append(link);
      const parts = ['Coletado ' + dateTime.format(new Date(quote.fetchedAt))];
      let tone = 'ok';
      if (state.fetching) parts.push('buscando atualização…');
      else if (state.failed) { parts.push('sem acesso à atualização agora'); tone = 'warn'; }
      if (daysSince(quote.tradeDate) > STALE_DAYS) { parts.push('pode haver pregão mais recente'); tone = 'warn'; }
      setText('quote-line-3', parts.join(' · '));
      status.dataset.tone = tone;
      for (const item of quote.contracts) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.dataset.contract = item.contract;
        chip.setAttribute('aria-pressed', String(item.contract === contract.contract));
        chip.setAttribute('aria-label', item.contractLabel + ': ' + num2.format(item.price) + ' reais por arroba');
        const month = document.createElement('span');
        month.className = 'chip-month';
        month.textContent = chipLabel(item);
        const price = document.createElement('span');
        price.className = 'chip-price';
        price.textContent = num2.format(item.price);
        chip.append(month, price);
        chips.append(chip);
      }
    }
    const manual = Boolean(quote) && !followsQuote();
    el('bgi-mode').hidden = !manual;
    if (manual) setText('use-quote-price', num2.format(contract.price));
    const refresh = el('refresh');
    refresh.disabled = state.fetching;
    refresh.textContent = state.fetching ? 'Buscando…' : 'Atualizar';
  }

  function announce(message) {
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(function () { el('result-announcement').textContent = message; }, 300);
  }
  function tone(diferenca) { return diferenca === null ? 'neutral' : diferenca >= 0 ? 'up' : 'down'; }
  function compareText(oferta, diferenca, long) {
    if (oferta === null) return '';
    if (Math.abs(diferenca) < 0.00005) return long ? 'Oferta igual ao equivalente a 52%.' : 'igual ao equivalente';
    const direction = diferenca > 0 ? 'acima' : 'abaixo';
    const size = pct.format(Math.abs(diferenca));
    return long ? 'Oferta ' + size + ' ' + direction + ' do equivalente a 52%' : size + ' ' + direction;
  }
  function calcText(values, equivalente) {
    let formula = num2.format(values.bgi) + ' × 52% ÷ 15 kg';
    if (values.ajuste !== 0) formula += ' × (1 ' + (values.ajuste < 0 ? '−' : '+') + ' ' + numAdj.format(Math.abs(values.ajuste)) + '%)';
    return formula + ' = ' + num2.format(equivalente);
  }
  function adjustSummary(ajuste) {
    if (ajuste === null) return '—';
    const value = ajuste + 0;
    return (value > 0 ? '+' : '') + numAdj.format(value) + '%';
  }

  function clearResults(note) {
    el('hero').dataset.empty = 'true';
    setText('price-52', '—');
    setText('calc-52', note || '');
    for (const rendimento of [50, 55]) {
      setText('price-' + rendimento, '—');
      const diff = el('difference-' + rendimento);
      diff.textContent = '';
      diff.dataset.tone = 'neutral';
    }
    const compare = el('compare');
    compare.textContent = '';
    compare.dataset.tone = 'neutral';
  }

  function render(save) {
    const checked = core.validate(readInputs());
    for (const name of names) {
      const error = checked.errors[name];
      const show = Boolean(error) && !(name === 'bgi' && checked.emptyBgi);
      fields[name].setAttribute('aria-invalid', String(show));
      const node = el(name + '-error');
      node.textContent = show ? error : '';
      node.hidden = !show;
    }
    setText('adjust-summary', adjustSummary(checked.errors.ajuste ? null : checked.values.ajuste));
    if (save) saveState();
    if (!checked.ok) {
      const onlyEmpty = checked.emptyBgi && Object.keys(checked.errors).length === 1;
      clearResults(onlyEmpty ? 'Informe a arroba ou aguarde a cotação.' : 'Revise os campos indicados.');
      announce('Conta indisponível. Revise os valores.');
      return;
    }
    let results;
    try { results = core.calculate(checked.values); }
    catch (_) {
      clearResults('Os valores são grandes ou pequenos demais para a conta.');
      announce('Conta indisponível.');
      return;
    }
    const main = results.find(result => result.principal);
    el('hero').dataset.empty = 'false';
    setText('price-52', num2.format(main.equivalente));
    setText('calc-52', calcText(checked.values, main.equivalente));
    const compare = el('compare');
    compare.textContent = compareText(checked.values.oferta, main.diferenca, true);
    compare.dataset.tone = tone(main.diferenca);
    for (const result of results) {
      if (result.principal) continue;
      setText('price-' + result.rendimento, num2.format(result.equivalente));
      const diff = el('difference-' + result.rendimento);
      diff.textContent = compareText(checked.values.oferta, result.diferenca, false);
      diff.dataset.tone = tone(result.diferenca);
    }
    const spoken = ['52% de rendimento: ' + money.format(main.equivalente) + ' por kg vivo.'];
    if (checked.values.oferta !== null) spoken.push(compareText(checked.values.oferta, main.diferenca, true) + '.');
    announce(spoken.join(' '));
  }

  async function fetchQuote() {
    if (state.fetching) return;
    state.fetching = true;
    state.failed = false;
    renderQuote();
    try {
      const response = await fetch(QUOTE_URL + '?v=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const quote = core.validateQuote(await response.json(), new Date());
      if (!quote) throw new Error('Arquivo de cotação inválido.');
      const previous = state.quote;
      const newer = !previous || quote.tradeDate > previous.tradeDate ||
        (quote.tradeDate === previous.tradeDate && Date.parse(quote.fetchedAt) >= Date.parse(previous.fetchedAt));
      if (newer) {
        state.quote = quote;
        writeStorage(QUOTE_KEY, JSON.stringify(quote));
      }
      if (state.contract && !state.quote.contracts.some(item => item.contract === state.contract)) state.contract = null;
      if (state.bgiMode === 'auto') { applyQuote(); render(true); }
      state.lastFetch = Date.now();
    } catch (_) {
      state.failed = true;
    } finally {
      state.fetching = false;
      renderQuote();
    }
  }

  function init() {
    const saved = core.restore(readStorage(STORAGE_KEY));
    state.quote = core.validateQuote(parseJSON(readStorage(QUOTE_KEY)), new Date());
    const inputs = saved ? saved.inputs : core.DEFAULTS;
    for (const name of names) fields[name].value = inputs[name];
    if (saved) { state.bgiMode = saved.bgiMode; state.contract = saved.contract; }
    if (state.contract && state.quote && !state.quote.contracts.some(item => item.contract === state.contract)) state.contract = null;
    if (state.bgiMode === 'auto' && state.quote) applyQuote();
    else if (state.bgiMode === 'manual' && followsQuote()) state.bgiMode = 'auto';
    const ajuste = core.parseDecimal(fields.ajuste.value);
    if (ajuste !== null && ajuste !== 0) el('adjust-details').open = true;
    render(false);
    renderQuote();
    fetchQuote();
  }

  for (const name of names) {
    fields[name].addEventListener('input', function () {
      if (name === 'bgi') updateMode();
      render(true);
      if (name === 'bgi') renderQuote();
    });
    fields[name].addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); fields[name].blur(); }
    });
  }
  document.addEventListener('click', function (event) {
    const stepButton = event.target.closest('.step');
    if (stepButton) {
      const name = stepButton.dataset.step;
      const next = core.step(name, fields[name].value, Number(stepButton.dataset.dir));
      if (next === null) { fields[name].focus(); return; }
      fields[name].value = next;
      if (name === 'bgi') updateMode();
      render(true);
      if (name === 'bgi') renderQuote();
      return;
    }
    const chip = event.target.closest('.chip');
    if (chip && state.quote) {
      state.contract = chip.dataset.contract;
      applyQuote();
      render(true);
      renderQuote();
    }
  });
  el('use-quote').addEventListener('click', function () { applyQuote(); render(true); renderQuote(); });
  el('refresh').addEventListener('click', function () { fetchQuote(); });
  el('toggle-sign').addEventListener('click', function () {
    const raw = fields.ajuste.value.trim();
    if (raw === '') fields.ajuste.value = '-0';
    else if (core.parseDecimal(raw) !== null) fields.ajuste.value = raw.startsWith('-') ? raw.slice(1) : '-' + raw.replace(/^\+/, '');
    else { fields.ajuste.focus(); return; }
    render(true);
    fields.ajuste.focus({ preventScroll: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Date.now() - state.lastFetch > REFRESH_INTERVAL) fetchQuote();
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(function () { /* o app funciona sem cache offline */ });
  }
  init();
})();
