import { promotion } from '../assets/js/data/config.js';

const prices = Object.fromEntries(promotion.items.map(({ productId, price }) => [productId, Math.round(price * 100)]));
const encoder = new TextEncoder();
const MAX_QUANTITY = 500;
const MAX_PRICE = 10_000_000;
const SESSION_SECONDS = 3600;
const QUOTE_SECONDS = 86400;
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{3,31}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,47}$/;

class RequestError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

function check(condition, status, code) {
  if (!condition) throw new RequestError(status, code);
}

function encode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decode(string) {
  return Uint8Array.from(atob(string.replaceAll('-', '+').replaceAll('_', '/')), character => character.charCodeAt(0));
}

function currentTime() {
  return Math.floor(Date.now() / 1000);
}

function date(seconds) {
  return new Date(seconds * 1000).toISOString();
}

function integer(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

async function input(request) {
  check(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'application/json', 415, 'json_required');
  check(request.body, 400, 'invalid_json');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    for (let next = await reader.read(); !next.done; next = await reader.read()) {
      size += next.value.length;
      if (size > 8192) {
        await reader.cancel();
        throw new RequestError(413, 'request_too_large');
      }
      text += decoder.decode(next.value, { stream: true });
    }
    const body = JSON.parse(text + decoder.decode());
    check(body && typeof body === 'object' && !Array.isArray(body), 400, 'invalid_json');
    return body;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, 'invalid_json');
  } finally {
    reader.releaseLock();
  }
}

function normalizedCode(code) {
  check(typeof code === 'string' && code.length <= 64, 400, 'invalid_code');
  const trimmed = code.trim();
  check(CODE_PATTERN.test(trimmed), 400, 'invalid_code');
  return trimmed.toUpperCase();
}

function validateItems(items) {
  check(Array.isArray(items) && items.length > 0 && items.length <= Object.keys(prices).length, 400, 'invalid_items');
  const seen = new Set();
  let units = 0;
  for (const item of items) {
    check(item && typeof item.id === 'string' && Object.hasOwn(prices, item.id) && !seen.has(item.id), 400, 'invalid_items');
    check(integer(item.quantity, 1, MAX_QUANTITY), 400, 'invalid_quantity');
    seen.add(item.id);
    units += item.quantity;
  }
  check(units <= MAX_QUANTITY, 400, 'invalid_quantity');
  return units;
}

async function getPrices(db) {
  const { results } = await db.prepare('SELECT id, price FROM product_prices').all();
  return { ...prices, ...Object.fromEntries(results.map(row => [row.id, row.price])) };
}

function getSigningKey(env) {
  check(typeof env.SIGNING_KEY === 'string' && /^[A-Za-z0-9_-]{43}$/.test(env.SIGNING_KEY), 503, 'setup_required');
  return crypto.subtle.importKey('raw', decode(env.SIGNING_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function sign(env, text) {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await getSigningKey(env), encoder.encode(text)));
}

async function rateLimit(request, env, scope, seconds, maximum) {
  const client = request.headers.get('CF-Connecting-IP') || 'local';
  const key = encode(await sign(env, `${scope}:${client}`));
  const now = currentTime();
  const expiry = now - (now % seconds) + seconds;
  const row = await env.DB.prepare(`
    INSERT INTO request_limits (key, expires_at, count) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET expires_at = excluded.expires_at,
      count = CASE WHEN request_limits.expires_at = excluded.expires_at THEN request_limits.count + 1 ELSE 1 END
    WHERE request_limits.expires_at != excluded.expires_at OR request_limits.count < ?
    RETURNING count
  `).bind(key, expiry, maximum).first();
  check(row, 429, 'too_many_requests');
}

async function quote(request, env) {
  const body = await input(request);
  const units = validateItems(body.items);
  const code = body.code === undefined || body.code === '' ? null : normalizedCode(body.code);
  await rateLimit(request, env, 'quote', 60, 20);

  // Read all price overrides and the requested coupon in the same database snapshot.
  const { results } = await env.DB.prepare(`
    SELECT id AS name, price AS amount, NULL AS minimum FROM product_prices
    UNION ALL
    SELECT code AS name, percent AS amount, min_quantity AS minimum FROM coupons WHERE code = ? AND active = 1
  `).bind(code).all();
  const coupon = results.find(row => row.minimum !== null);
  if (code) {
    check(coupon, 400, 'invalid_code');
    check(units >= coupon.minimum, 400, 'minimum_quantity');
  }

  const unitPrices = { ...prices, ...Object.fromEntries(results.filter(row => row.minimum === null).map(row => [row.name, row.amount])) };
  const items = body.items.map(({ id, quantity }) => ({ id, quantity, unitPrice: unitPrices[id], subtotal: quantity * unitPrices[id] }));
  const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
  const discount = Math.round(subtotal * (coupon?.amount ?? 0) / 100);
  const expires = currentTime() + QUOTE_SECONDS;
  const nonce = encode(crypto.getRandomValues(new Uint8Array(16)));
  const reference = 'AF-' + encode((await sign(env, `quote:${nonce}`)).slice(0, 15));
  const result = { currency: 'ILS', items, subtotal, discount, total: subtotal - discount, reference, expiresAt: date(expires) };
  await env.DB.prepare('INSERT INTO quotes (reference, expires_at, snapshot) VALUES (?, ?, ?)')
    .bind(reference, expires, JSON.stringify({ ...result, code })).run();
  return Response.json(result, { status: 201 });
}

async function derivePassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256));
}

