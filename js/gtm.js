/* =========================================================
   НАСТРОЙКИ — меняй только здесь
   ========================================================= */
var SITE_CONFIG = {
  GTM_ID: 'GTM-XXXXXXX',   // ← вставь сюда ID своего контейнера GTM
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
    return;
  }

  // Официальный код GTM (часть <head>)
  (function (w, d, s, l, i) {
    w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', id);
})();
