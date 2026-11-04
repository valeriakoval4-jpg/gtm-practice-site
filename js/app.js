/* =========================================================
   Green Corner — учебный магазин для практики GTM + GA4
   Здесь: каталог, корзина, и все push-и в dataLayer
   ========================================================= */
window.dataLayer = window.dataLayer || [];

var PRODUCTS = [
  { id: 'SKU-001', name: 'Монстера', price: 34.90, category: 'Крупные растения', emoji: '🌿', color: '#d8ead2', desc: 'Большие резные листья и неприхотливый характер. Идеальна для гостиной.' },
  { id: 'SKU-002', name: 'Кактус Эхинопсис', price: 9.90, category: 'Суккуленты', emoji: '🌵', color: '#f3e6c8', desc: 'Почти не требует полива и иногда радует яркими цветами.' },
  { id: 'SKU-003', name: 'Фикус Лирата', price: 44.00, category: 'Крупные растения', emoji: '🌳', color: '#cfe3d6', desc: 'Скульптурные листья в форме скрипки. Любит свет.' },
  { id: 'SKU-004', name: 'Орхидея Фаленопсис', price: 24.50, category: 'Цветущие', emoji: '🌸', color: '#f6d9e1', desc: 'Цветёт до трёх месяцев подряд. Отличный подарок.' },
  { id: 'SKU-005', name: 'Подсолнух в горшке', price: 12.00, category: 'Цветущие', emoji: '🌻', color: '#fbeab0', desc: 'Карманное солнце для подоконника.' },
  { id: 'SKU-006', name: 'Набор суккулентов', price: 19.90, category: 'Суккуленты', emoji: '🪴', color: '#e2e8d0', desc: 'Три маленьких растения в керамических горшочках.' },
  { id: 'SKU-007', name: 'Тюльпаны', price: 15.00, category: 'Цветущие', emoji: '🌷', color: '#fadbd6', desc: 'Весенний букет из семи тюльпанов.' },
  { id: 'SKU-008', name: 'Бамбук удачи', price: 11.50, category: 'Крупные растения', emoji: '🎋', color: '#dcebd5', desc: 'Растёт в воде, приносит удачу (говорят).' }
];
var CURRENCY = (window.SITE_CONFIG && SITE_CONFIG.CURRENCY) || 'USD';
var COUPONS = { WELCOME10: 0.10, PLANTS20: 0.20 };

/* ---------- helpers ---------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function money(v) { return '$' + v.toFixed(2); }
function round2(v) { return Math.round(v * 100) / 100; }
function findProduct(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }
function getParam(name) { return new URLSearchParams(location.search).get(name); }

function toast(text) {
  var t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

/* ---------- GA4 ecommerce items + push ---------- */
function toItem(p, extra) {
  var item = {
    item_id: p.id, item_name: p.name, item_brand: 'Green Corner',
    item_category: p.category, price: p.price, quantity: 1
  };
  for (var k in (extra || {})) item[k] = extra[k];
  return item;
}
function pushEcommerce(eventName, ecommerce) {
  window.dataLayer.push({ ecommerce: null });           // очищаем прошлый ecommerce-объект
  ecommerce.currency = ecommerce.currency || CURRENCY;
  window.dataLayer.push({ event: eventName, ecommerce: ecommerce });
}

/* ---------- cart (localStorage) ---------- */
function getCart() { try { return JSON.parse(localStorage.getItem('gc_cart')) || []; } catch (e) { return []; } }
function saveCart(c) { localStorage.setItem('gc_cart', JSON.stringify(c)); updateCartCount(); }
function cartLines() {
  return getCart().map(function (l) { return { product: findProduct(l.id), qty: l.qty }; }).filter(function (l) { return l.product; });
}
function cartItems() { return cartLines().map(function (l, i) { return toItem(l.product, { quantity: l.qty, index: i }); }); }
function cartTotal() { return round2(cartLines().reduce(function (s, l) { return s + l.product.price * l.qty; }, 0)); }
function updateCartCount() {
  var n = getCart().reduce(function (s, l) { return s + l.qty; }, 0);
  $all('.cart-count').forEach(function (el) { el.textContent = n; el.style.display = n ? '' : 'none'; });
}
function addToCart(p, qty, listName) {
  var cart = getCart(); var line = cart.filter(function (l) { return l.id === p.id; })[0];
  if (line) line.qty += qty; else cart.push({ id: p.id, qty: qty });
  saveCart(cart);
  pushEcommerce('add_to_cart', {
    value: round2(p.price * qty),
    items: [toItem(p, { quantity: qty, item_list_name: listName })]
  });
  toast(p.emoji + ' ' + p.name + ' — в корзине');
}

