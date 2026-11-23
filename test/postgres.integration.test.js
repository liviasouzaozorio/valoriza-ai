'use strict';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { X509Certificate } = require('node:crypto');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve());
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await app.pool.end();
});

test('TLS do PostgreSQL valida o certificado CA', () => {
  const ssl = app.pool.options.ssl;
  assert.notEqual(ssl, false);
  assert.equal(ssl.rejectUnauthorized, true);
  assert.ok(ssl.ca);
  const ca = new X509Certificate(ssl.ca);
  assert.equal(ca.ca, true);
  assert.ok(Date.parse(ca.validTo) > Date.now());
});

test('autenticação PostgreSQL e schema/constraints (somente leitura)', async () => {
  const auth = await app.pool.query('SELECT current_database() AS database, current_user AS db_user');
  assert.equal(auth.rows[0].database, 'postgres');
  assert.ok(auth.rows[0].db_user);

  const columns = await app.pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[])", [['businesses', 'products', 'precificacoes', 'nilo_conversations', 'nilo_messages']]);
  const found = new Set(columns.rows.map((row) => `${row.table_name}.${row.column_name}`));
  for (const name of ['businesses.owner_user_id', 'products.business_id', 'products.item_type', 'products.sector', 'products.status', 'precificacoes.business_id', 'nilo_conversations.business_id', 'nilo_conversations.updated_at', 'nilo_messages.conversation_id', 'nilo_messages.precificacao_id', 'nilo_messages.role', 'nilo_messages.content']) assert.ok(found.has(name), `coluna ausente: ${name}`);

  const checks = await app.pool.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND contype = 'c'");
  const definitions = checks.rows.map((row) => row.definition).join(' ');
  for (const value of ['produto', 'servico', 'comercio', 'industria', 'servicos', 'active', 'archived']) assert.ok(definitions.includes(value), `constraint products sem ${value}`);
});

test('GET /api/health confirma a conexão real sem expor configuração', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body, { success: true, data: { status: 'ok' } });
});