async function passwordMatches(password, record) {
  check(typeof record === 'string' && /^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(record), 503, 'setup_required');
  const [salt, expected] = record.split('.');
  const actual = await derivePassword(password, decode(salt));
  const comparison = decode(expected);
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ comparison[index];
  return difference === 0;
}

function normalizedUsername(value) {
  if (typeof value !== 'string' || value.length > 128) return null;
  const username = value.trim();
  return USERNAME_PATTERN.test(username) ? username.toLowerCase() : null;
}

function ownerUsername(env) {
  const username = normalizedUsername(env.OWNER_USERNAME);
  check(username, 503, 'setup_required');
  return username;
}

async function accountByUsername(env, username) {
  if (username === ownerUsername(env)) return { username, role: 'owner', verifier: env.OWNER_PASSWORD_HASH };
  const row = await env.DB.prepare('SELECT verifier FROM admin_accounts WHERE username = ? AND active = 1').bind(username).first();
  return row ? { username, role: 'admin', verifier: row.verifier } : null;
}

function sessionPayload(account, expires, nonce) {
  return `${account.role}:${expires}.${nonce}:${account.username}:${account.verifier}`;
}

async function login(request, env) {
  const { username: rawUsername, password } = await input(request);
  const username = normalizedUsername(rawUsername);
  check(username && typeof password === 'string' && password.length > 0 && password.length <= 256, 400, 'invalid_credentials');
  await rateLimit(request, env, 'login', 900, 8);
  const account = await accountByUsername(env, username);
  const matches = await passwordMatches(password, account?.verifier ?? env.OWNER_PASSWORD_HASH);
  check(account && matches, 401, 'invalid_credentials');
  const expires = currentTime() + SESSION_SECONDS;
  const nonce = encode(crypto.getRandomValues(new Uint8Array(16)));
  const signature = encode(await sign(env, sessionPayload(account, expires, nonce)));
  return Response.json({ token: `${expires}.${encode(encoder.encode(username))}.${nonce}.${signature}`, expiresAt: date(expires), role: account.role });
}

async function authorize(request, env) {
  const match = /^Bearer (\d{1,12})\.([A-Za-z0-9_-]{4,64})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') || '');
  check(match && Number(match[1]) > currentTime(), 401, 'unauthorized');
  const [, expiry, encodedUsername, nonce, signature] = match;
  check(encodedUsername.length % 4 !== 1, 401, 'unauthorized');
  const username = String.fromCharCode(...decode(encodedUsername));
  check(USERNAME_PATTERN.test(username), 401, 'unauthorized');
  const account = await accountByUsername(env, username);
  check(account, 401, 'unauthorized');
  const valid = await crypto.subtle.verify('HMAC', await getSigningKey(env), decode(signature), encoder.encode(sessionPayload(account, expiry, nonce)));
  check(valid, 401, 'unauthorized');
  return account;
}

function couponForClient({ code, percent, min_quantity, active }) {
  return { code, percent, minQuantity: min_quantity, active: Boolean(active) };
}

async function ownerAccounts(request, env, path) {
  if (request.method === 'GET' && path === '/admin/accounts') {
    const { results } = await env.DB.prepare('SELECT username, active FROM admin_accounts ORDER BY username').all();
    return Response.json({ accounts: results.map(row => ({ username: row.username, active: Boolean(row.active) })) });
  }
  if (request.method === 'POST' && path === '/admin/accounts') {
    const { username: rawUsername, password } = await input(request);
    const username = normalizedUsername(rawUsername);
    check(username && typeof password === 'string' && password.length >= 16 && password.length <= 256, 400, 'invalid_account');
    check(username !== ownerUsername(env), 409, 'username_exists');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const verifier = `${encode(salt)}.${encode(await derivePassword(password, salt))}`;
    const row = await env.DB.prepare(`
      INSERT INTO admin_accounts (username, verifier) VALUES (?, ?) ON CONFLICT(username) DO NOTHING RETURNING username
    `).bind(username, verifier).first();
    check(row, 409, 'username_exists');
    return Response.json({ account: { username, active: true } }, { status: 201 });
  }
  const match = /^\/admin\/accounts\/([A-Za-z0-9_.-]+)$/.exec(path);
  if (request.method === 'DELETE' && match) {
    const username = normalizedUsername(match[1]);
    check(username && username !== ownerUsername(env), 404, 'not_found');
    const row = await env.DB.prepare('UPDATE admin_accounts SET active = 0 WHERE username = ? RETURNING username').bind(username).first();
    check(row, 404, 'not_found');
    return Response.json({ ok: true });
  }
  throw new RequestError(404, 'not_found');
}