/* ---------- layout ---------- */
function renderLayout() {
  var page = document.body.dataset.page;
  var user = null; try { user = JSON.parse(localStorage.getItem('gc_user')); } catch (e) {}
  var nav = [['index.html', 'Главная', 'home'], ['catalog.html', 'Каталог', 'catalog'], ['about.html', 'О нас', 'about'], ['lead.html', 'Для бизнеса', 'lead'], ['contact.html', 'Контакты', 'contact']];
  var header = $('#site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML =
      '<div class="container">' +
        '<a class="logo" href="index.html">🌱 Green Corner</a>' +
        '<nav class="nav">' + nav.map(function (n) {
          return '<a href="' + n[0] + '"' + (n[2] === page ? ' class="active"' : '') + '>' + n[1] + '</a>';
        }).join('') + '</nav>' +
        '<div class="header-actions">' +
          '<button class="btn btn-ghost btn-small" id="login-btn">' + (user ? '👤 Выйти' : '👤 Войти') + '</button>' +
          '<a class="cart-link" href="cart.html" aria-label="Корзина">🛒<span class="cart-count">0</span></a>' +
        '</div>' +
      '</div>';
    $('#login-btn').addEventListener('click', function () {
      if (user) {
        localStorage.removeItem('gc_user');
        window.dataLayer.push({ event: 'logout', user_id: undefined, user_status: 'guest' });
        toast('Вы вышли из аккаунта');
      } else {
        user = { id: 'U-' + Math.floor(10000 + Math.random() * 90000) };
        localStorage.setItem('gc_user', JSON.stringify(user));
        window.dataLayer.push({ event: 'login', method: 'demo', user_id: user.id, user_status: 'logged_in' });
        toast('Вы вошли как ' + user.id);
      }
      setTimeout(function () { location.reload(); }, 900);
    });
  }
  var footer = $('#site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="container">' +
        '<div><h4>🌱 Green Corner</h4><p>Учебный магазин растений для практики GTM и GA4. Ничего не продаём по-настоящему 🙂</p></div>' +
        '<div><h4>Магазин</h4><a href="catalog.html">Каталог</a><a href="cart.html">Корзина</a><a href="files/plant-care-guide.pdf" download>📄 Гайд по уходу (PDF)</a><a href="lab/">🧪 Лаборатория GA4 ⇄ Salesforce</a></div>' +
        '<div><h4>Мы в соцсетях</h4><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a><a href="https://www.pinterest.com/" target="_blank" rel="noopener">Pinterest</a><a href="https://www.youtube.com/" target="_blank" rel="noopener">YouTube</a></div>' +
        '<div><h4>Связаться</h4><a href="tel:+10000000000">📞 +1 000 000-00-00</a><a href="mailto:hello@example.com">✉️ hello@example.com</a><a href="#" id="cookie-settings-link">🍪 Настройки cookie</a></div>' +
      '</div>';
  }
  updateCartCount();
}

/* ---------- product card ---------- */
function productCard(p, index, listId, listName) {
  return '<article class="card" data-id="' + p.id + '">' +
    '<a class="card-img product-link" href="product.html?id=' + p.id + '" style="background:' + p.color + '" data-index="' + index + '">' + p.emoji + '</a>' +
    '<div class="card-body">' +
      '<span class="card-cat">' + p.category + '</span>' +
      '<a class="card-title product-link" href="product.html?id=' + p.id + '" data-index="' + index + '">' + p.name + '</a>' +
      '<div class="card-footer"><span class="price">' + money(p.price) + '</span>' +
      '<button class="btn btn-small add-btn" data-id="' + p.id + '">В корзину</button></div>' +
    '</div></article>';
}
function renderList(container, products, listId, listName) {
  container.innerHTML = products.map(function (p, i) { return productCard(p, i, listId, listName); }).join('');
  pushEcommerce('view_item_list', {
    item_list_id: listId, item_list_name: listName,
    items: products.map(function (p, i) { return toItem(p, { index: i, item_list_id: listId, item_list_name: listName }); })
  });
  $all('.product-link', container).forEach(function (a) {
    a.addEventListener('click', function () {
      var p = findProduct(a.closest('.card').dataset.id);
      sessionStorage.setItem('gc_list', listName);
      pushEcommerce('select_item', {
        item_list_id: listId, item_list_name: listName,
        items: [toItem(p, { index: +a.dataset.index, item_list_id: listId, item_list_name: listName })]
      });
    });
  });
  $all('.add-btn', container).forEach(function (b) {
    b.addEventListener('click', function () { addToCart(findProduct(b.dataset.id), 1, listName); });
  });
}

