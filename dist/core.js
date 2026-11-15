(function (scope, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.BoiCalc = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const RENDIMENTOS = Object.freeze([50, 52, 55]);
  const DEFAULTS = Object.freeze({ bgi: '398', ajuste: '0', oferta: '15' });

  function parseDecimal(raw) {
    if (typeof raw !== 'string') return null;
    const text = raw.trim();
    if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return null;
    const value = Number(text.replace(',', '.'));
    return Number.isFinite(value) ? value : null;
  }

  function validate(raw) {
    const values = {};
    const errors = {};
    for (const key of ['bgi', 'ajuste', 'oferta']) {
      values[key] = parseDecimal(raw && raw[key]);
    }
    if (values.bgi === null || values.bgi <= 0) errors.bgi = 'Informe um BGI maior que zero.';
    if (values.ajuste === null || values.ajuste < -50 || values.ajuste > 50) errors.ajuste = 'Informe um ajuste de −50 a +50.';
    if (values.oferta === null || values.oferta < 0) errors.oferta = 'Informe uma oferta a partir de zero.';
    return { ok: Object.keys(errors).length === 0, values, errors };
  }

  function calculate(values) {
    if (!values || !Number.isFinite(values.bgi) || values.bgi <= 0 ||
        !Number.isFinite(values.ajuste) || values.ajuste < -50 || values.ajuste > 50 ||
        !Number.isFinite(values.oferta) || values.oferta < 0) {
      throw new RangeError('Valores inválidos para a comparação.');
    }
    return RENDIMENTOS.map(rendimento => {
      const equivalente = values.bgi * (rendimento / 1500) * (1 + values.ajuste / 100);
      const diferenca = values.oferta / equivalente - 1;
      if (!Number.isFinite(equivalente) || equivalente <= 0 || !Number.isFinite(diferenca)) {
        throw new RangeError('Os valores informados excedem o limite da comparação.');
      }
      return { rendimento, equivalente, diferenca };
    });
  }

  function restore(rawJSON) {
    try {
      const stored = JSON.parse(rawJSON);
      if (!stored || stored.version !== 1 || !stored.inputs || typeof stored.inputs !== 'object') return null;
      const inputs = {};
      for (const key of ['bgi', 'ajuste', 'oferta']) {
        if (typeof stored.inputs[key] !== 'string' || stored.inputs[key].length > 80) return null;
        inputs[key] = stored.inputs[key];
      }
      const checked = validate(inputs);
      if (!checked.ok) return null;
      calculate(checked.values);
      return inputs;
    } catch (_) {
      return null;
    }
  }

  return Object.freeze({ RENDIMENTOS, DEFAULTS, parseDecimal, validate, calculate, restore });
});
