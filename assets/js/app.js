import { products, fragranceGroups } from './data/catalog.js';
import { translations, faqItems } from './data/translations.js';
import { CONTACT } from './data/config.js';
import { activeOffer, effectivePrice } from './offers.js';

const RTL = ["he", "ar"];
let currentLang = 'he';
try { const saved = localStorage.getItem('aromify-lang'); if (['he','ar','en'].includes(saved)) currentLang = saved; } catch {}
let currentFilter = 'all';
let searchQuery = '';
let renderedHash = '';
function waLink(msg) { const base = 'https://wa.me/' + CONTACT.whatsappNumber; return msg ? base + '?text=' + encodeURIComponent(msg) : base; }
function money(value) { return '<bdi dir="ltr">₪' + value.toLocaleString('en-US') + '</bdi>'; }
function bundleCopy(p) { const offer = activeOffer(p); return offer ? tr(offer.bottles === 2 ? 'offers.two' : 'offers.one') : ''; }
function offerHTML(p) { return activeOffer(p) ? '<div class="bundle-note"><strong>' + bundleCopy(p) + '</strong><span>' + tr('offers.dates') + '</span></div>' : ''; }

function tr(path) {
  const parts = path.split(".");
  let node = translations[currentLang];
  for (const p of parts) node = node?.[p];
  return node ?? path;
}

function applyLanguage(lang) {
  if (!['he', 'ar', 'en'].includes(lang)) return;
  currentLang = lang;
  try { localStorage.setItem("aromify-lang", lang); } catch {}
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";
  document.querySelectorAll("[data-lang-label]").forEach((el) => {
    el.classList.toggle("active", el.dataset.langLabel === lang);
  });
  translateStaticText();
  renderFragrances();
  router();
}

function translateStaticText() {
  document.querySelectorAll('[data-lang-label]').forEach(el => {
    el.classList.toggle('active', el.dataset.langLabel === currentLang);
    el.setAttribute('aria-pressed', String(el.dataset.langLabel === currentLang));
  });
  document.querySelector('.hero-product-img').alt = products[2].t[currentLang].name;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = tr(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", tr(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', tr(el.dataset.i18nAria)));
  document.title = 'Aromifystore | ' + tr('hero.eyebrow');
  document.querySelector('meta[name="description"]').content = tr('hero.subtitle');
  document.querySelectorAll('[data-promotion]').forEach(el => el.hidden = !products.some(p => activeOffer(p)));
  const langNames = { he: "עברית", ar: "العربية", en: "English" };
  document.getElementById("current-lang-label").textContent = langNames[currentLang];
}

function coverageText(p) {
  return typeof p.coverageArea === "string" ? p.coverageArea : p.coverageArea[currentLang];
}

function renderSlide(src, alt) {
  return `<div class="slide-placeholder" style="display:none"><span>Aromifystore</span></div>
          <img src="${src}" alt="${alt}" loading="lazy"
               onerror="this.style.display='none'; this.previousElementSibling.style.display='flex';" />`;
}

function productCardHTML(p) {
  const t = p.t[currentLang];
  const badge = activeOffer(p) ? tr('offers.badge') : p.badge?.[currentLang];
  const priceTag = effectivePrice(p) ? money(effectivePrice(p)) : tr("product.priceOnRequest");
  return `
    <a class="product-card glass" href="#product/${p.slug}">
      ${badge ? `<span class="badge">${badge}</span>` : ""}
      <div class="product-card-media">${renderSlide(p.images[0], t.name)}</div>
      <div class="product-card-body">
        <h3>${t.name}</h3>
        <p class="product-card-price">${priceTag}</p>
        ${offerHTML(p)}
        <p class="product-card-desc">${t.shortDescription}</p>
        <div class="product-card-footer">
          <span class="coverage-tag">${coverageText(p)}</span>
          <span class="view-link">${tr("ui.view")} <span aria-hidden="true">${RTL.includes(currentLang) ? "←" : "→"}</span></span>
        </div>
      </div>
    </a>`;
}

function renderFeaturedProducts() {
  const el = document.getElementById("featured-products-grid");
  if (!el) return;
  el.innerHTML = products.slice(0, 3).map(productCardHTML).join("");
}

function renderProductsGrid(filter = currentFilter) {
  const el = document.getElementById("products-grid");
  if (!el) return;
  const query = searchQuery.toLocaleLowerCase().trim();
  const list = products.filter(p => (filter === 'all' || (filter === 'offers' ? activeOffer(p) : p.category === filter)) && (!query || Object.values(p.t).some(t => (t.name + ' ' + t.shortDescription).toLocaleLowerCase().includes(query))));
  el.innerHTML = list.length ? list.map(productCardHTML).join('') : '<p class="empty-state" role="status">' + tr('ui.empty') + '</p>';
}

function setupProductFilters() {
  const wrap = document.getElementById("category-filters");
  if (!wrap) return;
  const cats = ["all", ...(products.some(p => activeOffer(p)) ? ["offers"] : []), "home", "office", "commercial", "car"];
  if (!cats.includes(currentFilter)) currentFilter = "all";
  wrap.innerHTML = cats
    .map((c) => `<button class="filter-btn${c === currentFilter ? " active" : ""}" aria-pressed="${c === currentFilter}" data-cat="${c}">${tr("products." + c)}</button>`)
    .join("");
  wrap.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".filter-btn").forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      currentFilter = btn.dataset.cat;
      renderProductsGrid();
    });
  });
}

