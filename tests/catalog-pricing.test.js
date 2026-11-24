'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.SUPABASE_URL = 'https://unit-test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-publishable-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';

const app = require('../server');
let server;
let baseUrl;
const originalFetch = global.fetch;
const originalQuery = app.pool.query;
const userId = '00000000-0000-4000-8000-000000000001';
const businessId = '00000000-0000-4000-8000-000000000002';
const productId = '00000000-0000-4000-8000-000000000003';

before(async () => {
  global.fetch = async (_url, options = {}) => {
    if (options.headers?.Authorization !== 'Bearer valid-test-token') {
      return { ok: false, status: 401, json: async () => ({}) };
    }
    return { ok: true, json: async () => ({ id: userId, user_metadata: {} }) };
  };
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  global.fetch = originalFetch;
  app.pool.query = originalQuery;
  await new Promise(resolve => server.close(resolve));
  await app.pool.end();
});

function request(path, { method = 'GET', token = 'valid-test-token', body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(new URL(path, baseUrl), {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {})
      }
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('GET products requires a valid session and filters by the authenticated business', async () => {
  let calls = 0;
  app.pool.query = async (sql, params) => {
    calls += 1;
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    assert.match(sql, /WHERE business_id = \$1/);
    assert.deepEqual(params, [businessId]);
    return { rows: [{ id: productId, name: 'Item' }] };
  };
  const denied = await request('/api/products', { token: 'invalid' });
  assert.equal(denied.status, 401);
  assert.equal(calls, 0);
  const response = await request('/api/products');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.products[0].id, productId);
  assert.equal(calls, 2);
});

test('POST product derives business ownership from the session, never from client payload', async () => {
  const seen = [];
  app.pool.query = async (sql, params) => {
    seen.push({ sql, params });
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    return { rows: [{ id: productId, business_id: businessId, name: 'Bolo', additional_data: { subtype: 'Produzido' } }] };
  };
  const response = await request('/api/products', {
    method: 'POST',
    body: {
      business_id: '00000000-0000-4000-8000-000000000099',
      name: 'Bolo',
      item_type: 'produto',
      sector: 'industria',
      unit: 'Unidade',
      status: 'active',
      additional_data: { subtype: 'Produzido' }
    }
  });
  assert.equal(response.status, 400);
  assert.equal(seen.length, 0);
});

test('POST product persists an allowlisted item under the authenticated business', async () => {
  let insert;
  app.pool.query = async (sql, params) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    insert = { sql, params };
    return { rows: [{ id: productId, business_id: businessId, name: 'Bolo' }] };
  };
  const response = await request('/api/products', {
    method: 'POST',
    body: {
      name: 'Bolo',
      item_type: 'produto',
      sector: 'industria',
      unit: 'Unidade',
      status: 'active',
      additional_data: { subtype: 'Produzido' }
    }
  });
  assert.equal(response.status, 201);
  assert.ok(insert.sql.includes('INSERT INTO public.products'));
  assert.equal(insert.params[0], businessId);
  assert.equal(insert.params.at(-1), JSON.stringify({ subtype: 'Produzido' }));
});


test('PATCH product uses parameter placeholders for values and JSON metadata', async () => {
  let seen;
  app.pool.query = async (sql, params) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    seen = { sql, params };
    return { rows: [{ id: productId, name: 'Bolo atualizado' }] };
  };
  const response = await request(`/api/products/${productId}`, {
    method: 'PATCH',
    body: { name: 'Bolo atualizado', additional_data: { subtype: 'Artesanal' } }
  });
  assert.equal(response.status, 200);
  assert.match(seen.sql, /name = \$1/);
  assert.match(seen.sql, /additional_data = \$2::jsonb/);
  assert.match(seen.sql, /WHERE id = \$3 AND business_id = \$4/);
  assert.deepEqual(seen.params, ['Bolo atualizado', JSON.stringify({ subtype: 'Artesanal' }), productId, businessId]);
});

