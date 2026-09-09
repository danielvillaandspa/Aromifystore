import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { products, fragranceGroups } from '../assets/js/data/catalog.js';
import { translations, faqItems } from '../assets/js/data/translations.js';
import { promotion } from '../assets/js/data/config.js';
import { activeOffer, effectivePrice } from '../assets/js/offers.js';

const root = new URL('../', import.meta.url);
test('all nine products have unique routes, valid images and related products',()=>{
  assert.equal(products.length,9);
  assert.equal(new Set(products.map(p=>p.slug)).size,products.length);
  for(const p of products) {
    for(const img of p.images) assert.ok(fs.existsSync(new URL(img,root)),img);
    for(const id of p.related) assert.ok(products.some(p=>p.id===id));
    for(const lang of ['ar','he','en']) { assert.ok(p.t[lang].name);assert.ok(p.coverageArea[lang]);assert.ok(p.t[lang].specs.length); }
  }
});
test('all UI keys and static HTML translation references exist in all languages',()=>{
  function keys(object,prefix='') { return Object.entries(object).flatMap(([k,v])=>typeof v==='object' ? keys(v,prefix+k+'.') : prefix+k); }
  const base=keys(translations.en).sort();
  const html=fs.readFileSync(new URL('index.html',root),'utf8');
  for(const lang of ['ar','he','en']) {
    assert.deepEqual(keys(translations[lang]).sort(),base);
    for(const [,key] of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) assert.equal(typeof key.split('.').reduce((o,k)=>o?.[k],translations[lang]),'string',lang+':'+key);
    assert.ok(faqItems[lang].length);
    for(const group of fragranceGroups) { assert.ok(group.title[lang]);for(const item of group.items) assert.ok(item[lang]); }
  }
});
test('eight bundles match supplied prices and bottle counts without fabricated discounts',()=>{
  assert.deepEqual(promotion.items.map(o=>[o.productId,o.price,o.bottles]),[['p1',649,2],['p2',549,2],['p3',1299,2],['p4',349,1],['p5',349,1],['p6',349,1],['p7',349,1],['p8',649,2]]);
  for(const offer of promotion.items) assert.equal(effectivePrice(products.find(p=>p.id===offer.productId),'2026-09-09T12:00:00+03:00'),offer.price);
  assert.equal(activeOffer(products[8],'2026-09-10'),null);
  assert.equal(promotion.bottleSizeMl,null);
});
test('promotion boundaries are exact and ordinary prices return after expiration',()=>{
  for(const p of products) {
    assert.equal(activeOffer(p,'2026-09-08T23:59:59+03:00'),null);
    assert.equal(activeOffer(p,'2026-10-09T00:00:00+03:00'),null);
    assert.equal(effectivePrice(p,'2026-10-10'),p.price);
  }
  assert.ok(activeOffer(products[0],'2026-09-09T00:00:00+03:00'));
  assert.ok(activeOffer(products[0],'2026-10-08T23:59:59+03:00'));
  assert.equal(activeOffer(products[0],'invalid'),null);
});
test('all 33 source images are retained in the image inventory',()=>{
 const mapping=JSON.parse(fs.readFileSync(new URL('docs/image-map.json',root),'utf8'));
 assert.equal(Object.keys(mapping).length,33);
 for(const [from,to] of Object.entries(mapping)) assert.ok(fs.statSync(new URL(to,root)).size>0,from);
});
