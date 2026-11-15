(function () {
  'use strict';
  const core = window.BoiCalc;
  const storageKey = 'gado:bgi-preco-vivo:v1';
  const form = document.getElementById('comparison-form');
  const names = ['bgi', 'ajuste', 'oferta'];
  const fields = Object.fromEntries(names.map(name => [name, document.getElementById(name)]));
  const message = document.getElementById('validation-message');
  const announcement = document.getElementById('result-announcement');
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let announcementTimer;

  function readInputs() {
    return Object.fromEntries(names.map(name => [name, fields[name].value]));
  }

  function savedInputs() {
    try { return core.restore(window.localStorage.getItem(storageKey)); }
    catch (_) { return null; }
  }

  function saveInputs(inputs) {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, inputs })); }
    catch (_) { /* O cálculo funciona mesmo sem armazenamento disponível. */ }
  }

  function announce(text) {
    window.clearTimeout(announcementTimer);
    announcementTimer = window.setTimeout(function () { announcement.textContent = text; }, 250);
  }

  function clearResults() {
    for (const rendimento of core.RENDIMENTOS) {
      document.getElementById('price-' + rendimento).textContent = '—';
      document.getElementById('difference-' + rendimento).textContent = 'Preencha os valores válidos.';
    }
    announce('Comparação indisponível. Revise os valores informados.');
  }

  function render(save) {
    const raw = readInputs();
    const checked = core.validate(raw);
    for (const name of names) {
      const fieldError = document.getElementById(name + '-error');
      const error = checked.errors[name];
      fields[name].setAttribute('aria-invalid', String(Boolean(error)));
      fieldError.textContent = error || '';
      fieldError.hidden = !error;
    }
    if (!checked.ok) {
      message.textContent = 'Revise os campos indicados para comparar.';
      message.hidden = false;
      clearResults();
      return;
    }
    let results;
    try { results = core.calculate(checked.values); }
    catch (_) {
      message.textContent = 'Os valores são grandes ou pequenos demais para comparar. Revise os números.';
      message.hidden = false;
      clearResults();
      return;
    }
    message.hidden = true;
    const summaries = [];
    for (const result of results) {
      const absoluteDifference = Math.abs(result.diferenca);
      const comparison = absoluteDifference === 0 ? 'Oferta no mesmo valor' : 'Oferta ' + percent.format(absoluteDifference) + (result.diferenca > 0 ? ' acima' : ' abaixo');
      document.getElementById('price-' + result.rendimento).textContent = money.format(result.equivalente);
      document.getElementById('difference-' + result.rendimento).textContent = comparison;
      summaries.push(result.rendimento + '% de rendimento: ' + money.format(result.equivalente) + ' por kg. ' + comparison + '.');
    }
    announce(summaries.join(' '));
    if (save) saveInputs(raw);
  }

  const initial = savedInputs() || core.DEFAULTS;
  for (const name of names) fields[name].value = initial[name];
  document.getElementById('toggle-sign').addEventListener('click', function () {
    const raw = fields.ajuste.value.trim();
    if (raw === '') fields.ajuste.value = '-0';
    else if (core.parseDecimal(raw) !== null) fields.ajuste.value = raw.startsWith('-') ? raw.slice(1) : '-' + raw.replace(/^\+/, '');
    else { fields.ajuste.focus(); return; }
    render(true);
    fields.ajuste.focus({ preventScroll: true });
  });
  form.addEventListener('submit', function (event) { event.preventDefault(); render(true); });
  for (const name of names) fields[name].addEventListener('input', function () { render(true); });
  render(false);
})();
