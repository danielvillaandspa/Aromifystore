import { promotion } from './data/config.js';

// Explicit Israel offsets avoid visitor timezone differences. End is exclusive.
export function activeOffer(product, now = new Date()) {
  const time = new Date(now).getTime();
  if (time < Date.parse(promotion.startsAt) || time >= Date.parse(promotion.endsAt) || !Number.isFinite(time)) return null;
  return promotion.items.find(offer => offer.productId === product.id) || null;
}

export function effectivePrice(product, now = new Date()) {
  return activeOffer(product, now)?.price ?? product.price;
}
