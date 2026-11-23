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

before(async () => {
  global.fetch = async (url, options = {}) => {
    assert.equal(url, 'https://unit-test.supabase.co/auth/v1/user');
    if (options.headers?.Authorization !== 'Bearer valid-test-token') {
      return { ok: false, status: 401, json: async () => ({}) };
    }
    return { ok: true, json: async () => ({ id: '00000000-0000-4000-8000-000000000001' }) };
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

test('GET carrega preferência vinculada ao usuário autenticado', async () => {
  let querySeen;
  app.pool.query = async (sql, params) => {
    querySeen = { sql, params };
    return { rows: [{ sidebar_collapsed: true }] };
  };
  const response = await request('/api/preferences/sidebar');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { collapsed: true });
  assert.deepEqual(querySeen.params, ['00000000-0000-4000-8000-000000000001']);
  assert.match(querySeen.sql, /WHERE user_id = \$1/);
});

test('PUT persiste a preferência e devolve o estado confirmado pelo banco', async () => {
  let querySeen;
  app.pool.query = async (sql, params) => {
    querySeen = { sql, params };
    return { rows: [{ sidebar_collapsed: false }] };
  };
  const response = await request('/api/preferences/sidebar', { method: 'PUT', body: { collapsed: false } });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { collapsed: false });
  assert.deepEqual(querySeen.params, ['00000000-0000-4000-8000-000000000001', false]);
  assert.match(querySeen.sql, /ON CONFLICT \(user_id\) DO UPDATE/);
});

test('bloqueia sessão inválida antes de consultar o banco', async () => {
  let queried = false;
  app.pool.query = async () => { queried = true; throw new Error('não deveria consultar'); };
  const response = await request('/api/preferences/sidebar', { token: 'invalid-token' });
  assert.equal(response.status, 401);
  assert.equal(queried, false);
});

test('rejeita payload sem booleano', async () => {
  let queried = false;
  app.pool.query = async () => { queried = true; return { rows: [] }; };
  const response = await request('/api/preferences/sidebar', { method: 'PUT', body: { collapsed: 'yes' } });
  assert.equal(response.status, 400);
  assert.equal(queried, false);
});
