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

/* ---------- B2B lead form (→ Salesforce Web-to-Lead, симуляция) ---------- */
// Метки кампании запоминаем при входе на сайт (на время сессии), чтобы они дожили до формы
function captureAttribution() {
  var q = new URLSearchParams(location.search);
  if (q.get('utm_source') || q.get('gclid')) {
    sessionStorage.setItem('gc_attribution', JSON.stringify({
      utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '',
      utm_campaign: q.get('utm_campaign') || '', gclid: q.get('gclid') || ''
    }));
  }
}
function getAttribution() {
  try { return JSON.parse(sessionStorage.getItem('gc_attribution')) || {}; } catch (e) { return {}; }
}
// client_id из cookie _ga: "GA1.1.1234567890.1730000000" → "1234567890.1730000000"
function getGaClientId() {
  var m = document.cookie.match(/(?:^|; )_ga=([^;]*)/);
  if (!m) return '';
  var parts = m[1].split('.');
  return parts.length >= 4 ? parts[2] + '.' + parts[3] : '';
}
// session_id из cookie _ga_<ID потока>: "GS1.1.1730712345.3..." или "GS2.1.s1730712345$o3$..."
function getGaSessionId() {
  var id = ((window.SITE_CONFIG && SITE_CONFIG.GA4_ID) || '').replace(/^G-/, '');
  var re = id ? new RegExp('(?:^|; )_ga_' + id + '=([^;]*)') : /(?:^|; )_ga_[A-Z0-9]+=([^;]*)/;
  var m = document.cookie.match(re);
  if (!m) return '';
  var v = decodeURIComponent(m[1]);
  var gs2 = v.match(/^GS2\.\d+\.s(\d+)/);
  if (gs2) return gs2[1];
  var parts = v.split('.');
  return parts.length >= 3 ? parts[2] : '';
}

pages.lead = function () {
  var form = $('#b2b-lead-form');
  function fillHidden() {
    var a = getAttribution();
    $('#ga_client_id').value = getGaClientId();
    $('#ga_session_id').value = getGaSessionId();
    $('#gclid').value = a.gclid || '';
    $('#utm_source').value = a.utm_source || '';
    $('#utm_medium').value = a.utm_medium || '';
    $('#utm_campaign').value = a.utm_campaign || '';
    $('#hidden-preview').innerHTML = $all('input[type=hidden]', form).map(function (i) {
      return '<div><code>' + i.name + '</code> = <b>' + (i.value || '<span style="color:#b3403a">(пусто)</span>') + '</b></div>';
    }).join('');
  }
  fillHidden();
  $('#show-hidden').addEventListener('change', function () { fillHidden(); $('#hidden-preview').hidden = !this.checked; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(form)) { window.dataLayer.push({ event: 'form_error', form_name: 'b2b_wholesale' }); return; }
    fillHidden();   // cookie GA могли появиться позже загрузки страницы — читаем в момент отправки
    var data = {};
    $all('input, select, textarea', form).forEach(function (i) { if (i.name) data[i.name] = i.value.trim(); });
    data.web_id = 'W-' + Date.now().toString(36).toUpperCase();
    data.submitted_at = new Date().toISOString();
    data.page = location.pathname;

    // «Отправка» в Salesforce Web-to-Lead (симуляция: складываем в localStorage, лаборатория их заберёт)
    var outbox = []; try { outbox = JSON.parse(localStorage.getItem('gc_sf_outbox')) || []; } catch (err) {}
    outbox.push(data);
    localStorage.setItem('gc_sf_outbox', JSON.stringify(outbox));

    window.dataLayer.push({
      event: 'generate_lead', form_name: 'b2b_wholesale', lead_source: 'website',
      value: +data.budget, currency: CURRENCY
    });
    form.outerHTML = '<div class="form-card" id="b2b-lead-success"><p class="success">✅ Заявка отправлена! Менеджер свяжется с вами.</p>' +
      '<p>🧪 Учебная заявка <b>' + data.web_id + '</b> ушла в «Salesforce». ' +
      (data.ga_client_id ? 'GA client_id: <code>' + data.ga_client_id + '</code>' :
        '<b style="color:#b3403a">client_id пустой</b> — cookie _ga не найдена (GA4 не загрузился, блокировщик рекламы или отказ от cookie).') +
      '</p><p><a class="btn" href="lab/">Открыть Лабораторию →</a></p></div>';
  });
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
  captureAttribution();
  renderLayout();
  var page = document.body.dataset.page;
  if (pages[page]) pages[page]();
  initConsentBanner();
  initDebugPanel();
});
