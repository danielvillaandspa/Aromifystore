import assert from 'node:assert/strict';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { promotion } from '../assets/js/data/config.js';
import worker from './worker.js';

function fixture(context) {
  const sql = new DatabaseSync(':memory:');
  context.after(() => sql.close());
  const migrations = new URL('./migrations/', import.meta.url);
  for (const file of readdirSync(migrations).sort()) sql.exec(readFileSync(new URL(file, migrations), 'utf8'));
  const db = {
    prepare(query) {
      const statement = sql.prepare(query);
      return this.bound(statement, []);
    },
    bound(statement, params) {
      return {
        bind: (...values) => this.bound(statement, values),
        first: async () => statement.get(...params) ?? null,
        all: async () => ({ results: statement.all(...params) }),
        run: async () => statement.run(...params),
      };
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        for (const statement of statements) await statement.run();
        sql.exec('COMMIT');
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const ownerPassword = 'synthetic-strong-passphrase-for-test';
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(ownerPassword, salt, 100000, 32, 'sha256');
  const env = {
    DB: db,
    ALLOWED_ORIGINS: 'https://shoparomify.store',
    OWNER_USERNAME: 'sample-owner',
    OWNER_PASSWORD_HASH: `${salt.toString('base64url')}.${hash.toString('base64url')}`,
    SIGNING_KEY: randomBytes(32).toString('base64url'),
  };
  async function request(path, { method = 'GET', body, token, origin = 'https://shoparomify.store' } = {}) {
    const headers = { Origin: origin };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return worker.fetch(new Request(`https://api.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
  }
  async function login() {
    const response = await request('/admin/login', { method: 'POST', body: { username: env.OWNER_USERNAME, password: ownerPassword } });
    assert.equal(response.status, 200);
    const session = await response.json();
    assert.equal(session.role, 'owner');
    return session.token;
  }
  return { request, login, sql, env };
}

test('owner controls quotes, coupon minimum, prices and revocation', async context => {
  const { request, login } = fixture(context);
  let response = await request('/products');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://shoparomify.store');
  assert.deepEqual((await response.json()).prices, Object.fromEntries(promotion.items.map(item => [item.productId, item.price * 100])));

  const code = 'test-gifts';
  const coupon = { code, minQuantity: 3, percent: 15 };
  response = await request('/admin/coupons', { method: 'POST', body: coupon });
  assert.equal(response.status, 401);
  const token = await login();
  response = await request('/admin/coupons', { method: 'POST', body: coupon, token });
  assert.equal(response.status, 201);
  response = await request('/admin/coupons', { method: 'POST', body: coupon, token });
  assert.equal(response.status, 409);
  response = await request('/admin/products/p1', { method: 'PATCH', body: { price: 51025 }, token });
  assert.equal(response.status, 200);
  response = await request('/products');
  assert.equal((await response.json()).prices.p1, 51025);

  response = await request('/quote', { method: 'POST', body: { code, items: [{ id: 'p1', quantity: 2 }] } });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'minimum_quantity');
  const order = { code, items: [{ id: 'p1', quantity: 3, unitPrice: 1 }] };
  response = await request('/quote', { method: 'POST', body: order });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.deepEqual(result.items, [{ id: 'p1', quantity: 3, unitPrice: 51025, subtotal: 153075 }]);
  assert.equal(result.discount, 22961);
  assert.equal(result.total, 130114);
  assert.match(result.reference, /^AF-[A-Za-z0-9_-]{20}$/);
  assert.ok(!Object.hasOwn(result, 'code'));
  response = await request(`/admin/quotes/${result.reference}`, { token });
  assert.deepEqual((await response.json()).quote, { ...result, code: code.toUpperCase() });

  response = await request(`/admin/coupons/${code}`, { method: 'DELETE', token });
  assert.equal(response.status, 200);
  response = await request('/quote', { method: 'POST', body: order });
  assert.equal((await response.json()).error, 'invalid_code');
  response = await request(`/admin/quotes/${result.reference}`, { token });
  assert.equal((await response.json()).quote.total, result.total);
});

test('rejects wrong origins, tampered credentials and invalid quantities', async context => {
  const { request, login } = fixture(context);
  let response = await request('/products', { origin: 'https://other.test' });
  assert.equal(response.status, 403);
  assert.ok(!response.headers.has('Access-Control-Allow-Origin'));
  response = await request('/quote', { method: 'OPTIONS' });
  assert.equal(response.status, 204);
  response = await request('/admin/login', { method: 'POST', body: { username: 'sample-owner', password: 'bad-password' } });
  assert.equal(response.status, 401);
  const token = await login();
  const [expiry, username, nonce, signature] = token.split('.');
  const tampered = `${expiry}.${username}.${nonce}.${signature[0] === 'X' ? 'Y' : 'X'}${signature.slice(1)}`;
  response = await request('/admin/coupons', { token: tampered });
  assert.equal(response.status, 401);
  response = await request('/quote', { method: 'POST', body: { items: [{ id: 'p1', quantity: 0 }] } });
  assert.equal((await response.json()).error, 'invalid_quantity');
  response = await request('/quote', { method: 'POST', body: { items: [{ id: 'p1', quantity: 3 }, { id: 'p1', quantity: 2 }] } });
  assert.equal((await response.json()).error, 'invalid_items');
  response = await request('/quote', { method: 'POST', body: { items: [{ id: '__proto__', quantity: 3 }] } });
  assert.equal((await response.json()).error, 'invalid_items');
});

test('rate limits login and removes expired data', async context => {
  const { request, sql, env } = fixture(context);
  const bad = { username: 'sample-owner', password: 'bad-password' };
  for (let index = 0; index < 8; index++) {
    const response = await request('/admin/login', { method: 'POST', body: bad });
    assert.equal(response.status, 401);
  }
  const limited = await request('/admin/login', { method: 'POST', body: bad });
  assert.equal(limited.status, 429);
  sql.exec('UPDATE request_limits SET expires_at = 0');
  sql.exec("INSERT INTO quotes VALUES ('expired-test', 0, '{}')");
  await worker.scheduled({}, env);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM request_limits').get().count, 0);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM quotes').get().count, 0);
});

test('owner can create and disable staff while keeping coupon controls private', async context => {
  const { request, login, sql } = fixture(context);
  const token = await login();
  const staff = { username: 'Staff.1', password: 'synthetic-staff-test-password' };
  let response = await request('/admin/accounts', { method: 'POST', token, body: staff });
  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).account, { username: 'staff.1', active: true });
  const record = sql.prepare('SELECT verifier FROM admin_accounts').get().verifier;
  assert.match(record, /^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/);
  assert.ok(!record.includes(staff.password));
  response = await request('/admin/accounts', { method: 'POST', token, body: { ...staff, username: 'SAMPLE-OWNER' } });
  assert.equal(response.status, 409);
  response = await request('/admin/login', { method: 'POST', body: staff });
  const session = await response.json();
  assert.equal(response.status, 200);
  assert.equal(session.role, 'admin');
  const staffToken = session.token;
  assert.equal((await request('/admin/coupons', { token: staffToken })).status, 403);
  assert.equal((await request('/admin/accounts', { token: staffToken })).status, 403);
  assert.equal((await request('/admin/products/p1', { method: 'PATCH', body: { price: 41500 }, token: staffToken })).status, 200);
  assert.equal((await request('/admin/coupons', { method: 'POST', token, body: { code: 'TEST-PROMO', minQuantity: 2, percent: 15 } })).status, 201);
  response = await request('/quote', { method: 'POST', body: { items: [{ id: 'p1', quantity: 2 }], code: 'TEST-PROMO' } });
  const result = await response.json();
  response = await request(`/admin/quotes/${result.reference}`, { token: staffToken });
  assert.deepEqual((await response.json()).quote, result);
  assert.equal((await request('/admin/accounts/staff.1', { method: 'DELETE', token })).status, 200);
  assert.equal((await request('/admin/products/p1', { method: 'PATCH', body: { price: 41500 }, token: staffToken })).status, 401);
  assert.equal((await request('/admin/login', { method: 'POST', body: staff })).status, 401);
  response = await request('/admin/accounts', { token });
  assert.deepEqual((await response.json()).accounts, [{ username: 'staff.1', active: false }]);
});
