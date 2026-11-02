/* =========================================================
   НАСТРОЙКИ — меняй только здесь
   ========================================================= */
var SITE_CONFIG = {
  GTM_ID: 'GTM-NQSBNR2L',   // ← вставь сюда ID своего контейнера GTM
  // GA4 напрямую (gtag.js). Работает ТОЛЬКО пока GTM_ID не задан —
  // как только впишешь GTM-ID, этот код отключится и GA4 нужно будет настроить тегом в GTM
  GA4_ID: 'G-EK6764V55Q',
  CURRENCY: 'USD',
  SHOW_DEBUG_PANEL: true   // панель с событиями dataLayer внизу справа
};

/* =========================================================
   1) Данные страницы в dataLayer ДО загрузки GTM
   2) Стандартный сниппет Google Tag Manager
   ========================================================= */
(function () {
  window.dataLayer = window.dataLayer || [];

  var script = document.currentScript;
  var pageType = (script && script.dataset.page) || 'other';
  var user = null;
  try { user = JSON.parse(localStorage.getItem('gc_user')); } catch (e) {}

  window.dataLayer.push({
    page_type: pageType,
    user_status: user ? 'logged_in' : 'guest',
    user_id: user ? user.id : undefined
  });

  var id = SITE_CONFIG.GTM_ID;
  if (!id || id.indexOf('XXXX') !== -1) {
    console.warn('[GTM] ID контейнера не задан — открой js/gtm.js и впиши свой GTM-ID');
    // Временный режим: GA4 через gtag.js (официальный код Google tag)
    if (SITE_CONFIG.GA4_ID) {
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + SITE_CONFIG.GA4_ID;
      document.head.appendChild(g);
      window.gtag = function () { window.dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', SITE_CONFIG.GA4_ID);
    }
    return;
  }

  // Официальный код GTM (часть <head>)
  (function (w, d, s, l, i) {
    w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', id);
})();