/* ---------- pages ---------- */
var pages = {};

pages.home = function () {
  renderList($('#featured'), PRODUCTS.slice(0, 4), 'featured', 'Хиты продаж');

  var promo = { promotion_id: 'PROMO_WELCOME10', promotion_name: 'Скидка 10% на первый заказ', creative_name: 'home_banner', creative_slot: 'home_top' };
  pushEcommerce('view_promotion', { items: [promo] });
  $('#promo-link').addEventListener('click', function () { pushEcommerce('select_promotion', { items: [promo] }); });

  initNewsletter('newsletter-form', 'newsletter-success');
};

// Подписка на рассылку: специально БЕЗ dataLayer-события.
// Попробуй отследить её сама: триггер «Отправка формы» или «Видимость элемента» (.success)
// Формы: #newsletter-form (главная) и #about-newsletter-form (О нас), у обеих класс .newsletter-form
function initNewsletter(formId, successId) {
  var form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.querySelector('input[type=email]');
    if (!/^\S+@\S+\.\S+$/.test(email.value)) { email.focus(); toast('Введите корректный email'); return; }
    form.outerHTML = '<p class="success" id="' + successId + '">🎉 Спасибо! Вы подписаны на рассылку.</p>';
  });
}

pages.catalog = function () {
  var cats = ['Все'].concat(PRODUCTS.map(function (p) { return p.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
  var filters = $('#filters'); var grid = $('#catalog');
  filters.innerHTML = cats.map(function (c, i) { return '<button class="chip' + (i ? '' : ' active') + '" data-cat="' + c + '">' + c + '</button>'; }).join('');
  function show(cat) {
    var list = cat === 'Все' ? PRODUCTS : PRODUCTS.filter(function (p) { return p.category === cat; });
    renderList(grid, list, cat === 'Все' ? 'catalog_all' : 'catalog_' + cat, 'Каталог: ' + cat);
  }
  $all('.chip', filters).forEach(function (chip) {
    chip.addEventListener('click', function () {
      $all('.chip', filters).forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      window.dataLayer.push({ event: 'filter_apply', filter_type: 'category', filter_value: chip.dataset.cat });
      show(chip.dataset.cat);
    });
  });
  show('Все');
};

pages.product = function () {
  var p = findProduct(getParam('id')) || PRODUCTS[0];
  var listName = sessionStorage.getItem('gc_list') || undefined;
  document.title = p.name + ' — Green Corner';
  $('#product').innerHTML =
    '<div class="product-img" style="background:' + p.color + '">' + p.emoji + '</div>' +
    '<div>' +
      '<a href="catalog.html">← Назад в каталог</a>' +
      '<p class="card-cat" style="margin-top:18px">' + p.category + '</p>' +
      '<h1>' + p.name + '</h1>' +
      '<span class="price">' + money(p.price) + '</span>' +
      '<p>' + p.desc + '</p>' +
      '<div style="margin-top:22px;display:flex;align-items:center;flex-wrap:wrap;gap:10px">' +
        '<div class="qty"><button id="minus" aria-label="Меньше">−</button><input id="qty" value="1" readonly><button id="plus" aria-label="Больше">+</button></div>' +
        '<button class="btn" id="add">🛒 Добавить в корзину</button>' +
        '<button class="btn btn-outline" id="wish">♡ В избранное</button>' +
      '</div>' +
      '<div class="tabs"><div class="tab-buttons">' +
        '<button class="active" data-tab="desc">Описание</button><button data-tab="care">Уход</button><button data-tab="delivery">Доставка</button></div>' +
        '<div class="tab-panel" data-panel="desc">' + p.desc + ' Высота растения 30–60 см, поставляется в горшке.</div>' +
        '<div class="tab-panel" data-panel="care" hidden>Полив раз в неделю, рассеянный свет. Подробнее — в <a href="files/plant-care-guide.pdf" download>PDF-гайде по уходу</a>.</div>' +
        '<div class="tab-panel" data-panel="delivery" hidden>Курьером за 1–2 дня или самовывоз из магазина.</div>' +
      '</div>' +
    '</div>';

  pushEcommerce('view_item', { value: p.price, items: [toItem(p, { item_list_name: listName })] });

  var qty = $('#qty');
  $('#minus').onclick = function () { qty.value = Math.max(1, +qty.value - 1); };
  $('#plus').onclick = function () { qty.value = Math.min(20, +qty.value + 1); };
  $('#add').onclick = function () { addToCart(p, +qty.value, listName); };
  $('#wish').onclick = function () {
    pushEcommerce('add_to_wishlist', { value: p.price, items: [toItem(p)] });
    this.textContent = '♥ В избранном'; toast('Добавлено в избранное');
  };
  // Вкладки: без dataLayer-события — потренируйся ловить клики по ним триггером «Все элементы»
  $all('.tab-buttons button').forEach(function (b) {
    b.addEventListener('click', function () {
      $all('.tab-buttons button').forEach(function (x) { x.classList.toggle('active', x === b); });
      $all('.tab-panel').forEach(function (panel) { panel.hidden = panel.dataset.panel !== b.dataset.tab; });
    });
  });

  // «Похожие товары»
  var related = PRODUCTS.filter(function (x) { return x.id !== p.id; }).slice(0, 4);
  renderList($('#related'), related, 'related', 'Похожие товары');
};

pages.cart = function () {
  var root = $('#cart');
  function draw() {
    var lines = cartLines();
    if (!lines.length) {
      root.innerHTML = '<div class="empty"><div>🪴</div><p>Корзина пуста</p><a class="btn" href="catalog.html">В каталог</a></div>';
      return;
    }
    root.innerHTML =
      '<table class="cart-table"><thead><tr><th>Товар</th><th>Цена</th><th>Кол-во</th><th>Сумма</th><th></th></tr></thead><tbody>' +
      lines.map(function (l) {
        return '<tr><td><span class="cart-emoji">' + l.product.emoji + '</span>' + l.product.name + '</td>' +
          '<td>' + money(l.product.price) + '</td><td>' + l.qty + '</td><td><b>' + money(l.product.price * l.qty) + '</b></td>' +
          '<td><button class="btn btn-ghost btn-small remove-btn" data-id="' + l.product.id + '">✕ Удалить</button></td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<div class="summary"><span class="total">Итого: ' + money(cartTotal()) + '</span>' +
      '<a class="btn" id="checkout-btn" href="checkout.html">Оформить заказ →</a></div>';
    $all('.remove-btn', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var line = cartLines().filter(function (l) { return l.product.id === b.dataset.id; })[0];
        saveCart(getCart().filter(function (l) { return l.id !== b.dataset.id; }));
        pushEcommerce('remove_from_cart', { value: round2(line.product.price * line.qty), items: [toItem(line.product, { quantity: line.qty })] });
        draw();
      });
    });
  }
  draw();
  if (cartLines().length) pushEcommerce('view_cart', { value: cartTotal(), items: cartItems() });
};

pages.checkout = function () {
  if (!cartLines().length) { location.href = 'cart.html'; return; }
  var discount = 0, coupon = '';
  function shipping() { var r = $('input[name=shipping]:checked'); return r && r.value === 'courier' ? 5 : 0; }
  function totals() {
    var sub = cartTotal(), disc = round2(sub * discount), ship = shipping();
    return { sub: sub, disc: disc, ship: ship, total: round2(sub - disc + ship) };
  }
  function drawSummary() {
    var t = totals();
    $('#order-summary').innerHTML = cartLines().map(function (l) {
      return '<div class="order-line"><span>' + l.product.emoji + ' ' + l.product.name + ' × ' + l.qty + '</span><span>' + money(l.product.price * l.qty) + '</span></div>';
    }).join('') +
      (t.disc ? '<div class="order-line"><span>Скидка (' + coupon + ')</span><span>−' + money(t.disc) + '</span></div>' : '') +
      '<div class="order-line"><span>Доставка</span><span>' + (t.ship ? money(t.ship) : 'бесплатно') + '</span></div>' +
      '<div class="order-line total-line"><span>Итого</span><span>' + money(t.total) + '</span></div>';
  }
  drawSummary();
  pushEcommerce('begin_checkout', { value: cartTotal(), items: cartItems() });

  $('#apply-coupon').addEventListener('click', function () {
    var code = $('#coupon').value.trim().toUpperCase();
    if (COUPONS[code]) { discount = COUPONS[code]; coupon = code; toast('Промокод применён 🎉'); }
    else { discount = 0; coupon = ''; toast('Такого промокода нет'); }
    window.dataLayer.push({ event: 'coupon_apply', coupon_code: code, coupon_valid: !!COUPONS[code] });
    drawSummary();
  });
  $all('input[name=shipping]').forEach(function (r) {
    r.addEventListener('change', function () {
      drawSummary();
      pushEcommerce('add_shipping_info', { value: totals().total, coupon: coupon || undefined, shipping_tier: r.value, items: cartItems() });
    });
  });
  $all('input[name=payment]').forEach(function (r) {
    r.addEventListener('change', function () {
      pushEcommerce('add_payment_info', { value: totals().total, coupon: coupon || undefined, payment_type: r.value, items: cartItems() });
    });
  });

  $('#checkout-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(this)) return;
    if (!$('input[name=shipping]:checked') || !$('input[name=payment]:checked')) { toast('Выберите доставку и оплату'); return; }
    var t = totals();
    var order = {
      transaction_id: 'T-' + Date.now().toString().slice(-8),
      value: t.total, tax: round2(t.total * 0.2 / 1.2), shipping: t.ship, coupon: coupon || undefined,
      items: cartItems(), tracked: false
    };
    sessionStorage.setItem('gc_last_order', JSON.stringify(order));
    saveCart([]);
    location.href = 'thank-you.html';
  });
};

pages.purchase = function () {
  var order = null; try { order = JSON.parse(sessionStorage.getItem('gc_last_order')); } catch (e) {}
  if (!order) { $('#order-info').innerHTML = '<p>Заказ не найден. <a href="catalog.html">Вернуться в каталог</a></p>'; return; }
  $('#order-info').innerHTML = '<p>Номер заказа: <b>' + order.transaction_id + '</b></p><p>Сумма: <b>' + money(order.value) + '</b></p>';
  // Защита от дублей: purchase отправляется только один раз, даже если обновить страницу
  if (!order.tracked) {
    pushEcommerce('purchase', {
      transaction_id: order.transaction_id, value: order.value, tax: order.tax,
      shipping: order.shipping, coupon: order.coupon, items: order.items
    });
    order.tracked = true;
    sessionStorage.setItem('gc_last_order', JSON.stringify(order));
  }
};

pages.contact = function () {
  $('#contact-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(this)) {
      window.dataLayer.push({ event: 'form_error', form_name: 'contact' });
      return;
    }
    var topic = $('#topic').value;
    this.outerHTML = '<p class="success" id="contact-success">✅ Сообщение отправлено! Мы ответим в течение дня.</p>';
    window.dataLayer.push({ event: 'generate_lead', form_name: 'contact', form_topic: topic });
  });
};

