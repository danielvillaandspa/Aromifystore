import { products } from './data/catalog.js';
import { CONTACT } from './data/config.js';
import { effectivePrice } from './offers.js';
import { readCart, setQuantity, maxQuantity } from './cart-state.js';
import { apiConfigured, getPrices, request, money } from './store-api.js';

const locales = {
  he: {
    title: 'סל הקניות', intro: 'בדקו את הכמויות ושלחו בקשת הזמנה לצוות AromifyStore ב-WhatsApp.', offers: 'חזרה למבצעים',
    items: 'המוצרים שלי', summary: 'סיכום הזמנה', code: 'קוד הנחת כמות', apply: 'החל קוד', subtotal: 'סכום ביניים',
    discount: 'הנחה', total: 'סכום מוצרים', shipping: 'החנות תאשר את עלות המשלוח ואת ההזמנה ב-WhatsApp.',
    quote: 'אימות סכום', order: 'שלחו בקשת הזמנה ב-WhatsApp', empty: 'הסל ריק. אפשר להוסיף חבילות מעמוד המבצעים.',
    remove: 'הסרה', quantity: 'כמות', loading: 'בודקים את הסל…', invalid: 'הקוד לא תקף או שהכמות בסל נמוכה מדי.',
    error: 'לא ניתן לאמת את הסכום כרגע. נסו שוב.', expired: 'האימות פג. אמתו את הסכום שוב.',
    reference: 'מספר בקשה', noApi: 'קודי הנחת כמות יהיו זמינים לאחר הפעלת האימות באתר.', greeting: 'שלום AromifyStore, אני רוצה להזמין:',
  },
  ar: {
    title: 'سلة التسوّق', intro: 'راجع الكميات وأرسل طلبك لفريق AromifyStore عبر واتساب.', offers: 'الرجوع للعروض',
    items: 'منتجاتي', summary: 'ملخّص الطلب', code: 'كود خصم الكمية', apply: 'تطبيق الكود', subtotal: 'المجموع الفرعي',
    discount: 'الخصم', total: 'مجموع المنتجات', shipping: 'المتجر يؤكد تكلفة التوصيل والطلب عبر واتساب.',
    quote: 'تأكيد المجموع', order: 'أرسل طلبك عبر واتساب', empty: 'السلة فارغة. بإمكانك إضافة الباقات من صفحة العروض.',
    remove: 'إزالة', quantity: 'الكمية', loading: 'جارٍ التحقق من السلة…', invalid: 'الكود غير صالح أو الكمية في السلة أقل من المطلوب.',
    error: 'تعذّر التحقق من المجموع. جرّب مرة ثانية.', expired: 'انتهت صلاحية التحقق. أكّد المجموع من جديد.',
    reference: 'مرجع الطلب', noApi: 'أكواد خصم الكميات بتتوفر بعد تفعيل خدمة التحقق بالموقع.', greeting: 'أهلًا AromifyStore، بدي أطلب:',
  },
  en: {
    title: 'Shopping cart', intro: 'Review quantities and send your order request to AromifyStore on WhatsApp.', offers: 'Back to offers',
    items: 'Your items', summary: 'Order summary', code: 'Quantity discount code', apply: 'Apply code', subtotal: 'Subtotal',
    discount: 'Discount', total: 'Products total', shipping: 'The store confirms delivery charges and your order on WhatsApp.',
    quote: 'Verify total', order: 'Send order request on WhatsApp', empty: 'Your cart is empty. Add a bundle from the offers page.',
    remove: 'Remove', quantity: 'Quantity', loading: 'Verifying the cart…', invalid: 'The code is invalid or the cart quantity is too low.',
    error: 'Could not verify the total. Please try again.', expired: 'Verification expired. Verify the total again.',
    reference: 'Request reference', noApi: 'Quantity codes become available when online verification is enabled.', greeting: 'Hi AromifyStore, I would like to order:',
  },
};

const requestedLanguage = new URLSearchParams(location.search).get('lang');
const language = Object.hasOwn(locales, requestedLanguage) ? requestedLanguage : 'he';
const copy = locales[language];
const byId = (id) => document.getElementById(id);
const pathSuffix = language === 'he' ? '' : `-${language}`;
const productMap = new Map(products.map((product) => [product.id, product]));
let prices = {};
let revision = 0;
let expiryTimer;

