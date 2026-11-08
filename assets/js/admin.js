import { products } from './data/catalog.js';
import { apiConfigured, getPrices, request, money } from './store-api.js';

const byId = (id) => document.getElementById(id);
const productMap = new Map(products.map((product) => [product.id, product.t.ar.name]));
let token = '';
let prices = {};
let expiryTimer;
const priceForm = byId('price-form');
const couponForm = byId('coupon-form');
const accountForm = byId('account-form');

function notice(message) { byId('status').textContent = message; }

function showLogin(message = '') {
  token = '';
  prices = {};
  clearTimeout(expiryTimer);
  byId('coupons').replaceChildren();
  byId('accounts').replaceChildren();
  byId('coupon-panel').hidden = true;
  byId('accounts-panel').hidden = true;
  byId('lookup').replaceChildren();
  byId('lookup').hidden = true;
  byId('controls').hidden = true;
  byId('logout').hidden = true;
  byId('login-panel').hidden = !apiConfigured;
  notice(message);
}

function priceSelection() {
  const price = prices[priceForm.elements.id.value];
  priceForm.elements.price.value = Number.isSafeInteger(price) ? price / 100 : '';
}

async function run(form, action) {
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  notice('جارٍ التنفيذ…');
  try {
    await action();
  } catch (error) {
    if (error.status === 401 && token) showLogin('انتهت الجلسة. سجّل الدخول من جديد.');
    else if (error.status === 401) notice('تأكد من اسم المستخدم وكلمة المرور.');
    else if (error.status === 429) notice('محاولات كثيرة. انتظر ثم جرّب من جديد.');
    else if (error.status === 403) notice('هذه العملية متاحة لصاحب المتجر فقط.');
    else if (error.status === 409) notice('الكود أو اسم المستخدم موجود بالفعل. اختر اسمًا مختلفًا.');
    else if ([404, 410].includes(error.status)) notice('المرجع غير موجود أو انتهت صلاحيته.');
    else if ([400, 422].includes(error.status)) notice('تأكد من الحقول، خصوصًا صيغة الكود والكمية والسعر.');
    else notice('تعذّر إكمال العملية. جرّب مرة ثانية.');
  } finally {
    button.disabled = false;
  }
}

async function refreshCoupons() {
  const activeToken = token;
  const { coupons } = await request('/admin/coupons', { token });
  if (activeToken !== token) return;
  byId('coupons').replaceChildren(...coupons.map((coupon) => {
    const item = document.createElement('li');
    const code = document.createElement('bdi');
    code.textContent = coupon.code;
    const detail = document.createElement('span');
    detail.textContent = `خصم ${coupon.percent}% من ${coupon.minQuantity} باقة · ${coupon.active ? 'مفعّل' : 'موقوف'}`;
    item.append(code, detail);
    if (coupon.active) {
      const disable = document.createElement('button');
      disable.type = 'button';
      disable.className = 'store-secondary';
      disable.textContent = 'إيقاف الكود';
      disable.addEventListener('click', async () => {
        if (activeToken !== token) return;
        disable.disabled = true;
        try {
          await request(`/admin/coupons/${encodeURIComponent(coupon.code)}`, { token, method: 'DELETE' });
          await refreshCoupons();
          if (token === activeToken) notice('تم إيقاف الكود.');
        } catch (error) {
          if (error.status === 401) showLogin('انتهت الجلسة. سجّل الدخول من جديد.');
          else notice('تعذّر إيقاف الكود.');
          disable.disabled = false;
        }
      });
      item.append(disable);
    }
    return item;
  }));
}

async function refreshAccounts() {
  const activeToken = token;
  const { accounts } = await request('/admin/accounts', { token });
  if (activeToken !== token) return;
  byId('accounts').replaceChildren(...accounts.map((account) => {
    const item = document.createElement('li');
    const name = document.createElement('bdi');
    name.textContent = account.username;
    const status = document.createElement('span');
    status.textContent = account.active ? 'مفعّل' : 'موقوف';
    item.append(name, status);
    if (account.active) {
      const disable = document.createElement('button');
      disable.type = 'button';
      disable.className = 'store-secondary';
      disable.textContent = 'إيقاف الحساب';
      disable.addEventListener('click', async () => {
        if (token !== activeToken) return;
        disable.disabled = true;
        try {
          await request(`/admin/accounts/${encodeURIComponent(account.username)}`, { token, method: 'DELETE' });
          await refreshAccounts();
          if (activeToken === token) notice('تم إيقاف الحساب.');
        } catch (error) {
          if (error.status === 401) showLogin('انتهت الجلسة. سجّل الدخول من جديد.');
          else notice('تعذّر إيقاف الحساب.');
          disable.disabled = false;
        }
      });
      item.append(disable);
    }
    return item;
  }));
}