test('PATCH product scopes updates by both item and authenticated business', async () => {
  let seen;
  app.pool.query = async (sql, params) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    seen = { sql, params };
    return { rows: [{ id: productId, name: 'Bolo atualizado' }] };
  };
  const response = await request(`/api/products/${productId}`, {
    method: 'PATCH', body: { name: 'Bolo atualizado' }
  });
  assert.equal(response.status, 200);
  assert.match(seen.sql, /WHERE id = \d+ AND business_id = \d+/);
  assert.deepEqual(seen.params, ['Bolo atualizado', productId, businessId]);
});

test('GET pricing history never includes legacy rows without the authenticated business', async () => {
  let seen;
  app.pool.query = async (sql, params) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    seen = { sql, params };
    return { rows: [] };
  };
  const response = await request('/api/pricings');
  assert.equal(response.status, 200);
  assert.match(seen.sql, /WHERE p\.business_id=\$1/);
  assert.deepEqual(seen.params, [businessId]);
});

test('POST pricing rejects invalid types and requires structured snapshots', async () => {
  let calls = 0;
  app.pool.query = async () => { calls += 1; return { rows: [{ id: businessId }] }; };
  const response = await request('/api/pricings', {
    method: 'POST',
    body: { pricing_type: 'draft', input_snapshot: {}, result_snapshot: {} }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRICING_TYPE');
  assert.equal(calls, 1);
});

test('POST pricing verifies product ownership before inserting a version', async () => {
  const seen = [];
  app.pool.query = async (sql, params) => {
    seen.push({ sql, params });
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    if (sql.includes('SELECT id FROM public.products')) return { rows: [] };
    throw new Error('Pricing must not be inserted for another business product');
  };
  const response = await request('/api/pricings', {
    method: 'POST',
    body: {
      product_id: productId,
      pricing_type: 'full',
      input_snapshot: { costs: {} },
      result_snapshot: { price: 12 }
    }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'PRODUCT_NOT_OWNED');
  assert.equal(seen.length, 2);
});

test('Nilo rejects unauthenticated requests before any database operation', async () => {
  let calls = 0;
  app.pool.query = async () => { calls += 1; return { rows: [] }; };
  const response = await request('/perguntar', {
    method: 'POST',
    token: 'invalid',
    body: { pergunta: 'Como organizar meu negócio?' }
  });
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test('POST pricing persists a version under the authenticated business and owned product', async () => {
  const calls = [];
  const saved = {
    id: 42,
    business_id: businessId,
    product_id: productId,
    pricing_type: 'full',
    custo_total: 18.5,
    preco_sugerido: 24.67,
    markup: 1.33,
    margem_lucro: 25,
    data_criacao: '2026-11-24T03:00:00.000Z'
  };
  app.pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    if (sql.includes('SELECT id FROM public.products')) return { rows: [{ id: productId }] };
    if (sql.includes('INSERT INTO public.precificacoes')) return { rows: [saved] };
    throw new Error('Unexpected SQL query');
  };
  const response = await request('/api/pricings', {
    method: 'POST',
    body: {
      business_id: '00000000-0000-4000-8000-000000000099',
      product_id: productId,
      pricing_type: 'full',
      custo_total: 18.5,
      preco_sugerido: 32,
      margem_lucro: 25,
      setor: 'comercio',
      input_snapshot: {
        sector: 'comercio',
        costs: { custoAquisicao: 18.5, freteEntrada: 0, seguroDespesasAquisicao: 0, embalagem: 0, outrosVariaveis: 0, custosOperacionaisRateados: 0 },
        taxes: { impostosVenda: 0, taxaPagamento: 0, comissao: 0, taxaMarketplace: 0, margemDesejada: 25 }
      },
      result_snapshot: { price: 32 },
      calculation_version: 'test-v1'
    }
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.pricing.business_id, businessId);
  assert.equal(response.body.data.pricing.id, 42);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].params, [userId]);
  assert.deepEqual(calls[1].params, [productId, businessId]);
  assert.equal(calls[2].params[0], businessId);
  assert.equal(calls[2].params[1], productId);
  // O preço enviado pelo navegador (R$ 32,00) é ignorado: o servidor recalcula R$ 24,67.
  assert.equal(calls[2].params[10], 18.5);
  assert.equal(calls[2].params[11], 24.67);
  assert.equal(calls[2].params[12], 1.33);
  assert.equal(calls[2].params[13], 25);
  assert.equal(calls[2].params[9], null, 'margem efetiva não é preenchida sem dados de vendas');
  const persistedSnapshot = JSON.parse(calls[2].params[17]);
  assert.equal(persistedSnapshot.server_calculation.calculationVersion, 'server-v1');
});

test('POST pricing rejects non-finite numeric values before inserting', async () => {
  let insertAttempted = false;
  app.pool.query = async (sql) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    if (sql.includes('INSERT INTO public.precificacoes')) insertAttempted = true;
    return { rows: [] };
  };
  const response = await request('/api/pricings', {
    method: 'POST',
    body: {
      pricing_type: 'quick',
      custo_total: '18.50',
      input_snapshot: {},
      result_snapshot: {}
    }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRICING_NUMBER');
  assert.equal(insertAttempted, false);
});

test('POST pricing rejects negative costs and zero quantity', async () => {
  let insertAttempted = false;
  app.pool.query = async (sql) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    if (sql.includes('INSERT INTO public.precificacoes')) insertAttempted = true;
    return { rows: [] };
  };
  const response = await request('/api/pricings', {
    method: 'POST',
    body: {
      pricing_type: 'full',
      direct_cost: -1,
      quantity: 1,
      input_snapshot: {},
      result_snapshot: {}
    }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRICING_RANGE');
  assert.equal(insertAttempted, false);
});

test('POST pricing rejects margin and tax percentages outside the valid range', async () => {
  let insertAttempted = false;
  app.pool.query = async (sql) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    if (sql.includes('INSERT INTO public.precificacoes')) insertAttempted = true;
    return { rows: [] };
  };
  const response = await request('/api/pricings', {
    method: 'POST',
    body: {
      pricing_type: 'full',
      margem_lucro: 100,
      impostos: 10,
      input_snapshot: {},
      result_snapshot: {}
    }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRICING_PERCENTAGE');
  assert.equal(insertAttempted, false);
});

test('POST pricing rejects unknown business sectors', async () => {
  let insertAttempted = false;
  app.pool.query = async (sql) => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    if (sql.includes('INSERT INTO public.precificacoes')) insertAttempted = true;
    return { rows: [] };
  };
  const response = await request('/api/pricings', {
    method: 'POST',
    body: {
      pricing_type: 'quick',
      setor: 'unknown',
      input_snapshot: {},
      result_snapshot: {}
    }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRICING_SECTOR');
  assert.equal(insertAttempted, false);
});

test('POST pricing calculate requires authentication and returns a server result', async () => {
  app.pool.query = async sql => {
    if (sql.includes('SELECT id FROM public.businesses')) return { rows: [{ id: businessId }] };
    throw new Error('Unexpected SQL query');
  };
  const denied = await request('/api/pricings/calculate', { method: 'POST', token: 'invalid', body: {} });
  assert.equal(denied.status, 401);
  const response = await request('/api/pricings/calculate', {
    method: 'POST',
    body: {
      sector: 'comercio',
      costs: { custoAquisicao: 18.5 },
      taxes: { margemDesejada: 25 }
    }
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.result.custoTotal, 18.5);
  assert.equal(response.body.data.result.precoSugerido, 24.67);
  assert.equal(response.body.data.result.calculationVersion, 'server-v1');
});
