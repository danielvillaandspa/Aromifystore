import { products } from './data/catalog.js';
export const languageNames = {he:'עברית', ar:'العربية', en:'English'};
export function pageUrl(route='home', lang='he', slug='') {
  const suffix = lang === 'he' ? '' : '-' + lang;
  if (route === 'home') return lang === 'he' ? '/' : '/index-' + lang + '.html';
  if (route === 'products') return '/products' + suffix + '.html';
  if (route === 'product' && products.some(p=>p.slug===slug)) return '/product-' + slug + suffix + '.html';
  return pageUrl('home',lang) + '#' + route;
}
const home = {
 he:['Aromifystore | מכשירי ריח ושמנים לבית, לעסק ולרכב','מכשירי ריח ושמנים ארומטיים לבית, למשרד, לעסק ולרכב. השוו דגמים ובדקו התאמה לחלל עם Aromifystore בטלפון או בוואטסאפ.'],
 ar:['Aromifystore | أجهزة تعطير وزيوت عطرية للمنزل والأعمال','أروميفاي ستور: أجهزة تعطير وزيوت عطرية للمنزل والمكتب والمحلات والسيارة. قارن الأجهزة وتواصل معنا لمساعدتك في اختيار الجهاز والرائحة المناسبين.'],
 en:['Aromifystore | Scent Diffusers & Fragrance Oils','Explore scent diffusers and fragrance oils for homes, offices, businesses and cars. Compare Aromifystore devices and contact us for help choosing your scent.']
};
export function pageMeta(route,lang,slug) {
 const p=products.find(p=>p.slug===slug);
 if(route==='product'&&p) return {title:p.t[lang].name+' | Aromifystore',description:p.t[lang].shortDescription+'. '+({he:'צפו בתמונות ובמפרט, ובדקו התאמה לחלל שלכם עם Aromifystore.',ar:'شاهد الصور والمواصفات وتواصل مع أروميفاي ستور لاختيار الجهاز المناسب لمساحتك.',en:'View photos and specifications, and contact Aromifystore to check the right fit for your space.'})[lang],image:p.images[0]};
 if(route==='products') return {title:({he:'מכשירי ריח ושמנים ארומטיים',ar:'أجهزة التعطير والزيوت العطرية',en:'Scent Diffusers & Fragrance Oils'})[lang]+' | Aromifystore',description:home[lang][1],image:products[2].images[0]};
 return {title:home[lang][0],description:home[lang][1],image:products[2].images[0]};
}
export function updateSEO(route,lang,slug) {
 const meta=pageMeta(route,lang,slug), url='https://shoparomify.store'+pageUrl(route,lang,slug).split('#')[0];
 document.title=meta.title;
 document.querySelector('meta[name="description"]').content=meta.description;
 const canonical=document.querySelector('link[rel="canonical"]'); if(canonical) canonical.href=url;
 document.querySelectorAll('link[hreflang]').forEach(el=>el.href='https://shoparomify.store'+pageUrl(route,el.hreflang==='x-default'?'he':el.hreflang,slug).split('#')[0]);
 for(const [key,val] of Object.entries({'og:title':meta.title,'og:description':meta.description,'og:url':url,'og:image':'https://shoparomify.store/'+meta.image,'twitter:title':meta.title,'twitter:description':meta.description})) {
  const el=document.querySelector('meta[property="'+key+'"],meta[name="'+key+'"]'); if(el) el.content=val;
 }
 document.querySelectorAll('[data-lang-label]').forEach(el=>{if(el.tagName==='A')el.href=pageUrl(route,el.dataset.langLabel,slug);});
}
