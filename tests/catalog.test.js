import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { products, fragranceGroups } from '../assets/js/data/catalog.js';
import { translations, faqItems } from '../assets/js/data/translations.js';
import { promotion } from '../assets/js/data/config.js';
import { activeOffer, effectivePrice } from '../assets/js/offers.js';
import { pageUrl } from '../assets/js/seo.js';
import { JSDOM } from 'jsdom';

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
test('nine bundles match the supplied prices, bottle counts and confirmed terms',()=>{
  assert.deepEqual(promotion.items.map(o=>[o.productId,o.price,o.bottles]),[['p1',490,1],['p9',549,1],['p2',449,1],['p8',549,1],['p3',990,2],['p4',349,1],['p5',399,2],['p7',349,1],['p6',349,1]]);
  for(const offer of promotion.items) assert.equal(effectivePrice(products.find(p=>p.id===offer.productId),'2026-11-08T12:00:00+02:00'),offer.price);
  assert.deepEqual(promotion.items.filter(o=>o.shippingExcluded).map(o=>o.productId), ['p8','p3','p4','p5','p7','p6']);
  assert.equal(promotion.items.find(o=>o.productId==='p5').warrantyMonths,6);
  assert.equal(promotion.items.find(o=>o.productId==='p8').coverageM2,undefined);
  assert.equal(promotion.bottleSizeMl,null);
});
test('an unspecified promotion end does not expire on the previous campaign dates',()=>{
  assert.equal(promotion.endsAt,null);
  assert.ok(activeOffer(products[0],'2026-12-08T23:59:59+02:00'));
  assert.equal(activeOffer(products[0],'invalid'),null);
  assert.equal(effectivePrice(products[0],'invalid'),products[0].price);
});
test('generated offers pages show the same nine bundles in all storefront languages',()=>{
  for(const lang of ['he','ar','en']) {
    const page=pageUrl('offers',lang);
    const dom=new JSDOM(fs.readFileSync(new URL(page.slice(1),root),'utf8'));
    const {document}=dom.window;
    const view=document.querySelector('#view-offers.active');
    assert.equal(document.documentElement.lang,lang);
    assert.equal(document.documentElement.dir,lang==='en'?'ltr':'rtl');
    assert.ok(view);
    assert.equal(view.querySelector('h1').textContent,translations[lang].offers.title);
    assert.equal(view.querySelectorAll('.offer-card').length,9);
    assert.ok(view.querySelector(`a[href="/cart.html?lang=${lang}"]`));
    for(const offer of promotion.items) {
      const button=view.querySelector(`[data-cart-add="${offer.productId}"]`);
      const card=button.closest('.offer-card');
      assert.ok(card.querySelector('img')?.getAttribute('src'));
      assert.equal(card.querySelector(`[data-live-price="${offer.productId}"]`).textContent,`₪${offer.price}`);
    }
    dom.window.close();
  }
});
test('all 33 source images are retained in the image inventory',()=>{
 const mapping=JSON.parse(fs.readFileSync(new URL('docs/image-map.json',root),'utf8'));
 assert.equal(Object.keys(mapping).length,33);
 for(const [from,to] of Object.entries(mapping)) assert.ok(fs.statSync(new URL(to,root)).size>0,from);
});