pages.about = function () {
  initNewsletter('about-newsletter-form', 'about-newsletter-success');
};

/* ---------- B2B-заявка по схеме «сайт → свой сервер → Salesforce» (симуляция) ----------
   Шаг 3 документа: запоминаем страницы и источник визита.
   Шаг 4: заявка уходит на «сервер» POST /api/leads (здесь — localStorage gc_server_db), он выдаёт submission_id.
   Шаг 6: только после ответа «сохранено» — dataLayer lead_form_success (без имени/email/телефона). */
var SITE_ID = 'main_site', FORM_ID = 'business_contact', SITE_LANGUAGE = 'ru';
var CTA_TTL_MS = 30 * 60 * 1000;

function readJSON(store, key) { try { return JSON.parse(store.getItem(key)); } catch (e) { return null; } }
function externalReferrer() {
  try { return document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : ''; } catch (e) { return ''; }
}
function consentDenied() { return /(?:^|; )gc_consent_analytics=denied/.test(document.cookie); }

// Первое касание (не перезаписывается) и касание текущего визита (вкладка браузера = визит, упрощённо)
function captureTouches() {
  var q = new URLSearchParams(location.search);
  var utm = { source: q.get('utm_source') || '', medium: q.get('utm_medium') || '', campaign: q.get('utm_campaign') || '' };
  var touch = { landing_path: location.pathname, ts: new Date().toISOString(), utm: utm, referrer: externalReferrer() };
  if (!readJSON(localStorage, 'gc_first_touch')) localStorage.setItem('gc_first_touch', JSON.stringify(touch));
  var session = readJSON(sessionStorage, 'gc_session_touch');
  // Новый визит: начало сессии или переход по новой рекламной ссылке
  if (!session || (utm.source && utm.source !== session.utm.source)) sessionStorage.setItem('gc_session_touch', JSON.stringify(touch));
}