async function ownerCoupons(request, env, path) {
  if (request.method === 'GET' && path === '/admin/coupons') {
    const { results } = await env.DB.prepare('SELECT code, percent, min_quantity, active FROM coupons ORDER BY code').all();
    return Response.json({ coupons: results.map(couponForClient) });
  }
  if (request.method === 'POST' && path === '/admin/coupons') {
    const { code: rawCode, percent, minQuantity } = await input(request);
    const code = normalizedCode(rawCode);
    check(integer(percent, 1, 100) && integer(minQuantity, 2, MAX_QUANTITY), 400, 'invalid_coupon');
    const row = await env.DB.prepare(`
      INSERT INTO coupons (code, percent, min_quantity) VALUES (?, ?, ?) ON CONFLICT(code) DO NOTHING
      RETURNING code, percent, min_quantity, active
    `).bind(code, percent, minQuantity).first();
    check(row, 409, 'code_exists');
    return Response.json({ coupon: couponForClient(row) }, { status: 201 });
  }
  const couponMatch = /^\/admin\/coupons\/([A-Za-z0-9_-]+)$/.exec(path);
  if (request.method === 'DELETE' && couponMatch) {
    const code = normalizedCode(couponMatch[1]);
    const row = await env.DB.prepare('UPDATE coupons SET active = 0 WHERE code = ? RETURNING code').bind(code).first();
    check(row, 404, 'not_found');
    return Response.json({ ok: true });
  }
  throw new RequestError(404, 'not_found');
}

async function admin(request, env, path) {
  if (request.method === 'POST' && path === '/admin/login') return login(request, env);
  const account = await authorize(request, env);
  if (path === '/admin/accounts' || path.startsWith('/admin/accounts/')) {
    check(account.role === 'owner', 403, 'forbidden');
    return ownerAccounts(request, env, path);
  }
  if (path === '/admin/coupons' || path.startsWith('/admin/coupons/')) {
    check(account.role === 'owner', 403, 'forbidden');
    return ownerCoupons(request, env, path);
  }
  const productMatch = /^\/admin\/products\/([a-z0-9]+)$/.exec(path);
  if (request.method === 'PATCH' && productMatch) {
    const id = productMatch[1];
    check(Object.hasOwn(prices, id), 404, 'not_found');
    const { price } = await input(request);
    check(integer(price, 1, MAX_PRICE), 400, 'invalid_price');
    await env.DB.prepare(`
      INSERT INTO product_prices (id, price) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET price = excluded.price
    `).bind(id, price).run();
    return Response.json({ id, price });
  }
  const quoteMatch = /^\/admin\/quotes\/(AF-[A-Za-z0-9_-]{20})$/.exec(path);
  if (request.method === 'GET' && quoteMatch) {
    const quote = await env.DB.prepare('SELECT snapshot, expires_at FROM quotes WHERE reference = ?').bind(quoteMatch[1]).first();
    check(quote, 404, 'not_found');
    check(quote.expires_at > currentTime(), 410, 'quote_expired');
    const { code, ...snapshot } = JSON.parse(quote.snapshot);
    return Response.json({ quote: account.role === 'owner' ? { ...snapshot, code } : snapshot });
  }
  throw new RequestError(404, 'not_found');
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).includes(origin);
    let response;
    try {
      check(!origin || allowed, 403, 'origin_not_allowed');
      const { pathname } = new URL(request.url);
      if (request.method === 'OPTIONS') response = new Response(null, { status: 204 });
      else if (pathname.startsWith('/admin/')) response = await admin(request, env, pathname);
      else if (request.method === 'GET' && pathname === '/products') response = Response.json({ currency: 'ILS', prices: await getPrices(env.DB) });
      else if (request.method === 'POST' && pathname === '/quote') response = await quote(request, env);
      else throw new RequestError(404, 'not_found');
    } catch (error) {
      if (!(error instanceof RequestError)) console.error('Checkout API internal error', error?.name);
      response = Response.json({ error: error instanceof RequestError ? error.message : 'internal_error' }, { status: error instanceof RequestError ? error.status : 500 });
    }
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Vary', 'Origin');
    if (allowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    return response;
  },

  async scheduled(_event, env) {
    const now = currentTime();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM request_limits WHERE expires_at <= ?').bind(now),
      env.DB.prepare('DELETE FROM quotes WHERE expires_at <= ?').bind(now),
    ]);
  },
};
