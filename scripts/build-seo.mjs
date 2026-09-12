import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {JSDOM} from 'jsdom';
const store=process.cwd();
const load=p=>import(pathToFileURL(path.join(store,p)));
const catalog=await load('assets/js/data/catalog.js'), copy=await load('assets/js/data/translations.js'), contact=await load('assets/js/data/config.js'), offers=await load('assets/js/offers.js'), seo=await load('assets/js/seo.js');
const {products}=catalog;
const hero={he:['מכשירי ריח ושמנים','לבית, לעסק ולרכב'],ar:['أجهزة تعطير وزيوت عطرية','للمنزل والأعمال والسيارة'],en:['Scent diffusers & fragrance oils','For homes, businesses & cars']};
for(const lang of ['he','ar','en']) {
 copy.translations[lang].hero.title1=hero[lang][0];copy.translations[lang].hero.title2=hero[lang][1];
 copy.translations[lang].hero.subtitle=seo.pageMeta('home',lang).description;
}
fs.writeFileSync(path.join(store,'assets/js/data/translations.js'),'export const translations = '+JSON.stringify(copy.translations,null,2)+';\n\nexport const faqItems = '+JSON.stringify(copy.faqItems,null,2)+';\n');
function addHead(d,{domain,url,title,description,lang,alternates,image,graph}) {
 d.querySelector('title').textContent=title;
 for(const sel of ['meta[name="description"]','link[rel="canonical"]','link[hreflang]','script[type="application/ld+json"]','meta[property^="og:"]','meta[name^="twitter:"]'])d.querySelectorAll(sel).forEach(e=>e.remove());
 const meta=(key,value,attr='name')=>{const e=d.createElement('meta');e.setAttribute(attr,key);e.content=value;d.head.append(e);};
 meta('description',description);meta('robots','index,follow,max-image-preview:large');
 const link=(rel,href,lang)=>{const e=d.createElement('link');e.rel=rel;e.href=href;if(lang)e.hreflang=lang;d.head.append(e);};
 link('canonical',url);
 for(const [l,u] of Object.entries(alternates))link('alternate',u,l);
 for(const [key,value] of Object.entries({title,description,url,type:'website',site_name:domain==='shoparomify.store'?'Aromifystore':"Daniel's Villa & Spa",image,locale:{he:'he_IL',ar:'ar_IL',en:'en_US'}[lang]}))meta('og:'+key,value,'property');
 meta('twitter:card','summary_large_image');meta('twitter:title',title);meta('twitter:description',description);meta('twitter:image',image);
 const e=d.createElement('script');e.type='application/ld+json';e.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');d.head.append(e);
}
function saveSitemap(dir,domain,urls) {
 fs.writeFileSync(path.join(dir,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'  <url><loc>'+u+'</loc></url>').join('\n')+'\n</urlset>\n');
 fs.writeFileSync(path.join(dir,'robots.txt'),'User-agent: *\nAllow: /\n\nSitemap: https://'+domain+'/sitemap.xml\n');
}
const templatePath=path.join(store,'scripts/seo-template.html');
if(!fs.existsSync(templatePath))fs.copyFileSync(path.join(store,'index.html'),templatePath);
const template=fs.readFileSync(templatePath,'utf8');
let app=fs.readFileSync(path.join(store,'assets/js/seo-app.js'),'utf8').replace(/^import .*;\r?\n/gm,'');
// Build with the same rendering functions used by visitors, without network resources.
app='const {products,fragranceGroups,translations,faqItems,CONTACT,activeOffer,effectivePrice,pageUrl,updateSEO}=window.__build;\n'+app;
const routes=['home','products',...products.map(p=>'product/'+p.slug)];const urls=[];
for(const route of routes)for(const lang of ['he','ar','en']) {
 const [r,slug]=route.split('/'), file=seo.pageUrl(r,lang,slug), url='https://shoparomify.store'+file;
 const dom=new JSDOM(template,{url,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 d.documentElement.lang=lang;d.documentElement.dir=lang==='en'?'ltr':'rtl';d.documentElement.dataset.route=route;
 d.querySelectorAll('[data-lang-label]').forEach(el=>{const a=d.createElement('a');for(const attr of el.attributes)a.setAttribute(attr.name,attr.value);a.textContent=el.textContent;a.href=seo.pageUrl(r,a.dataset.langLabel,slug);el.replaceWith(a);});
 w.__build={...catalog,...copy,...contact,...offers,...seo};
 // Functions imported from Node must execute in the document's realm.
 w.__build.updateSEO=()=>{};
 w.scrollTo=()=>{};w.setInterval=()=>0;
 w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 w.eval(app);
 await new Promise(resolve=>w.addEventListener('load',resolve,{once:true}));
 if(r==='products'){const h=d.querySelector('#view-products h2');const n=d.createElement('h1');n.className=h.className;n.textContent=h.textContent;h.replaceWith(n);}
 d.querySelectorAll('.reveal').forEach(e=>e.classList.add('in-view'));
 const meta=seo.pageMeta(r,lang,slug), org={'@type':'Organization','@id':'https://shoparomify.store/#organization',name:'Aromifystore',alternateName:['Aromify Store','أروميفاي ستور'],url:'https://shoparomify.store/',telephone:contact.CONTACT.phoneIntl,email:contact.CONTACT.email};
 const graph=[org,{'@type':'WebSite','@id':'https://shoparomify.store/#website',name:'Aromifystore',alternateName:'Aromify Store',url:'https://shoparomify.store/',inLanguage:['he','ar','en'],publisher:{'@id':org['@id']}},{'@type':'WebPage','@id':url+'#webpage',url,name:meta.title,description:meta.description,inLanguage:lang,isPartOf:{'@id':'https://shoparomify.store/#website'}}];
 const p=products.find(p=>p.slug===slug);
 if(p)graph.push({'@type':'Product',name:p.t[lang].name,description:p.t[lang].description,image:p.images.map(i=>'https://shoparomify.store/'+i),sku:p.id,url});
 addHead(d,{domain:'shoparomify.store',url,title:meta.title,description:meta.description,lang,alternates:Object.fromEntries(['he','ar','en','x-default'].map(l=>[l,'https://shoparomify.store'+seo.pageUrl(r,l==='x-default'?'he':l,slug)])),image:'https://shoparomify.store/'+meta.image,graph});
 // Cache-bust changed scripts so older cached modules cannot reset the page language.
 d.querySelector('script[type="module"]').src='assets/js/seo-app.js?v=seo-20260913';
 fs.writeFileSync(path.join(store,file==='/'?'index.html':file.slice(1)),dom.serialize());urls.push(url);w.close();
}
saveSitemap(store,'shoparomify.store',urls);
console.log('Built '+urls.length+' store pages');
