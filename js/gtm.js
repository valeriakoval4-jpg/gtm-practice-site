/* =========================================================
   НАСТРОЙКИ — меняй только здесь
   ========================================================= */
var SITE_CONFIG = {
  GTM_ID: 'GTM-NQSBNR2L',   // ← вставь сюда ID своего контейнера GTM
  // GA4 напрямую (gtag.js). Работает ТОЛЬКО пока GTM_ID не задан —
  // как только впишешь GTM-ID, этот код отключится и GA4 нужно будет настроить тегом в GTM
  GA4_ID: 'G-EK6764V55Q',
  CURRENCY: 'USD',
  SHOW_DEBUG_PANEL: true,  // панель с событиями dataLayer внизу справа

  // Cookie-баннер и Consent Mode:
  //  'gtm'  — сайт только показывает баннер, сохраняет выбор в cookie и пишет его в dataLayer.
  //           Consent Mode (default/update) настраиваешь сама в GTM. ← режим для тренировки
  //  'code' — сайт сам отправляет gtag('consent', 'default'/'update') — «готовое решение от разработчика»
  //  'off'  — баннер не показывается
  CONSENT_MODE: 'gtm'
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

  // Сохранённый выбор посетителя (cookie gc_consent_analytics / gc_consent_marketing)
  function readCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
  }
  var consentAnalytics = readCookie('gc_consent_analytics') || 'unknown';   // granted / denied / unknown
  var consentMarketing = readCookie('gc_consent_marketing') || 'unknown';

  // Режим 'code': сайт сам задаёт Consent Mode до загрузки GTM
  if (SITE_CONFIG.CONSENT_MODE === 'code') {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', {
      analytics_storage: consentAnalytics === 'granted' ? 'granted' : 'denied',
      ad_storage: consentMarketing === 'granted' ? 'granted' : 'denied',
      ad_user_data: consentMarketing === 'granted' ? 'granted' : 'denied',
      ad_personalization: consentMarketing === 'granted' ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500
    });
  }

  window.dataLayer.push({
    page_type: pageType,
    user_status: user ? 'logged_in' : 'guest',
    user_id: user ? user.id : undefined,
    consent_analytics: consentAnalytics,
    consent_marketing: consentMarketing
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