// Клик по ссылке, ведущей на форму, — запоминаем страницу кнопки (cta_origin_path) на 30 минут
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href]');
  if (!a || document.body.dataset.page === 'lead') return;
  var url; try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
  if (url.host === location.host && /\/lead\.html$/.test(url.pathname)) {
    sessionStorage.setItem('gc_cta', JSON.stringify({ path: location.pathname, ts: Date.now() }));
  }
}, true);
function ctaOrigin() {
  var c = readJSON(sessionStorage, 'gc_cta');
  return c && Date.now() - c.ts < CTA_TTL_MS ? c.path : '';
}

// client_id и session_id через gtag('get') с таймаутом (cookie GA4 вручную не разбираем)
function getGaIds(timeoutMs) {
  return new Promise(function (resolve) {
    var out = { client_id: '', session_id: '' }, left = 2, done = false;
    function finish() { if (!done) { done = true; resolve(out); } }
    if (consentDenied()) return finish();
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    var mid = (window.SITE_CONFIG && SITE_CONFIG.GA4_ID) || '';
    gtag('get', mid, 'client_id', function (v) { out.client_id = v ? String(v) : ''; if (--left === 0) finish(); });
    gtag('get', mid, 'session_id', function (v) { out.session_id = v ? String(v) : ''; if (--left === 0) finish(); });
    setTimeout(finish, timeoutMs);
  });
}