document.documentElement.lang = language;
document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
document.title = `${copy.title} | AromifyStore`;
byId('home').href = `/index${pathSuffix}.html`;
byId('offers').href = `/offers${pathSuffix}.html`;
for (const [id, key] of Object.entries({
  title: 'title', intro: 'intro', offers: 'offers', 'items-title': 'items', 'summary-title': 'summary',
  'code-label': 'code', apply: 'apply', 'subtotal-label': 'subtotal', 'discount-label': 'discount',
  'total-label': 'total', shipping: 'shipping', quote: 'quote', order: 'order', empty: 'empty',
})) byId(id).textContent = copy[key];

const items = () => Object.entries(readCart()).map(([id, quantity]) => ({ id, quantity }));

function orderLink(lines, reference) {
  const message = [copy.greeting, ...lines, reference ? `${copy.reference} ${reference}` : ''].filter(Boolean).join('\n');
  byId('order').href = `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`;
  byId('order').hidden = false;
}

function render() {
  revision++;
  clearTimeout(expiryTimer);
  const selection = items();
  byId('empty').hidden = Boolean(selection.length);
  byId('cart-grid').hidden = !selection.length;
  byId('coupon').hidden = !apiConfigured;
  byId('quote').hidden = !apiConfigured;
  byId('order').hidden = true;
  byId('quote').disabled = false;
  byId('apply').disabled = false;
  byId('discount-row').hidden = true;
  byId('status').textContent = apiConfigured ? '' : copy.noApi;
  let subtotal = 0;
  const lines = [];
  byId('items').replaceChildren(...selection.map(({ id, quantity }) => {
    const product = productMap.get(id);
    const name = product.t[language].name;
    const amount = prices[id] ?? effectivePrice(product) * 100;
    subtotal += amount * quantity;
    lines.push(`${name} × ${quantity}`);
    const item = document.createElement('li');
    const photo = document.createElement('img');
    photo.src = `/${product.images[0]}`;
    photo.alt = '';
    const details = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = name;
    const price = document.createElement('bdi');
    price.textContent = money(amount);
    const label = document.createElement('label');
    label.textContent = copy.quantity;
    const input = document.createElement('input');
    Object.assign(input, { type: 'number', min: 1, max: maxQuantity, value: quantity });
    input.addEventListener('change', () => {
      if (input.checkValidity() && setQuantity(id, input.valueAsNumber)) render();
      else input.value = quantity;
    });
    label.append(input);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'store-secondary';
    remove.textContent = copy.remove;
    remove.setAttribute('aria-label', `${copy.remove} ${name}`);
    remove.addEventListener('click', () => { if (setQuantity(id, 0)) render(); });
    const actions = document.createElement('div');
    actions.className = 'store-inline';
    actions.append(label, remove);
    details.append(heading, price, actions);
    item.append(photo, details);
    return item;
  }));
  byId('subtotal').textContent = money(subtotal);
  byId('total').textContent = money(subtotal);
  if (!apiConfigured && selection.length) orderLink(lines);
}

async function verify() {
  const selection = items();
  if (!selection.length) return;
  const attempt = ++revision;
  clearTimeout(expiryTimer);
  byId('order').hidden = true;
  byId('discount-row').hidden = true;
  byId('status').textContent = copy.loading;
  byId('quote').disabled = true;
  byId('apply').disabled = true;
  const code = byId('code').value.trim();
  try {
    const quote = await request('/quote', { method: 'POST', body: { items: selection, ...(code && { code }) } });
    if (attempt !== revision) return;
    byId('subtotal').textContent = money(quote.subtotal);
    byId('discount').textContent = money(quote.discount);
    byId('discount-row').hidden = !quote.discount;
    byId('total').textContent = money(quote.total);
    byId('status').textContent = `${copy.reference} ${quote.reference}`;
    orderLink(quote.items.map(({ id, quantity }) => `${productMap.get(id).t[language].name} × ${quantity}`), quote.reference);
    expiryTimer = setTimeout(() => {
      byId('order').hidden = true;
      byId('status').textContent = copy.expired;
    }, Math.max(0, Math.min(2147483647, Date.parse(quote.expiresAt) - Date.now())));
  } catch (error) {
    if (attempt === revision) byId('status').textContent = code && [400, 422].includes(error.status) ? copy.invalid : copy.error;
  } finally {
    if (attempt === revision) {
      byId('quote').disabled = false;
      byId('apply').disabled = false;
    }
  }
}

byId('coupon').addEventListener('submit', (event) => { event.preventDefault(); verify(); });
byId('quote').addEventListener('click', verify);
byId('code').addEventListener('input', render);
window.addEventListener('storage', render);
render();
if (apiConfigured) getPrices().then((value) => { prices = value; render(); }).catch(() => {});