function renderProductDetail(slug) {
  const container = document.getElementById("product-detail-content");
  const product = products.find((p) => p.slug === slug);
  if (!product) {
    container.innerHTML = `<h1>${tr("ui.notFound")}</h1><a class="btn btn-gold" href="#products">${tr("product.back")}</a>`;
    return;
  }
  const t = product.t[currentLang];
  const priceText = effectivePrice(product) ? money(effectivePrice(product)) : tr("product.priceOnRequest");

  container.innerHTML = `
    <div class="product-detail-grid">
      <div class="gallery glass" id="gallery">
        <div class="gallery-track" id="gallery-track">
          ${product.images.map((src) => `<div class="gallery-slide">${renderSlide(src, t.name)}</div>`).join("")}
        </div>
        ${product.images.length > 1 ? `
        <button class="gallery-nav prev" id="gallery-prev" aria-label="${tr("ui.previous")}">&#8592;</button>
        <button class="gallery-nav next" id="gallery-next" aria-label="${tr("ui.next")}">&#8594;</button>
        <div class="gallery-dots" id="gallery-dots">
          ${product.images.map((_, i) => `<button type="button" aria-label="${tr("ui.image")} ${i + 1}" aria-current="${i === 0}" class="dot${i === 0 ? " active" : ""}" data-i="${i}"></button>`).join("")}
        </div>` : ""}
      </div>

      <div class="product-info">
        ${product.badge ? `<span class="badge inline">${product.badge[currentLang]}</span>` : ""}
        <h1>${t.name}</h1>
        <p class="muted">${t.shortDescription}</p>
        <p class="price">${priceText}</p>
        ${offerHTML(product)}

        <div class="pill-row">
          <span class="pill glass">📍 ${tr("product.coverageArea")}: ${coverageText(product)}</span>
          <span class="pill glass">🛡 ${product.warranty[currentLang]}</span>
        </div>

        ${product.colors ? `
        <h2>${tr("product.colors")}</h2>
        <div class="color-swatches">
          ${product.colors.map((c) => `<span class="color-swatch" style="background:${c.hex}" title="${c[currentLang]}"></span>`).join("")}
        </div>` : ""}

        <p class="description">${t.description}</p>

        <h2>${tr("product.features")}</h2>
        <ul class="feature-list">${t.features.map((f) => `<li>${f}</li>`).join("")}</ul>

        <h2>${tr("product.specifications")}</h2>
        <dl class="spec-list">
          ${t.specs.map(([label, value]) => `<div class="spec-row"><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
        </dl>

        <div class="cta-row">
          <a href="#contact" class="btn btn-gold">${tr("product.contactUs")}</a>
          <a href="${waLink(tr("product.whatsapp") + " — " + t.name + (activeOffer(product) ? " — ₪" + effectivePrice(product) + " — " + bundleCopy(product) : ""))}" target="_blank" rel="noopener" class="btn btn-ghost">${tr("product.whatsapp")}</a>
          <button type="button" class="btn btn-bit" data-bit-pay>
            <span class="bit-badge">B</span>
            <span>${tr("contact.bitCta")}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="related-section">
      <h2>${tr("product.related")}</h2>
      <div class="grid-3">
        ${product.related.map((id) => productCardHTML(products.find((p) => p.id === id))).join("")}
      </div>
    </div>
  `;

  if (product.images.length > 1) setupGallery();
}

function setupGallery() {
  const track = document.getElementById("gallery-track");
  const dots = document.querySelectorAll("#gallery-dots .dot");
  let index = 0;
  function goTo(i) {
    index = (i + dots.length) % dots.length;
    track.style.transform = document.documentElement.dir === "rtl" ? `translateX(${index * 100}%)` : `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => { d.classList.toggle("active", di === index); d.setAttribute("aria-current", di === index); });
  }
  document.getElementById("gallery-prev").onclick = () => goTo(index - 1);
  document.getElementById("gallery-next").onclick = () => goTo(index + 1);
  dots.forEach((d) => (d.onclick = () => goTo(Number(d.dataset.i))));
  goTo(0);
}