// «Сервер»: POST /api/leads. Идемпотентность — один ключ на одно заполнение формы
function apiPostLead(payload, idemKey) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      var db = readJSON(localStorage, 'gc_server_db') || { submissions: [], requests: [] };
      var existing = db.submissions.filter(function (s) { return s.idem_key === idemKey; })[0];
      var sub = existing || {
        submission_id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        idem_key: idemKey, received_at: new Date().toISOString(),
        contact: payload.contact, context: payload.context,
        delivery: { status: 'pending', attempts: 0, sf_lead_id: '', next_try_min: 0, log: [] }
      };
      if (!existing) db.submissions.push(sub);
      db.requests.push({ ts: new Date().toISOString(), idem_key: idemKey, submission_id: sub.submission_id, duplicate: !!existing });
      localStorage.setItem('gc_server_db', JSON.stringify(db));
      resolve({ submission_id: sub.submission_id, duplicate: !!existing });
    }, 700);
  });
}

pages.lead = function () {
  var form = $('#b2b-lead-form');
  var idsPromise = getGaIds(1500);   // запрашиваем заранее, ждём не дольше 1,5 с
  var idemKey = null;

  function buildContext(ids) {
    var first = readJSON(localStorage, 'gc_first_touch') || {}, sess = readJSON(sessionStorage, 'gc_session_touch') || {};
    var denied = consentDenied();
    return {
      site_id: SITE_ID, form_id: FORM_ID, site_language: SITE_LANGUAGE,
      ga_client_id: denied ? '' : ids.client_id, ga_session_id: denied ? '' : ids.session_id,
      ga_measurement_id: (window.SITE_CONFIG && SITE_CONFIG.GA4_ID) || '',
      first_landing_path: first.landing_path || '', session_landing_path: sess.landing_path || '',
      form_page_path: location.pathname, cta_origin_path: ctaOrigin(),
      first_utm: first.utm || { source: '', medium: '', campaign: '' }, submission_utm: sess.utm || { source: '', medium: '', campaign: '' },
      first_referrer: first.referrer || '', session_referrer: sess.referrer || '',
      consent_analytics: !denied, submitted_at: new Date().toISOString()
    };
  }
  function showPreview() {
    idsPromise.then(function (ids) { $('#hidden-preview').textContent = JSON.stringify(buildContext(ids), null, 2); });
  }
  $('#show-hidden').addEventListener('change', function () { showPreview(); $('#hidden-preview').hidden = !this.checked; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(form)) { window.dataLayer.push({ event: 'form_error', form_name: FORM_ID }); return; }
    if (!idemKey) idemKey = 'idem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var btn = form.querySelector('button[type=submit]'); btn.textContent = 'Отправка…';
    var contact = {};
    $all('input, select, textarea', form).forEach(function (i) { if (i.name) contact[i.name] = i.value.trim(); });
    idsPromise.then(function (ids) {
      var payload = { contact: contact, context: buildContext(ids) };
      return apiPostLead(payload, idemKey).then(function (res) { onSaved(res, payload.context); });
    });
  });

  function onSaved(res, ctx) {
    // Событие — только после ответа сервера и только один раз на submission_id
    var tracked = readJSON(localStorage, 'gc_tracked_submissions') || [];
    if (tracked.indexOf(res.submission_id) === -1) {
      window.dataLayer.push({
        event: 'lead_form_success', lead_submission_id: res.submission_id, form_id: FORM_ID,
        first_landing_path: ctx.first_landing_path, session_landing_path: ctx.session_landing_path,
        form_page_path: ctx.form_page_path, cta_origin_path: ctx.cta_origin_path, site_id: SITE_ID, site_language: SITE_LANGUAGE
      });
      tracked.push(res.submission_id);
      localStorage.setItem('gc_tracked_submissions', JSON.stringify(tracked));
    }
    sessionStorage.removeItem('gc_cta');
    var box = $('#b2b-lead-form') || $('#b2b-lead-success');
    if (box && box.id === 'b2b-lead-form') {
      box.outerHTML = '<div class="form-card" id="b2b-lead-success"><p class="success">✅ Заявка отправлена! Менеджер свяжется с вами.</p>' +
        '<p>🧪 Сервер сохранил заявку <b>' + res.submission_id + '</b>. ' +
        (ctx.ga_client_id ? 'GA client_id: <code>' + ctx.ga_client_id + '</code>' : '<b style="color:#b3403a">client_id пустой</b> — GA4 не ответил за 1,5 с (не загрузился, блокировщик или отказ от cookie). Заявка всё равно сохранена — так и должно быть.') +
        '</p><p class="dup-note" id="dup-note"></p><p><a class="btn" href="lab/">Открыть Лабораторию →</a></p></div>';
    } else if (res.duplicate && $('#dup-note')) {
      $('#dup-note').textContent = '↺ Повторный запрос с тем же ключом: сервер вернул тот же номер ' + res.submission_id + ', дубль не создан.';
    }
  }
};

