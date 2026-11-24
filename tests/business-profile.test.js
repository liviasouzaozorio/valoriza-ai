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

before(async () => {
  global.fetch = async (url, options = {}) => {
    assert.equal(url, 'https://unit-test.supabase.co/auth/v1/user');
    if (options.headers?.Authorization !== 'Bearer valid-test-token') {
      return { ok: false, status: 401, json: async () => ({}) };
    }
    return {
      ok: true,
      json: async () => ({
        id: userId,
        user_metadata: { company_name: 'Negócio de teste', sector: 'servico' }
      })
    };
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

test('POST ensure cria negócio uma única vez e deriva proprietário do token', async () => {
  let querySeen;
  app.pool.query = async (sql, params) => {
    querySeen = { sql, params };
    return { rows: [{ id: 'business-1', name: 'Negócio de teste', sector: 'servicos' }] };
  };
  const response = await request('/api/business/ensure', { method: 'POST', body: { owner_user_id: 'outro-usuario' } });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.business.id, 'business-1');
  assert.deepEqual(querySeen.params, [userId, 'Negócio de teste', 'servicos']);
  assert.match(querySeen.sql, /ON CONFLICT \(owner_user_id\) DO NOTHING/);
});

test('POST ensure recupera negócio existente sem substituir o perfil', async () => {
  let calls = 0;
  app.pool.query = async (sql, params) => {
    calls += 1;
    if (sql.includes('INSERT INTO public.businesses')) {
      assert.deepEqual(params, [userId, 'Negócio de teste', 'servicos']);
      return { rows: [] };
    }
    assert.deepEqual(params, [userId]);
    return { rows: [{ id: 'business-existing', name: 'Nome já salvo', sector: 'industria' }] };
  };
  const response = await request('/api/business/ensure', { method: 'POST' });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.business.name, 'Nome já salvo');
  assert.equal(calls, 1);
});

test('GET recupera apenas o perfil associado ao usuário autenticado', async () => {
  let querySeen;
  app.pool.query = async (sql, params) => {
    querySeen = { sql, params };
    return { rows: [{
      id: 'business-1', name: 'Ateliê', sector: 'servicos',
      target_margin_percent: null, additional_data: { location_text: 'Guarulhos - SP' }
    }] };
  };
  const response = await request('/api/business/profile');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.business.target_margin_percent, null);
  assert.deepEqual(querySeen.params, [userId]);
  assert.match(querySeen.sql, /WHERE owner_user_id = \$1/);
});

test('PATCH atualiza parcialmente e mescla JSONB preservando propriedades omitidas', async () => {
  let querySeen;
  app.pool.query = async (sql, params) => {
    querySeen = { sql, params };
    return { rows: [{
      id: 'business-1', name: 'Ateliê atualizado', sector: 'comercio',
      target_margin_percent: 25,
      additional_data: { entrepreneur_name: 'Lia', tax_regime: 'MEI', location_text: 'Guarulhos - SP' }
    }] };
  };
  const response = await request('/api/business/profile', {
    method: 'PATCH',
    body: {
      name: 'Ateliê atualizado',
      target_margin_percent: 25,
      additional_data: { location_text: 'Guarulhos - SP' }
    }
  });
  assert.equal(response.status, 200);
  assert.ok(querySeen.sql.includes("additional_data = COALESCE(additional_data, '{}'::jsonb) || $3::jsonb"));
  assert.deepEqual(querySeen.params, ['Ateliê atualizado', 25, JSON.stringify({ location_text: 'Guarulhos - SP' }), userId]);
  assert.equal(response.body.data.business.additional_data.tax_regime, 'MEI');
});

test('PATCH rejeita meta inválida antes de consultar o banco', async () => {
  let queried = false;
  app.pool.query = async () => { queried = true; throw new Error('não deveria consultar'); };
  const response = await request('/api/business/profile', {
    method: 'PATCH',
    body: { target_margin_percent: 100 }
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_TARGET_MARGIN');
  assert.equal(queried, false);
});

test('bloqueia token inválido antes de consultar o banco', async () => {
  let queried = false;
  app.pool.query = async () => { queried = true; throw new Error('não deveria consultar'); };
  const response = await request('/api/business/profile', { token: 'invalid-token' });
  assert.equal(response.status, 401);
  assert.equal(queried, false);
});

test('Nilo exige autenticação antes de consultar conversas', async () => {
  let queried = false;
  app.pool.query = async () => { queried = true; throw new Error('não deveria consultar'); };
  const response = await request('/api/nilo/conversations/latest', { token: null });
  assert.equal(response.status, 401);
  assert.equal(queried, false);
});

test('Nilo recupera somente a conversa pertencente ao usuário autenticado', async () => {
  const conversationId = '00000000-0000-4000-8000-000000000099';
  const calls = [];
  app.pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM public.nilo_conversations')) {
      return { rows: [{ id: conversationId, business_id: null, title: 'Conversa geral' }] };
    }
    return { rows: [{ id: 'message-1', role: 'user', content: 'Olá', created_at: '2026-11-23T10:00:00Z' }] };
  };
  const response = await request(`/api/nilo/conversations/${conversationId}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.conversation.business_id, null);
  assert.equal(response.body.data.messages[0].content, 'Olá');
  assert.deepEqual(calls[0].params, [conversationId, userId]);
  assert.match(calls[0].sql, /owner_user_id = \$2/);
  assert.deepEqual(calls[1].params, [conversationId]);
});

test('Nilo retorna histórico vazio sem exigir cadastro de empresa', async () => {
  app.pool.query = async (sql, params) => {
    assert.match(sql, /WHERE owner_user_id = \$1/);
    assert.deepEqual(params, [userId]);
    return { rows: [] };
  };
  const response = await request('/api/nilo/conversations/latest');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.conversation, null);
  assert.deepEqual(response.body.data.messages, []);
});

test('POST Nilo rejeita sessão inválida antes de chamar o banco', async () => {
  let queried = false;
  app.pool.query = async () => { queried = true; throw new Error('não deveria consultar'); };
  const response = await request('/perguntar', {
    method: 'POST',
    token: 'invalid-token',
    body: { pergunta: 'Como calcular margem?' }
  });
  assert.equal(response.status, 401);
  assert.equal(queried, false);
});
