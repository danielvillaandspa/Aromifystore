import { getPrices, apiConfigured, money } from './store-api.js';
import { readCart, setQuantity, maxQuantity } from './cart-state.js';

const labels = {
  he: { added: 'נוסף לסל', limit: 'הכמות המרבית בסל', failed: 'שמירת הסל נכשלה' },
  ar: { added: 'تمت الإضافة للسلة', limit: 'وصلت للحد الأقصى في السلة', failed: 'تعذر حفظ السلة' },
  en: { added: 'Added to cart', limit: 'Maximum cart quantity', failed: 'Could not save the cart' },
};

function updateCount() {
  const count = Object.values(readCart()).reduce((total, quantity) => total + quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach((element) => {
    element.hidden = !count;
    element.textContent = count;
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-cart-add]');
  if (!button) return;
  const id = button.dataset.cartAdd;
  const quantity = readCart()[id] || 0;
  const copy = labels[document.documentElement.lang] || labels.he;
  const message = quantity >= maxQuantity ? copy.limit : setQuantity(id, quantity + 1) ? copy.added : copy.failed;
  const original = button.textContent;
  button.textContent = message;
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1100);
});

document.addEventListener('aromify-cart-change', updateCount);
window.addEventListener('storage', updateCount);
updateCount();

if (apiConfigured) {
  getPrices().then((prices) => {
    function renderPrices() {
      document.querySelectorAll('[data-live-price]').forEach((element) => {
        const price = prices[element.dataset.livePrice];
        if (!Number.isSafeInteger(price) || price < 0) return;
        const label = money(price);
        if (element.textContent !== label) element.textContent = label;
      });
    }
    renderPrices();
    new MutationObserver(renderPrices).observe(document.body, { childList: true, subtree: true });
  }).catch(() => {}); // Keep the published prices if the price service is unavailable.
}