function renderFAQ() {
  const el = document.getElementById("faq-list");
  if (!el) return;
  const items = faqItems[currentLang];
  el.innerHTML = items
    .map(
      (item, i) => `
      <div class="faq-item glass">
        <button class="faq-question" aria-expanded="false" aria-controls="faq-answer-${i}" data-i="${i}">
          <span>${item.q}</span><span class="faq-plus">+</span>
        </button>
        <div class="faq-answer" id="faq-answer-${i}"><p>${item.a}</p></div>
      </div>`
    )
    .join("");
  el.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const wasOpen = item.classList.contains("open");
      el.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
      el.querySelectorAll(".faq-question").forEach(b => b.setAttribute("aria-expanded", "false"));
      if (!wasOpen) item.classList.add("open");
      btn.setAttribute("aria-expanded", String(!wasOpen));
    });
  });
}

/* ---------- Fragrance oils section ---------- */
function fragranceChipHTML(item) {
  const name = item[currentLang];
  if (item.premium) {
    return `<span class="fragrance-chip premium reveal" title="${tr("fragrances.premiumBadge")}">
              ${name}<span class="chip-star">★</span>
            </span>`;
  }
  return `<span class="fragrance-chip reveal">${name}</span>`;
}

function renderFragrances() {
  const el = document.getElementById("fragrances-grid");
  if (!el) return;
  el.innerHTML = fragranceGroups
    .map(
      (group) => `
      <div class="fragrance-group reveal">
        <h3 class="fragrance-group-title">${group.title[currentLang]}</h3>
        <div class="fragrance-chips">
          ${group.items.map(fragranceChipHTML).join("")}
        </div>
      </div>`
    )
    .join("");
  observeReveals();
}

let revealObserver = null;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
  }
  document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => revealObserver.observe(el));
}

/* ---------- WhatsApp + contact links ---------- */
function setupContactLinks() {
  document.querySelectorAll("[data-whatsapp-link]").forEach((el) => (el.href = waLink()));
  document.querySelectorAll("[data-email-link]").forEach((el) => (el.href = `mailto:${CONTACT.email}`));
  document.querySelectorAll("[data-phone-link]").forEach((el) => (el.href = `tel:${CONTACT.phoneIntl}`));
  document.querySelectorAll("[data-alt-phone-link]").forEach((el) => (el.href = `tel:${CONTACT.altPhoneIntl}`));
  document.querySelectorAll("[data-email-text]").forEach((el) => (el.textContent = CONTACT.email));
  document.querySelectorAll("[data-phone-text]").forEach((el) => (el.textContent = CONTACT.phone));
  document.querySelectorAll("[data-alt-phone-text]").forEach((el) => (el.textContent = CONTACT.altPhone));
}

const BIT_DEEPLINK = "bituponline://";

function openBitFallbackModal() {
  const modal = document.getElementById("bit-fallback-modal");
  const phoneDisplay = document.getElementById("bit-phone-display");
  const callLink = document.getElementById("bit-call-link");
  phoneDisplay.textContent = CONTACT.phone;
  callLink.href = `tel:${CONTACT.phoneIntl}`;
  modal.classList.add("open");
  modal.returnFocus = document.activeElement;
  document.getElementById('bit-modal-close').focus();
}

function closeBitFallbackModal() {
  const modal = document.getElementById("bit-fallback-modal");
  if (!modal.classList.contains('open')) return;
  modal.classList.remove("open");
  modal.returnFocus?.focus();
}

function tryPayWithBit() {
  let handedOff = false;

  const onHide = () => {
    if (document.visibilityState === "hidden") handedOff = true;
  };
  document.addEventListener("visibilitychange", onHide);

  window.location.href = BIT_DEEPLINK;

  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!handedOff) openBitFallbackModal();
  }, 900);
}

