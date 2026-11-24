'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculatePricing, PricingInputError } = require('../lib/pricing-engine');

test('commerce calculation separates cost, variable fees, planned margin and markup', () => {
  const result = calculatePricing({
    sector: 'comercio',
    costs: { custoAquisicao: 100, freteEntrada: 10, seguroDespesasAquisicao: 0, embalagem: 5, outrosVariaveis: 0, custosOperacionaisRateados: 5 },
    taxes: { impostosVenda: 6, taxaPagamento: 2, comissao: 1, taxaMarketplace: 1, margemDesejada: 20 }
  });
  assert.equal(result.custoTotal, 120);
  assert.equal(result.precoSugerido, 171.43);
  assert.equal(result.markup, 1.43);
  assert.equal(result.margemPlanejada, 20);
  assert.equal(result.percentualImpostosTaxas, 10);
  assert.equal(result.calculationVersion, 'server-v1');
  assert.equal(result.categoriasCusto.reduce((sum, item) => sum + item.valor, 0), 120);
});

test('industry calculation distributes batch costs and normal production losses per unit', () => {
  const result = calculatePricing({
    sector: 'industria',
    costs: { quantidadeLote: 10, materiaPrima: 100, insumos: 20, embalagemProducao: 0, maoObraDireta: 40, cifRateado: 10, energiaTransformacao: 10, perdasProducao: 10 },
    taxes: { impostosVenda: 10, margemDesejada: 20 }
  });
  assert.equal(result.custoTotal, 19.2);
  assert.equal(result.precoSugerido, 27.43);
  assert.equal(result.margemPlanejada, 20);
});

test('service calculation uses productive hours and direct service costs', () => {
  const result = calculatePricing({
    sector: 'servico',
    costs: { tempoExecucao: 2, custoHoraProdutiva: 50, maoObraContratada: 0, deslocamento: 10, materiaisUtilizados: 10, ferramentasLicencas: 0, outrosEspecificos: 0 },
    taxes: { impostosVenda: 10, taxaPagamento: 0, comissao: 0, taxaMarketplace: 0, margemDesejada: 20 }
  });
  assert.equal(result.custoTotal, 120);
  assert.equal(result.precoSugerido, 171.43);
});

test('calculation refuses missing essential costs and missing desired margin', () => {
  assert.throws(() => calculatePricing({
    sector: 'comercio',
    costs: { custoAquisicao: 0 },
    taxes: { margemDesejada: 20 }
  }), error => error instanceof PricingInputError && error.code === 'REQUIRED_POSITIVE_COST');

  assert.throws(() => calculatePricing({
    sector: 'servico',
    costs: { tempoExecucao: 1, custoHoraProdutiva: 50 },
    taxes: {}
  }), error => error instanceof PricingInputError && error.code === 'REQUIRED_PRICING_INPUT');
});

test('calculation rejects nonviable percentages, invalid batch quantity and negative costs', () => {
  assert.throws(() => calculatePricing({
    sector: 'comercio',
    costs: { custoAquisicao: 10 },
    taxes: { impostosVenda: 80, margemDesejada: 20 }
  }), error => error instanceof PricingInputError && error.code === 'NON_VIABLE_PERCENTAGES');

  assert.throws(() => calculatePricing({
    sector: 'industria',
    costs: { quantidadeLote: 1.5, materiaPrima: 10 },
    taxes: { margemDesejada: 20 }
  }), error => error instanceof PricingInputError && error.code === 'INVALID_BATCH_QUANTITY');

  assert.throws(() => calculatePricing({
    sector: 'comercio',
    costs: { custoAquisicao: 10, embalagem: -1 },
    taxes: { margemDesejada: 20 }
  }), error => error instanceof PricingInputError && error.code === 'INVALID_PRICING_RANGE');
});