byId('login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  run(form, async () => {
    try {
      const { username, password } = Object.fromEntries(new FormData(form));
      const session = await request('/admin/login', { method: 'POST', body: { username, password } });
      token = session.token;
      prices = await getPrices();
      priceSelection();
      if (session.role === 'owner') {
        await Promise.all([refreshCoupons(), refreshAccounts()]);
        byId('coupon-panel').hidden = false;
        byId('accounts-panel').hidden = false;
      }
      byId('login-panel').hidden = true;
      byId('controls').hidden = false;
      byId('logout').hidden = false;
      expiryTimer = setTimeout(() => showLogin('انتهت الجلسة. سجّل الدخول من جديد.'), Math.max(0, Date.parse(session.expiresAt) - Date.now()));
      notice('تم تسجيل الدخول.');
    } finally { form.reset(); }
  });
});

for (const [id, name] of productMap) priceForm.elements.id.add(new Option(name, id));
priceForm.elements.id.addEventListener('change', priceSelection);
priceForm.addEventListener('submit', (event) => {
  event.preventDefault();
  run(priceForm, async () => {
    const id = priceForm.elements.id.value;
    const price = Math.round(priceForm.elements.price.valueAsNumber * 100);
    const activeToken = token;
    await request(`/admin/products/${id}`, { method: 'PATCH', token, body: { price } });
    if (activeToken !== token) return;
    prices[id] = price;
    priceSelection();
    notice('تم حفظ السعر.');
  });
});

couponForm.addEventListener('submit', (event) => {
  event.preventDefault();
  run(couponForm, async () => {
    const activeToken = token;
    const code = couponForm.elements.code.value.trim() ||
      `AR-${Array.from(crypto.getRandomValues(new Uint8Array(10)), (value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const { coupon } = await request('/admin/coupons', { method: 'POST', token, body: {
      code, percent: couponForm.elements.percent.valueAsNumber, minQuantity: couponForm.elements.minQuantity.valueAsNumber,
    } });
    if (activeToken !== token) return;
    couponForm.reset();
    await refreshCoupons();
    if (activeToken === token) notice(`تم إنشاء الكود ${coupon.code}.`);
  });
});

accountForm.addEventListener('submit', (event) => {
  event.preventDefault();
  run(accountForm, async () => {
    const activeToken = token;
    const { username, password } = Object.fromEntries(new FormData(accountForm));
    accountForm.elements.password.value = '';
    const { account } = await request('/admin/accounts', { method: 'POST', token, body: { username, password } });
    if (activeToken !== token) return;
    accountForm.reset();
    await refreshAccounts();
    if (activeToken === token) notice(`تم إنشاء حساب ${account.username}.`);
  });
});

byId('lookup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const result = byId('lookup');
  result.hidden = true;
  run(form, async () => {
    const activeToken = token;
    const reference = form.elements.reference.value.trim();
    const { quote } = await request(`/admin/quotes/${encodeURIComponent(reference)}`, { token });
    if (activeToken !== token) return;
    const list = document.createElement('ul');
    list.replaceChildren(...quote.items.map(({ id, quantity, unitPrice }) => {
      const line = document.createElement('li');
      line.textContent = `${productMap.get(id) || id} × ${quantity} · ${money(unitPrice)}`;
      return line;
    }));
    const total = document.createElement('p');
    total.textContent = `خصم ${money(quote.discount)} · مجموع المنتجات ${money(quote.total)}`;
    result.replaceChildren(list, total);
    result.hidden = false;
    notice('تم التحقق من المرجع.');
  });
});

byId('logout').addEventListener('click', () => showLogin('تم تسجيل الخروج من هذه الصفحة.'));
showLogin(apiConfigured ? '' : 'لوحة الإدارة جاهزة للربط. شغّل خدمة المتجر الآمنة قبل تسجيل الدخول.');
