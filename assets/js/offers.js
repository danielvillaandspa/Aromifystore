import { promotion } from './data/config.js?v=202611-offers';

// Optional dates use explicit Israel offsets. End is exclusive.
export function activeOffer(product, now = new Date()) {
  const time = new Date(now).getTime();
  if (!Number.isFinite(time)) return null;
  if (promotion.startsAt && time < Date.parse(promotion.startsAt)) return null;
  if (promotion.endsAt && time >= Date.parse(promotion.endsAt)) return null;
  return promotion.items.find(offer => offer.productId === product.id) || null;
}

export function effectivePrice(product, now = new Date()) {
  return activeOffer(product, now)?.price ?? product.price;
}