/* ---------- validation ---------- */
function validate(form) {
  var ok = true;
  $all('[required]', form).forEach(function (input) {
    var field = input.closest('.field'); if (!field) return;
    var valid = input.value.trim() !== '' && (input.type !== 'email' || /^\S+@\S+\.\S+$/.test(input.value));
    field.classList.toggle('has-error', !valid);
    if (!valid) ok = false;
  });
  return ok;
}

/* ---------- dataLayer debug panel ---------- */
function initDebugPanel() {
  if (window.SITE_CONFIG && SITE_CONFIG.SHOW_DEBUG_PANEL === false) return;
  var saved = localStorage.getItem('gc_dl_collapsed');
  var collapsed = saved === null ? window.innerWidth < 760 : saved === '1';
  var panel = document.createElement('div');
  panel.className = 'dl-panel' + (collapsed ? ' collapsed' : '');
  panel.innerHTML = '<div class="dl-head"><span>🧪 dataLayer (<i id="dl-n">0</i>)</span><button id="dl-toggle">' + (collapsed ? 'показать' : 'скрыть') + '</button></div><div class="dl-body" id="dl-body"></div>';
  document.body.appendChild(panel);
  var body = $('#dl-body'), shown = 0;
  $('#dl-toggle').onclick = function () {
    collapsed = !collapsed; panel.classList.toggle('collapsed', collapsed);
    this.textContent = collapsed ? 'показать' : 'скрыть';
    localStorage.setItem('gc_dl_collapsed', collapsed ? '1' : '0');
  };
  function tick() {
    var dl = window.dataLayer;
    while (shown < dl.length) {
      var entry = dl[shown++];
      var isArgs = entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.length === 'number' && entry[0] !== undefined;
      var name = isArgs ? 'gtag: ' + entry[0] : (entry && entry.event) || '(данные без event)';
      var json; try { json = JSON.stringify(isArgs ? Array.prototype.slice.call(entry) : entry, function (k, v) { return v instanceof Element ? '[DOM]' : v; }, 2); } catch (e) { json = String(entry); }
      var div = document.createElement('div'); div.className = 'dl-item';
      div.innerHTML = '<b></b><pre></pre>';
      div.querySelector('b').textContent = shown + '. ' + name;
      div.querySelector('pre').textContent = json;
      body.insertBefore(div, body.firstChild);
    }
    $('#dl-n').textContent = dl.length;
  }
  tick(); setInterval(tick, 400);
}