function setupBitPayment() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-bit-pay]");
    if (btn) tryPayWithBit();
  });
  const closeBtn = document.getElementById("bit-modal-close");
  const modal = document.getElementById("bit-fallback-modal");
  if (closeBtn) closeBtn.addEventListener("click", closeBitFallbackModal);
  if (modal) {
    modal.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const first = document.getElementById('bit-call-link');
      const last = document.getElementById('bit-modal-close');
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeBitFallbackModal();
    });
  }
}

function setupContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector("#f-name").value;
    const phone = form.querySelector("#f-phone").value;
    const email = form.querySelector("#f-email").value;
    const message = form.querySelector("#f-message").value;
    const body = `${tr("contact.formName")}: ${name}\n${tr("contact.formPhone")}: ${phone}\n${tr("contact.formEmail")}: ${email}\n\n${message}`;
    window.location.href = `mailto:${CONTACT.email}?subject=Aromifystore Inquiry&body=${encodeURIComponent(body)}`;
  });
}

function buildParticles(containerId, count = 18) {
  const el = document.getElementById(containerId);
  if (!el || el.dataset.built) return;
  el.dataset.built = "true";
  let html = "";
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const size = 2 + Math.random() * 4;
    const delay = Math.random() * 6;
    const duration = 5 + Math.random() * 5;
    html += `<span class="particle" style="left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${duration}s"></span>`;
  }
  el.innerHTML = html;
}

const views = ["home", "products", "product", "about", "contact", "faq"];

function router() {
  const hash = location.hash.replace("#", "") || "home";
  const [route, param] = hash.split("/");
  const target = views.includes(route) ? route : "home";

  views.forEach((v) => {
    const section = document.getElementById("view-" + v);
    if (section) section.classList.toggle("active", v === target);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === target);
  });

  window.scrollTo({ top: 0, behavior: "instant" });

  if (target === "home") renderFeaturedProducts();
  if (target === "products") {
    if (param === "offers" && hash !== renderedHash) currentFilter = "offers";
    setupProductFilters();
    renderProductsGrid();
  }
  if (target === "product") renderProductDetail(param);
  if (target === "faq") renderFAQ();

  document.getElementById("mobile-menu").classList.remove("open");
  document.getElementById("burger").setAttribute("aria-expanded", "false");
  renderedHash = hash;
  observeReveals();
}

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = RTL.includes(currentLang) ? "rtl" : "ltr";

  document.getElementById('footer-year').textContent = new Date().getFullYear();
  document.getElementById('product-search').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderProductsGrid();
  });
  document.querySelector('.skip-link').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('main-content').focus();
  });
  translateStaticText();
  setupContactLinks();
  setupContactForm();
  setupBitPayment();
  buildParticles("hero-particles", 22);
  renderFragrances();

  const langToggle = document.getElementById("lang-toggle");
  const langMenu = document.getElementById("lang-menu");
  langToggle.addEventListener("click", () => { langMenu.classList.toggle("open"); langToggle.setAttribute("aria-expanded", langMenu.classList.contains("open")); });
  document.querySelectorAll("[data-lang-label]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyLanguage(btn.dataset.langLabel);
      { langMenu.classList.remove("open"); langToggle.setAttribute("aria-expanded", "false"); }
    });
  });
  document.addEventListener("click", (e) => {
    if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) { langMenu.classList.remove("open"); langToggle.setAttribute("aria-expanded", "false"); }
  });

  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobile-menu");
  burger.addEventListener("click", () => { mobileMenu.classList.toggle("open"); burger.setAttribute("aria-expanded", mobileMenu.classList.contains("open")); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { langMenu.classList.remove("open"); langToggle.setAttribute("aria-expanded", "false"); mobileMenu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); closeBitFallbackModal(); } });

  document.querySelectorAll("[data-scroll-to]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.dataset.scrollTo;
      const currentRoute = location.hash.replace("#", "").split("/")[0] || "home";
      if (currentRoute !== "home") location.hash = "home";
      mobileMenu.classList.remove("open");
      burger.setAttribute('aria-expanded', 'false');
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    });
  });

  const header = document.getElementById("site-header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 24);
  });

  window.addEventListener("hashchange", router);
  let offerVisible = Boolean(activeOffer(products[0]));
  const refreshOffers = () => {
    const next = Boolean(activeOffer(products[0]));
    if (next === offerVisible) return;
    offerVisible = next;
    translateStaticText();
    const scroll = window.scrollY;
    router();
    window.scrollTo({top: scroll, behavior: 'instant'});
  };
  setInterval(refreshOffers, 60000);
  document.addEventListener('visibilitychange', refreshOffers);
  router();
});
