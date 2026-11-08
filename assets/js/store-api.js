import { checkoutApi } from './store-runtime.js';

export const apiConfigured = Boolean(checkoutApi);

export async function request(path, { method = 'GET', body, token } = {}) {
  if (!apiConfigured) throw new Error('not_configured');
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${checkoutApi.replace(/\/$/, '')}${path}`, {
    method, headers, credentials: 'omit', cache: 'no-store', redirect: 'error',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'request_failed'), { status: response.status });
  return result;
}

export async function getPrices() {
  return (await request('/products')).prices;
}

export function money(amount) {
  return `₪${(amount / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
