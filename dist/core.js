(function (scope, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.BoiCalc = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const RENDIMENTOS = Object.freeze([50, 52, 55]);
  const RENDIMENTO_PRINCIPAL = 52;
  const KG_POR_ARROBA = 15;
  // Sem valor de exemplo: a arroba vem da cotação publicada ou é digitada.
  const DEFAULTS = Object.freeze({ bgi: '', ajuste: '0', oferta: '' });
  const STEPS = Object.freeze({ bgi: 1, ajuste: 1, oferta: 0.1 });
  const RANGES = Object.freeze({ bgi: [0, 100000], ajuste: [-50, 50], oferta: [0, 100000] });
  const TRIM_ZEROS = Object.freeze({ bgi: false, ajuste: true, oferta: false });
  const NAMES = Object.freeze(['bgi', 'ajuste', 'oferta']);
  const CONTRACT_CODE = /^BGI[FGHJKMNQUVXZ]\d{2}$/;

  function parseDecimal(raw) {
    if (typeof raw !== 'string') return null;
    const text = raw.trim();
    if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return null;
    const value = Number(text.replace(',', '.'));
    return Number.isFinite(value) ? value : null;
  }

  function formatDecimal(value, name) {
    if (!Number.isFinite(value)) return '';
    let text = value.toFixed(2).replace('.', ',');
    if (TRIM_ZEROS[name]) text = text.replace(/,?0+$/, '');
    return text === '-0' ? '0' : text;
  }

  function step(name, raw, direction) {
    if (!STEPS[name] || (direction !== 1 && direction !== -1)) return null;
    const text = typeof raw === 'string' ? raw.trim() : '';
    const current = text === '' || text === '-' || text === '+' ? 0 : parseDecimal(text);
    if (current === null) return null;
    const next = Math.round((current + direction * STEPS[name]) * 100) / 100;
    const range = RANGES[name];
    return formatDecimal(Math.min(range[1], Math.max(range[0], next)), name);
  }

  function isEmpty(raw, key) {
    return !raw || typeof raw[key] !== 'string' || raw[key].trim() === '';
  }

  function validate(raw) {
    const values = {};
    const errors = {};
    for (const key of NAMES) values[key] = parseDecimal(raw && raw[key]);
    const emptyBgi = isEmpty(raw, 'bgi');
    if (emptyBgi) errors.bgi = 'Informe a arroba ou aguarde a cotação.';
    else if (values.bgi === null || values.bgi <= 0) errors.bgi = 'Informe uma arroba maior que zero.';
    if (values.ajuste === null || values.ajuste < -50 || values.ajuste > 50) errors.ajuste = 'Informe um ajuste de −50 a +50.';
    if (isEmpty(raw, 'oferta')) values.oferta = null;
    else if (values.oferta === null || values.oferta < 0) errors.oferta = 'Informe uma oferta a partir de zero.';
    return { ok: Object.keys(errors).length === 0, values, errors, emptyBgi };
  }

  function calculate(values) {
    const bgi = values ? values.bgi : NaN;
    const ajuste = values ? values.ajuste : NaN;
    const oferta = values && values.oferta !== undefined ? values.oferta : null;
    const hasOferta = oferta !== null;
    if (!Number.isFinite(bgi) || bgi <= 0 || !Number.isFinite(ajuste) || ajuste < -50 || ajuste > 50 ||
        (hasOferta && (!Number.isFinite(oferta) || oferta < 0))) {
      throw new RangeError('Valores inválidos para a conta.');
    }
    return RENDIMENTOS.map(rendimento => {
      const equivalente = bgi * (rendimento / (100 * KG_POR_ARROBA)) * (1 + ajuste / 100);
      const diferenca = hasOferta ? oferta / equivalente - 1 : null;
      if (!Number.isFinite(equivalente) || equivalente <= 0 || (hasOferta && !Number.isFinite(diferenca))) {
        throw new RangeError('Os valores informados excedem o limite da conta.');
      }
      return { rendimento, equivalente, diferenca, principal: rendimento === RENDIMENTO_PRINCIPAL };
    });
  }

  function todayInSaoPaulo(now) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now || new Date());
    const part = type => parts.find(p => p.type === type).value;
    return part('year') + '-' + part('month') + '-' + part('day');
  }

  function text(value, max) {
    return typeof value === 'string' && value.trim() !== '' && value.length <= max ? value : null;
  }

  function positive(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100000 ? value : null;
  }

  // Aceita somente um arquivo de cotação completo e coerente; qualquer dúvida devolve null.
  function validateQuote(data, now) {
    try {
      if (!data || typeof data !== 'object') return null;
      const source = text(data.source, 100);
      const sourceUrl = text(data.sourceUrl, 500);
      if (!source || !sourceUrl || !/^https:\/\//.test(sourceUrl)) return null;
      const tradeDate = text(data.tradeDate, 10);
      if (!tradeDate || !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) return null;
      const parsed = new Date(tradeDate + 'T12:00:00Z');
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== tradeDate) return null;
      if (tradeDate > todayInSaoPaulo(now)) return null;
      const fetchedAt = text(data.fetchedAt, 40);
      if (!fetchedAt || !Number.isFinite(Date.parse(fetchedAt))) return null;
      if (!Array.isArray(data.contracts) || data.contracts.length < 1 || data.contracts.length > 24) return null;
      const contracts = [];
      const seen = new Set();
      for (const item of data.contracts) {
        if (!item || typeof item !== 'object') return null;
        const contract = text(item.contract, 12);
        const contractLabel = text(item.contractLabel, 40);
        const price = positive(item.price);
        const expiryYear = Number.isInteger(item.expiryYear) && item.expiryYear >= 2000 && item.expiryYear <= 2099 ? item.expiryYear : null;
        const expiryMonth = Number.isInteger(item.expiryMonth) && item.expiryMonth >= 1 && item.expiryMonth <= 12 ? item.expiryMonth : null;
        if (!contract || !CONTRACT_CODE.test(contract) || !contractLabel || !price || !expiryYear || !expiryMonth || seen.has(contract)) return null;
        seen.add(contract);
        const changePercent = typeof item.changePercent === 'number' && Number.isFinite(item.changePercent) ? item.changePercent : null;
        contracts.push({ contract, contractLabel, price, expiryYear, expiryMonth, changePercent });
      }
      const price = positive(data.price);
      const contract = text(data.contract, 12);
      const first = contracts.find(item => item.contract === contract);
      if (!price || !first || first.price !== price) return null;
      return {
        source,
        sourceUrl,
        upstream: text(data.upstream, 40) || 'B3',
        priceType: text(data.priceType, 60) || 'Fechamento',
        tradeDate,
        fetchedAt,
        contract,
        contractLabel: first.contractLabel,
        price,
        contracts
      };
    } catch (_) {
      return null;
    }
  }

  function restore(rawJSON) {
    try {
      const stored = JSON.parse(rawJSON);
      if (!stored || typeof stored !== 'object' || !stored.inputs || typeof stored.inputs !== 'object') return null;
      if (stored.version !== 1 && stored.version !== 2) return null;
      const inputs = {};
      for (const key of NAMES) {
        const value = stored.inputs[key];
        inputs[key] = typeof value === 'string' && value.length <= 80 && (value.trim() === '' || parseDecimal(value) !== null) ? value : DEFAULTS[key];
      }
      if (stored.version === 1) inputs.bgi = ''; // a versão antiga guardava um valor de exemplo
      if (inputs.ajuste.trim() === '') inputs.ajuste = '0';
      const bgiMode = stored.bgiMode === 'manual' ? 'manual' : 'auto';
      const contract = typeof stored.contract === 'string' && CONTRACT_CODE.test(stored.contract) ? stored.contract : null;
      return { inputs, bgiMode, contract };
    } catch (_) {
      return null;
    }
  }

  return Object.freeze({ RENDIMENTOS, RENDIMENTO_PRINCIPAL, KG_POR_ARROBA, DEFAULTS, STEPS, parseDecimal, formatDecimal, step, validate, calculate, validateQuote, restore, todayInSaoPaulo });
});
