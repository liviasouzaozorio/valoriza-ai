'use strict';

class PricingInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PricingInputError';
    this.code = code;
  }
}

function numberField(source, key, { required = false, defaultValue = 0, min = 0, maxExclusive = 100 } = {}) {
  const raw = source?.[key];
  if (raw === undefined || raw === null || raw === '') {
    if (required) throw new PricingInputError('REQUIRED_PRICING_INPUT', `Informe o campo ${key} para calcular a precificação.`);
    return defaultValue;
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new PricingInputError('INVALID_PRICING_NUMBER', `O campo ${key} precisa ser um número válido.`);
  }
  if (raw < min || (maxExclusive !== null && raw >= maxExclusive)) {
    throw new PricingInputError('INVALID_PRICING_RANGE', `O campo ${key} está fora do intervalo permitido.`);
  }
  return raw;
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculatePricing({ sector, costs, taxes }) {
  if (!['comercio', 'industria', 'servico', 'servicos'].includes(sector)) {
    throw new PricingInputError('INVALID_PRICING_SECTOR', 'Informe um segmento válido para a precificação.');
  }
  if (!costs || typeof costs !== 'object' || Array.isArray(costs) ||
      !taxes || typeof taxes !== 'object' || Array.isArray(taxes)) {
    throw new PricingInputError('INVALID_PRICING_INPUT', 'Custos e percentuais da precificação são obrigatórios.');
  }

  const categories = [];
  let totalCost = 0;
  let normalizedSector = sector === 'servicos' ? 'servico' : sector;

  if (normalizedSector === 'comercio') {
    const acquisition = numberField(costs, 'custoAquisicao', { required: true, maxExclusive: null });
    if (acquisition <= 0) throw new PricingInputError('REQUIRED_POSITIVE_COST', 'O custo de aquisição precisa ser maior que zero.');
    const freight = numberField(costs, 'freteEntrada', { maxExclusive: null });
    const insurance = numberField(costs, 'seguroDespesasAquisicao', { maxExclusive: null });
    const packaging = numberField(costs, 'embalagem', { maxExclusive: null });
    const otherVariable = numberField(costs, 'outrosVariaveis', { maxExclusive: null });
    const allocated = numberField(costs, 'custosOperacionaisRateados', { maxExclusive: null });
    const acquisitionTotal = acquisition + freight + insurance;
    const variableTotal = packaging + otherVariable;
    totalCost = acquisitionTotal + variableTotal + allocated;
    if (acquisitionTotal > 0) categories.push({ nome: 'Aquisição e logística', valor: money(acquisitionTotal) });
    if (variableTotal > 0) categories.push({ nome: 'Embalagem e variáveis', valor: money(variableTotal) });
    if (allocated > 0) categories.push({ nome: 'Rateio operacional', valor: money(allocated) });
  } else if (normalizedSector === 'industria') {
    const batchQuantity = numberField(costs, 'quantidadeLote', { required: true, maxExclusive: null });
    if (!Number.isInteger(batchQuantity) || batchQuantity <= 0) {
      throw new PricingInputError('INVALID_BATCH_QUANTITY', 'A quantidade produzida no lote deve ser um número inteiro maior que zero.');
    }
    const rawMaterial = numberField(costs, 'materiaPrima', { required: true, maxExclusive: null });
    if (rawMaterial <= 0) throw new PricingInputError('REQUIRED_POSITIVE_COST', 'O custo de matéria-prima precisa ser maior que zero.');
    const inputs = numberField(costs, 'insumos', { maxExclusive: null });
    const packaging = numberField(costs, 'embalagemProducao', { maxExclusive: null });
    const labor = numberField(costs, 'maoObraDireta', { maxExclusive: null });
    const overhead = numberField(costs, 'cifRateado', { maxExclusive: null });
    const energy = numberField(costs, 'energiaTransformacao', { maxExclusive: null });
    const losses = numberField(costs, 'perdasProducao', { maxExclusive: 100 });
    const goodUnits = batchQuantity * (1 - losses / 100);
    if (!Number.isFinite(goodUnits) || goodUnits <= 0) {
      throw new PricingInputError('INVALID_GOOD_UNITS', 'As perdas informadas não deixam unidades boas suficientes para distribuir o custo do lote.');
    }
    const materialsPerUnit = (rawMaterial + inputs + packaging) / goodUnits;
    const laborPerUnit = labor / goodUnits;
    const conversionPerUnit = (overhead + energy) / goodUnits;
    totalCost = materialsPerUnit + laborPerUnit + conversionPerUnit;
    if (materialsPerUnit > 0) categories.push({ nome: 'Matéria-prima e insumos por unidade boa', valor: money(materialsPerUnit) });
    if (laborPerUnit > 0) categories.push({ nome: 'Mão de obra direta', valor: money(laborPerUnit) });
    if (conversionPerUnit > 0) categories.push({ nome: 'Transformação e CIF rateado', valor: money(conversionPerUnit) });
  } else {
    const hours = numberField(costs, 'tempoExecucao', { required: true, maxExclusive: null });
    if (hours <= 0) throw new PricingInputError('REQUIRED_POSITIVE_COST', 'O tempo de execução precisa ser maior que zero.');
    const hourlyCost = numberField(costs, 'custoHoraProdutiva', { required: true, maxExclusive: null });
    if (hourlyCost <= 0) throw new PricingInputError('REQUIRED_POSITIVE_COST', 'O custo da hora produtiva precisa ser maior que zero.');
    const contractedLabor = numberField(costs, 'maoObraContratada', { maxExclusive: null });
    const travel = numberField(costs, 'deslocamento', { maxExclusive: null });
    const materials = numberField(costs, 'materiaisUtilizados', { maxExclusive: null });
    const tools = numberField(costs, 'ferramentasLicencas', { maxExclusive: null });
    const other = numberField(costs, 'outrosEspecificos', { maxExclusive: null });
    const technical = hours * hourlyCost + contractedLabor;
    const direct = travel + materials;
    const structure = tools + other;
    totalCost = technical + direct + structure;
    if (technical > 0) categories.push({ nome: 'Tempo técnico e execução', valor: money(technical) });
    if (direct > 0) categories.push({ nome: 'Deslocamento e materiais', valor: money(direct) });
    if (structure > 0) categories.push({ nome: 'Ferramentas e despesas específicas', valor: money(structure) });
  }

  if (!Number.isFinite(totalCost) || totalCost <= 0) {
    throw new PricingInputError('INVALID_TOTAL_COST', 'O custo total calculado precisa ser maior que zero.');
  }

  const tax = numberField(taxes, 'impostosVenda');
  const paymentFee = numberField(taxes, 'taxaPagamento');
  const commission = numberField(taxes, 'comissao');
  const marketplaceFee = numberField(taxes, 'taxaMarketplace');
  const desiredMargin = numberField(taxes, 'margemDesejada', { required: true });
  const variablePercent = tax + paymentFee + commission + marketplaceFee;
  const totalPercent = variablePercent + desiredMargin;
  if (totalPercent >= 100) {
    throw new PricingInputError('NON_VIABLE_PERCENTAGES', 'A soma de impostos, taxas e margem precisa ser menor que 100%.');
  }

  const price = totalCost / (1 - totalPercent / 100);
  if (!Number.isFinite(price) || price <= 0) {
    throw new PricingInputError('NON_VIABLE_PRICE', 'Não foi possível calcular um preço viável com os percentuais informados.');
  }
  const roundedCost = money(totalCost);
  const roundedPrice = money(price);
  const variableAmount = money(roundedPrice * variablePercent / 100);
  const plannedProfit = money(roundedPrice - roundedCost - variableAmount);

  return {
    sector: normalizedSector,
    custoTotal: roundedCost,
    precoSugerido: roundedPrice,
    markup: money(roundedPrice / roundedCost),
    margemPlanejada: money(desiredMargin),
    percentualImpostosTaxas: money(variablePercent),
    valorImpostosTaxas: variableAmount,
    lucroEstimado: plannedProfit,
    categoriasCusto: categories,
    calculationVersion: 'server-v1'
  };
}

module.exports = { calculatePricing, PricingInputError };