/* ---------- cookie banner ---------- */
// Выбор хранится в cookie gc_consent_analytics и gc_consent_marketing (granted/denied), 180 дней.
// При выборе в dataLayer уходит событие cookie_consent_update.
function setCookie(name, value, days) {
  document.cookie = name + '=' + value + '; max-age=' + days * 86400 + '; path=/; SameSite=Lax';
}
function readConsentCookie(name) {
  var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
  return m ? m[1] : null;
}
function initConsentBanner() {
  var mode = (window.SITE_CONFIG && SITE_CONFIG.CONSENT_MODE) || 'gtm';
  var link = $('#cookie-settings-link');
  if (mode === 'off') { if (link) link.style.display = 'none'; return; }

  var banner = document.createElement('div');
  banner.className = 'consent-banner';
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Настройки cookie');
  banner.innerHTML =
    '<h3>🍪 Мы используем cookie</h3>' +
    '<p>Нужны, чтобы сайт работал, а ещё — чтобы считать посещения и показывать рекламу. Выбери, что разрешить.</p>' +
    '<div class="consent-options" hidden>' +
      '<label class="consent-option"><input type="checkbox" checked disabled><span><b>Необходимые</b><small>Корзина и вход. Всегда включены.</small></span></label>' +
      '<label class="consent-option"><input type="checkbox" id="consent-analytics"><span><b>Аналитика</b><small>Google Analytics · analytics_storage</small></span></label>' +
      '<label class="consent-option"><input type="checkbox" id="consent-marketing"><span><b>Маркетинг</b><small>Реклама · ad_storage, ad_user_data, ad_personalization</small></span></label>' +
    '</div>' +
    '<div class="consent-buttons">' +
      '<button class="btn btn-small" id="consent-accept-all">Принять все</button>' +
      '<button class="btn btn-small btn-outline" id="consent-reject-all">Отклонить все</button>' +
      '<button class="btn btn-small btn-ghost" id="consent-customize">Настроить</button>' +
      '<button class="btn btn-small" id="consent-save" hidden>Сохранить выбор</button>' +
    '</div>';
  document.body.appendChild(banner);

  var options = $('.consent-options', banner);
  function open(source) {
    $('#consent-analytics').checked = readConsentCookie('gc_consent_analytics') === 'granted';
    $('#consent-marketing').checked = readConsentCookie('gc_consent_marketing') === 'granted';
    banner.classList.add('show');
    document.body.classList.add('consent-open');
    window.dataLayer.push({ event: 'cookie_banner_view', banner_source: source });
  }
  function close() {
    banner.classList.remove('show');
    document.body.classList.remove('consent-open');
    options.hidden = true; $('#consent-save').hidden = true; $('#consent-customize').hidden = false;
  }
  function save(analytics, marketing, action) {
    var a = analytics ? 'granted' : 'denied', m = marketing ? 'granted' : 'denied';
    setCookie('gc_consent_analytics', a, 180);
    setCookie('gc_consent_marketing', m, 180);
    if (mode === 'code' && window.gtag) {
      gtag('consent', 'update', { analytics_storage: a, ad_storage: m, ad_user_data: m, ad_personalization: m });
    }
    window.dataLayer.push({
      event: 'cookie_consent_update',
      consent_action: action,          // accept_all / reject_all / custom
      consent_analytics: a,
      consent_marketing: m
    });
    close();
    toast('Настройки cookie сохранены');
  }

  $('#consent-accept-all').onclick = function () { save(true, true, 'accept_all'); };
  $('#consent-reject-all').onclick = function () { save(false, false, 'reject_all'); };
  $('#consent-customize').onclick = function () {
    options.hidden = false; this.hidden = true; $('#consent-save').hidden = false;
  };
  $('#consent-save').onclick = function () {
    save($('#consent-analytics').checked, $('#consent-marketing').checked, 'custom');
  };
  if (link) link.addEventListener('click', function (e) { e.preventDefault(); open('footer_link'); });

  if (!readConsentCookie('gc_consent_analytics')) open('first_visit');
}

/* ---------- start ---------- */
document.addEventListener('DOMContentLoaded', function () {
  captureTouches();
  renderLayout();
  var page = document.body.dataset.page;
  if (pages[page]) pages[page]();
  initConsentBanner();
  initDebugPanel();
});
