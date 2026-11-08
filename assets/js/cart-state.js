import { products } from './data/catalog.js';

const storageKey = 'aromify-cart-v1';
const productIds = new Set(products.map(({ id }) => id));
export const maxQuantity = 99;

export function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return Object.fromEntries(Object.entries(stored).filter(([id, quantity]) =>
      productIds.has(id) && Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity));
  } catch {
    return {};
  }
}

export function setQuantity(id, quantity) {
  if (!productIds.has(id) || !Number.isInteger(quantity) || quantity < 0 || quantity > maxQuantity) return false;
  const cart = readCart();
  if (quantity) cart[id] = quantity;
  else delete cart[id];
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
    document.dispatchEvent(new Event('aromify-cart-change'));
    return true;
  } catch {
    return false;
  }
}
