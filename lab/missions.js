/* =========================================================
   Лаборатория GA4 ⇄ Salesforce — миссии и интерфейс
   ========================================================= */
var M = {};          // обработчики, вызываемые из разметки
var flash = {};      // временные сообщения {missionId: html}

function $(id) { return document.getElementById(id); }
function val(id) { var el = $(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }

/* ---------- общие компоненты ---------- */
function frame(kind, crumbs, inner) {
  var heads = {
    ga: '<span class="fr-logo ga">📊</span><b>Аналитика</b><span class="fr-tag">симулятор GA4</span>',
    sf: '<span class="fr-logo sf">☁️</span><b>Setup</b><span class="fr-tag">симулятор Salesforce</span>',
    flow: '<span class="fr-logo sf">⚡</span><b>Flow Builder</b><span class="fr-tag">симулятор Salesforce</span>',
    site: '<span class="fr-logo site">🌱</span><b>Green Corner</b><span class="fr-tag">учебный сайт</span>'
  };
  return '<div class="frame frame-' + kind + '"><div class="fr-head">' + heads[kind] + '</div>' +
    (crumbs ? '<div class="fr-crumbs">' + crumbs.map(esc).join(' <span>›</span> ') + '</div>' : '') +
    '<div class="fr-body">' + inner + '</div></div>';
}
function quiz(id, q, options, correct, explain) {
  var chosen = S.quiz[id];
  return '<div class="quiz"><div class="quiz-q">❓ ' + q + '</div>' + options.map(function (o, i) {
    var cls = chosen === undefined ? '' : i === correct ? ' right' : i === chosen ? ' wrong' : '';
    return '<button class="quiz-opt' + cls + '" onclick="M.answer(\'' + id + '\',' + i + ')">' + o + '</button>';
  }).join('') + (chosen !== undefined ? '<div class="quiz-exp ' + (chosen === correct ? 'ok' : 'bad') + '">' + (chosen === correct ? '✅ Верно. ' : '❌ Не совсем. ') + explain + '</div>' : '') + '</div>';
}
M.answer = function (id, i) { S.quiz[id] = i; saveState(); render(); };
function hint(html) { return '<details class="hint"><summary>💡 Подсказка</summary><div>' + html + '</div></details>'; }
function codeBlock(text) { return '<pre class="code">' + esc(text) + '</pre>'; }
function feedback(res) {
  if (!res) return '';
  return '<div class="feedback ' + (res.ok ? 'ok' : 'bad') + '">' + (res.ok ? '✅ ' : '') + res.msgs.map(function (m) { return '<div>' + m + '</div>'; }).join('') + '</div>';
}
function resourceList() {
  return '<datalist id="resources">' + flowResources().map(function (r) { return '<option value="' + esc(r) + '">'; }).join('') + '</datalist>';
}

/* =========================================================
   МИССИИ
   ========================================================= */
var MISSIONS = [];

/* ---------- 0. Брифинг ---------- */
MISSIONS.push({
  id: 'brief', title: 'Брифинг', icon: '📋',
  render: function () {
    return '<p class="lead">Ты — веб-аналитик в Green Corner. У компании появился B2B-отдел: офисы заказывают озеленение через форму «Для бизнеса».</p>' +
      '<div class="callout"><b>Проблема:</b> в GA4 видно, какие кампании приносят <i>заявки</i> (generate_lead). Но половина заявок — мусор. ' +
      'Отдел продаж квалифицирует лиды в Salesforce, и маркетинг хочет видеть в GA4, какие кампании приносят <b>квалифицированные</b> лиды и сделки.</div>' +
      '<h3>Цепочка, которую ты построишь</h3>' +
      '<div class="chain">' +
      chainStep('🌐', 'Сайт', 'Форма + скрытые поля: GA client_id, session_id, UTM, gclid') +
      chainStep('🏷', 'GTM → GA4', 'событие generate_lead') +
      chainStep('☁️', 'Salesforce', 'Web-to-Lead создаёт Лид с этими полями') +
      chainStep('👩‍💼', 'Менеджер', 'меняет статус: Квалифицирован / Не квалифицирован / Конвертирован') +
      chainStep('⚡', 'Flow', 'ловит смену статуса и делает HTTP-запрос') +
      chainStep('📮', 'Measurement Protocol', 'POST /mp/collect с тем же client_id') +
      chainStep('📊', 'GA4', 'qualify_lead, close_convert_lead → отчёт по кампаниям') +
      '</div>' +
      '<h3>Почему именно так</h3><ul>' +
      '<li><b>client_id</b> — «ключ», который связывает посетителя сайта и запись в CRM. Без него GA4 не поймёт, чей это лид.</li>' +
      '<li><b>session_id</b> — привязывает событие к сессии, а значит к её источнику/кампании.</li>' +
      '<li><b>Measurement Protocol</b> — способ отправить событие в GA4 с сервера (из Salesforce), а не из браузера.</li>' +
      '<li>События <code>working_lead</code>, <code>qualify_lead</code>, <code>disqualify_lead</code>, <code>close_convert_lead</code> — рекомендованные Google события для лидогенерации.</li></ul>' +
      '<div class="callout soft">🧪 Всё, что ты настраиваешь в «админках», сохраняется в браузере. Ошибки допускаются — на этапе тестов они проявятся так же, как в реальной жизни, и их нужно будет найти и починить.</div>' +
      '<p><button class="btn" onclick="M.go(\'site\')">Начать миссию 1 →</button></p>';
  },
  check: function () { return { ok: true, msgs: [] }; }
});
function chainStep(icon, t, d) { return '<div class="chain-step"><div class="chain-icon">' + icon + '</div><b>' + t + '</b><small>' + d + '</small></div>'; }

/* ---------- 1. Сайт ---------- */
MISSIONS.push({
  id: 'site', title: 'Сайт: форма и скрытые поля', icon: '🌐', app: 'site',
  render: function () {
    var out = getOutbox();
    var testUrl = '../lead.html?utm_source=google&utm_medium=cpc&utm_campaign=b2b_autumn&gclid=TeSt-GCLID-123';
    return '<p>На сайте есть форма <b>«Для бизнеса»</b>. При отправке скрипт читает cookie GA4 и метки кампании и кладёт их в скрытые поля формы. Всё это уходит в Salesforce вместе с заявкой.</p>' +
      '<ol class="task"><li>Открой форму по ссылке с метками кампании: <a href="' + testUrl + '" target="_blank">lead.html?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=b2b_autumn&amp;gclid=…</a></li>' +
      '<li>Включи «🛠 Показать скрытые поля» и посмотри, что заполнилось.</li>' +
      '<li>Отправь заявку. Сделай 2–3 заявки с разными метками (поменяй <code>utm_source</code> в адресе на <code>facebook</code>, <code>newsletter</code>…) — пригодится для отчёта.</li>' +
      '<li>Вернись сюда — заявки появятся в таблице ниже.</li></ol>' +
      frame('site', ['Исходящие заявки (Web-to-Lead)'],
        out.length ? '<div class="table-wrap"><table class="tbl"><tr><th>Заявка</th><th>Контакт</th><th>ga_client_id</th><th>ga_session_id</th><th>UTM</th><th>gclid</th></tr>' +
          out.map(function (w) {
            return '<tr><td>' + esc(w.web_id) + (w.simulated ? ' <span class="pill">симуляция</span>' : '') + '</td><td>' + esc(w.first_name + ' ' + w.last_name) + '<br><small>' + esc(w.company) + '</small></td>' +
              '<td>' + (w.ga_client_id ? '<code>' + esc(w.ga_client_id) + '</code>' : '<span class="bad-text">пусто</span>') + '</td>' +
              '<td>' + (w.ga_session_id ? '<code>' + esc(w.ga_session_id) + '</code>' : '<span class="bad-text">пусто</span>') + '</td>' +
              '<td>' + esc([w.utm_source, w.utm_medium, w.utm_campaign].filter(Boolean).join(' / ') || '—') + '</td><td>' + esc(w.gclid || '—') + '</td></tr>';
          }).join('') + '</table></div>'
          : '<p class="empty-note">Заявок пока нет. Отправь форму на сайте и обнови эту страницу.</p>') +
      '<p class="small">Нет cookie <code>_ga</code> (блокировщик рекламы, отказ в cookie-баннере)? Тогда client_id будет пустым — это реальная ситуация. Для тренировки можно ' +
      '<button class="link-btn" onclick="M.fakeSubmission()">создать заявку-симуляцию с тестовым client_id</button>.</p>' +
      '<div class="callout soft"><b>Задание со звёздочкой (в настоящем GTM):</b> сайт отправляет в dataLayer <code>generate_lead</code> с параметрами <code>form_name</code>, <code>lead_source</code>, <code>value</code>, <code>currency</code>. ' +
      'Сделай тег «Событие GA4» на специальное событие <code>generate_lead</code> и передай эти параметры — это верхняя ступень воронки.</div>' +
      quiz('q_site', 'Почему client_id берём из cookie <code>_ga</code>, а не генерируем свой ID в форме?', [
        'Свой ID длиннее и не влезет в поле Salesforce',
        'GA4 знает посетителя только по своему client_id — событие с «чужим» ID станет новым пользователем без источника',
        'Так требует GDPR'], 1,
        'Measurement Protocol склеивает серверное событие с историей посетителя по client_id из cookie <code>_ga</code> (часть после «GA1.1.»).');
  },
  check: function () {
    var out = getOutbox();
    if (!out.length) return { ok: false, msgs: ['Пока нет ни одной заявки с сайта.'] };
    if (!out.some(function (w) { return w.ga_client_id; })) return { ok: false, msgs: ['Заявки есть, но ни в одной нет client_id. Проверь, что GA4 загружается на сайте (Google tag в GTM опубликован), или создай заявку-симуляцию.'] };
    return { ok: true, msgs: ['Заявки с client_id есть — посетителя можно будет «узнать» в GA4.'] };
  }
});
M.fakeSubmission = function () {
  var out = getOutbox();
  var sources = [['google', 'cpc', 'b2b_autumn'], ['facebook', 'paid_social', 'office_green'], ['newsletter', 'email', 'nov_digest']];
  var s = sources[out.length % sources.length];
  out.push({
    first_name: 'Тест', last_name: 'Симуляция ' + (out.length + 1), email: 'test' + (out.length + 1) + '@company.example', phone: '+1 000 555-0' + (10 + out.length),
    company: 'ООО «Тест ' + (out.length + 1) + '»', budget: ['2000', '5000', '10000'][out.length % 3], description: 'Создано симулятором',
    ga_client_id: Math.floor(1e9 + Math.random() * 8e9) + '.' + Math.floor(Date.now() / 1000), ga_session_id: String(Math.floor(Date.now() / 1000) - 120),
    gclid: s[0] === 'google' ? 'Sim-GCLID-' + rnd(8) : '', utm_source: s[0], utm_medium: s[1], utm_campaign: s[2],
    web_id: 'W-SIM' + rnd(5, '0123456789'), submitted_at: nowIso(), page: '/lead.html', simulated: true
  });
  localStorage.setItem('gc_sf_outbox', JSON.stringify(out));
  render();
};

/* ---------- 2. GA4: секрет Measurement Protocol ---------- */
MISSIONS.push({
  id: 'gasecret', title: 'GA4: секрет Measurement Protocol', icon: '🔑', app: 'ga',
  render: function () {
    var g = S.ga;
    var inner = '<div class="ga-stream"><div><small>ID потока данных</small><b>' + GA_PROPERTY_MID + '</b></div><div><small>Название потока</small><b>Green Corner (веб)</b></div><div><small>URL</small><b>valeriakoval4-jpg.github.io</b></div></div>' +
      (!g.ackTerms ? '<div class="ga-banner">Чтобы создать секретный ключ, нужно подтвердить условия сбора данных пользователей. ' +
        '<label class="chk"><input type="checkbox" id="ack"> Я подтверждаю, что на сайте есть уведомление о сборе данных и согласие посетителей, где это требуется</label>' +
        '<button class="ga-btn" onclick="M.ack()">Подтвердить</button></div>' : '<div class="ga-ok">✓ Условия сбора данных пользователей подтверждены</div>') +
      '<table class="tbl ga"><tr><th>Псевдоним</th><th>Значение секретного ключа</th></tr>' +
      (g.secrets.length ? g.secrets.map(function (s) { return '<tr><td>' + esc(s.nickname) + (s.real ? ' <span class="pill">настоящий</span>' : '') + '</td><td><code>' + esc(s.value) + '</code></td></tr>'; }).join('')
        : '<tr><td colspan="2" class="empty-note">Нет секретных ключей</td></tr>') + '</table>' +
      '<div class="inline-form"><input id="secret-nick" placeholder="Псевдоним, например salesforce_flow"' + (g.ackTerms ? '' : ' disabled') + '>' +
      '<button class="ga-btn primary" onclick="M.createSecret()"' + (g.ackTerms ? '' : ' disabled') + '>Создать</button></div>';
    return '<p>Measurement Protocol принимает события только с секретным ключом (<code>api_secret</code>) — так GA4 понимает, что запрос пришёл от тебя.</p>' +
      '<ol class="task"><li>Подтверди условия сбора данных пользователей.</li><li>Создай секретный ключ с понятным псевдонимом — по нему через год будет ясно, кто им пользуется.</li><li>Скопируй значение — оно понадобится в Salesforce (миссия 6).</li></ol>' +
      '<p class="small">В настоящем GA4: <b>Администратор → Сбор и изменение данных → Потоки данных → твой поток → Секретные ключи Measurement Protocol → Создать</b>.</p>' +
      frame('ga', ['Администратор', 'Сбор и изменение данных', 'Потоки данных', 'Green Corner (веб)', 'Секретные ключи Measurement Protocol'], inner) +
      '<details class="hint"><summary>🚀 Режим «по-настоящему» (необязательно)</summary><div>' +
      '<p>Можешь создать секрет в своём настоящем GA4 и вставить его сюда. Тогда в миссии 8 события, которые «примет» симулятор, будут дополнительно отправлены в твой реальный GA4 — и ты увидишь их в отчёте «В режиме реального времени».</p>' +
      '<div class="inline-form"><input id="real-secret" placeholder="Значение настоящего секретного ключа"><button class="ga-btn primary" onclick="M.addRealSecret()">Добавить</button></div>' +
      '<p class="small">⚠️ Ключ хранится только в твоём браузере (localStorage). В настоящей интеграции секрет нельзя светить в коде сайта — он живёт в Salesforce.</p></div></details>' +
      quiz('q_secret', 'Где в реальной интеграции должен храниться api_secret?', [
        'В коде сайта, рядом с GTM', 'В Salesforce (Custom Metadata / Named Credential) — на сервере, недоступно посетителям', 'В параметрах UTM'], 1,
        'Секрет даёт право записывать данные в твой GA4. Если он окажется в браузере, кто угодно сможет засорить статистику.');
  },
  check: function () {
    if (!S.ga.ackTerms) return { ok: false, msgs: ['Сначала подтверди условия сбора данных пользователей.'] };
    if (!S.ga.secrets.length) return { ok: false, msgs: ['Секретный ключ ещё не создан.'] };
    return { ok: true, msgs: ['Секрет создан: <code>' + esc(S.ga.secrets[S.ga.secrets.length - 1].value) + '</code>'] };
  }
});
M.ack = function () { if (!val('ack')) { alert('Поставь галочку подтверждения.'); return; } S.ga.ackTerms = true; saveState(); render(); };
M.createSecret = function () {
  var nick = val('secret-nick').trim();
  if (!nick) { alert('Укажи псевдоним ключа.'); return; }
  S.ga.secrets.push({ nickname: nick, value: rnd(22, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), real: false });
  saveState(); render();
};
M.addRealSecret = function () {
  var v = val('real-secret').trim();
  if (v.length < 10) { alert('Похоже, это не секретный ключ.'); return; }
  S.ga.secrets.push({ nickname: 'real_ga4', value: v, real: true });
  S.ga.ackTerms = true; S.ga.realSend = true; saveState(); render();
};

/* ---------- 3. GA4: ключевые события и параметры ---------- */
var KEY_EVENT_INFO = {
  page_view: 'Просмотр страницы', scroll: 'Прокрутка', generate_lead: 'Заявка на сайте', working_lead: 'Лид взят в работу',
  qualify_lead: 'Лид квалифицирован', disqualify_lead: 'Лид отклонён', close_convert_lead: 'Лид стал клиентом/сделкой'
};
MISSIONS.push({
  id: 'gaevents', title: 'GA4: ключевые события и параметры', icon: '⭐', app: 'ga',
  render: function () {
    var g = S.ga;
    var ev = '<table class="tbl ga"><tr><th>Название события</th><th>Что значит</th><th>Ключевое событие</th></tr>' +
      Object.keys(g.keyEvents).map(function (k) {
        return '<tr><td><code>' + k + '</code></td><td>' + KEY_EVENT_INFO[k] + '</td><td><label class="switch"><input type="checkbox" onchange="M.toggleKey(\'' + k + '\', this.checked)"' + (g.keyEvents[k] ? ' checked' : '') + '><span></span></label></td></tr>';
      }).join('') + '</table>';
    var dims = '<table class="tbl ga"><tr><th>Название параметра</th><th>Область</th><th>Параметр события</th><th></th></tr>' +
      (g.dims.length ? g.dims.map(function (d, i) {
        return '<tr><td>' + esc(d.name) + '</td><td>' + (d.scope === 'event' ? 'Событие' : 'Пользователь') + '</td><td><code>' + esc(d.param) + '</code></td><td><button class="link-btn" onclick="M.delDim(' + i + ')">Архивировать</button></td></tr>';
      }).join('') : '<tr><td colspan="4" class="empty-note">Нет специальных параметров</td></tr>') + '</table>' +
      '<div class="inline-form wrap"><input id="dim-name" placeholder="Название, напр. Источник лида"><select id="dim-scope"><option value="event">Событие</option><option value="user">Пользователь</option></select>' +
      '<input id="dim-param" placeholder="Параметр события, напр. lead_source"><button class="ga-btn primary" onclick="M.addDim()">Сохранить</button></div>';
    return '<p>Теперь подготовим GA4 к приёму событий из Salesforce. Flow будет отправлять события с параметрами:</p>' +
      codeBlock('qualify_lead / disqualify_lead / close_convert_lead\n  session_id, engagement_time_msec, lead_id, lead_source, value, currency') +
      '<ol class="task"><li>Отметь как <b>ключевые события</b> те, что означают ценность для бизнеса.</li>' +
      '<li>Зарегистрируй <b>специальные параметры</b> — только те, по которым будешь строить отчёты. Стандартные параметры (value, currency, session_id…) регистрировать не нужно.</li></ol>' +
      '<p class="small">В настоящем GA4: ключевые события — <b>Администратор → Отображение данных → Ключевые события → Новое ключевое событие</b> (можно заранее, до первого события). Параметры — <b>Администратор → Отображение данных → Специальные определения</b>.</p>' +
      frame('ga', ['Администратор', 'Отображение данных', 'События'], ev) +
      frame('ga', ['Администратор', 'Отображение данных', 'Специальные определения'], dims) +
      hint('Ключевые: квалифицированный лид и сделка. Отказ (disqualify) и «в работе» — не успех. ' +
        'Параметр <code>lead_id</code> — уникальный для каждого лида: высокая кардинальность, отчёты свалятся в «(other)». Для поиска конкретного лида используют выгрузку/BigQuery, а не специальный параметр.');
  },
  check: function () {
    var k = S.ga.keyEvents, msgs = [];
    if (!k.qualify_lead) msgs.push('<code>qualify_lead</code> должен быть ключевым событием — это главное, ради чего всё делается.');
    if (!k.close_convert_lead) msgs.push('<code>close_convert_lead</code> (сделка) тоже стоит отметить ключевым.');
    if (k.disqualify_lead) msgs.push('<code>disqualify_lead</code> — это отказ. Если сделать его ключевым, «конверсии» будут расти от плохих лидов.');
    if (k.working_lead) msgs.push('<code>working_lead</code> — промежуточный статус, не результат. Не делай его ключевым.');
    if (k.page_view || k.scroll) msgs.push('page_view / scroll как ключевые события размоют конверсии.');
    var d = S.ga.dims;
    if (!d.some(function (x) { return x.param === 'lead_source' && x.scope === 'event'; })) msgs.push('Зарегистрируй параметр события <code>lead_source</code> (область «Событие»).');
    if (d.some(function (x) { return x.param === 'lead_id' || x.param === 'client_id'; })) msgs.push('Параметр с уникальным ID (lead_id / client_id) лучше не регистрировать: высокая кардинальность → «(other)» в отчётах.');
    if (d.some(function (x) { return ['value', 'currency', 'session_id', 'engagement_time_msec'].indexOf(x.param) !== -1; })) msgs.push('value, currency, session_id, engagement_time_msec — встроенные параметры GA4, их регистрировать не нужно.');
    if (d.some(function (x) { return x.param === 'lead_source' && x.scope === 'user'; })) msgs.push('lead_source — свойство конкретного события, а не пользователя: область «Событие».');
    return msgs.length ? { ok: false, msgs: msgs } : { ok: true, msgs: ['GA4 готов: ключевые события и параметр lead_source настроены.'] };
  }
});
M.toggleKey = function (k, on) { S.ga.keyEvents[k] = on; saveState(); render(); };
M.addDim = function () {
  var n = val('dim-name').trim(), p = val('dim-param').trim();
  if (!n || !p) { alert('Заполни название и параметр.'); return; }
  S.ga.dims.push({ name: n, scope: val('dim-scope'), param: p }); saveState(); render();
};
M.delDim = function (i) { S.ga.dims.splice(i, 1); saveState(); render(); };

/* ---------- 4. Salesforce: поля Лида ---------- */
var fieldWizard = null;
MISSIONS.push({
  id: 'sffields', title: 'Salesforce: поля Лида', icon: '🧩', app: 'sf',
  render: function () {
    var list = '<div class="sf-toolbar"><b>Поля и связи</b><span>' + allLeadFields().length + ' элементов</span><button class="sf-btn" onclick="M.newField()">Создать</button></div>' +
      '<table class="tbl sf"><tr><th>Метка поля</th><th>Имя поля (API)</th><th>Тип данных</th></tr>' +
      allLeadFields().map(function (f) {
        return '<tr><td>' + esc(f.label) + '</td><td><code>' + esc(f.api) + '</code></td><td>' + esc(f.type) + (f.length ? '(' + f.length + ')' : '') +
          (!f.std && !f.preset ? ' <button class="link-btn" onclick="M.delField(\'' + f.api + '\')">Удалить</button>' : '') + '</td></tr>';
      }).join('') + '</table>';
    var wiz = '';
    if (fieldWizard) {
      wiz = '<div class="sf-modal"><h4>Новое настраиваемое поле</h4>' +
        '<div class="sf-row"><label>Тип данных</label><select id="fw-type">' + ['Text', 'Number', 'Date', 'Checkbox', 'Picklist', 'URL'].map(function (t) { return '<option' + (fieldWizard.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
        '<div class="sf-row"><label>Метка поля</label><input id="fw-label" placeholder="GA Client ID" oninput="M.fwLabel()"></div>' +
        '<div class="sf-row"><label>Длина / разрядность</label><input id="fw-len" type="number" value="255"></div>' +
        '<div class="sf-row"><label>Имя поля (API)</label><input id="fw-api" placeholder="GA_Client_ID__c"></div>' +
        '<div class="sf-row"><label>Описание</label><input id="fw-desc" placeholder="Зачем это поле"></div>' +
        '<div class="sf-actions"><button class="sf-btn" onclick="M.cancelField()">Отмена</button><button class="sf-btn brand" onclick="M.saveField()">Сохранить</button></div>' +
        (fieldWizard.error ? '<div class="sf-error">' + fieldWizard.error + '</div>' : '') + '</div>';
    }
    return '<p>Чтобы Лид «помнил» посетителя сайта, у объекта Лид нужны поля для данных из скрытых полей формы.</p>' +
      '<ol class="task"><li>Создай 6 настраиваемых полей: для <b>GA client_id</b>, <b>GA session_id</b>, <b>gclid</b>, <b>utm_source</b>, <b>utm_medium</b>, <b>utm_campaign</b>.</li>' +
      '<li>Подумай над типом данных и длиной каждого поля.</li></ol>' +
      '<p class="small">В настоящем Salesforce: <b>Setup → Object Manager → Lead → Fields &amp; Relationships → New</b>. Не забудь, что новое поле надо показать нужным профилям (Field-Level Security) — иначе Web-to-Lead и Flow его «не увидят».</p>' +
      frame('sf', ['Setup', 'Object Manager', 'Лид', 'Поля и связи'], list + wiz) +
      hint('Обычно поля называют так: <code>GA_Client_ID__c</code>, <code>GA_Session_ID__c</code>, <code>GCLID__c</code>, <code>UTM_Source__c</code>, <code>UTM_Medium__c</code>, <code>UTM_Campaign__c</code>. ' +
        'client_id выглядит как <code>1234567890.1730000000</code> — это текст, а не число.');
  },
  check: function () {
    var msgs = [], names = { ga_client_id: 'GA client_id', ga_session_id: 'GA session_id', gclid: 'gclid', utm_source: 'utm_source', utm_medium: 'utm_medium', utm_campaign: 'utm_campaign' };
    Object.keys(FIELD_RE).forEach(function (k) { if (!fieldBy(FIELD_RE[k])) msgs.push('Не вижу поля для ' + names[k] + ' (в названии должно быть понятно, что это за поле).'); });
    var c = fieldBy(FIELD_RE.ga_client_id), s = fieldBy(FIELD_RE.ga_session_id), g = fieldBy(FIELD_RE.gclid);
    if (c && c.type !== 'Text') msgs.push('client_id (<code>1234567890.1730000000</code>) в поле типа ' + c.type + ' сломается: Number съест точку/округлит, а GA4 не узнает посетителя. Нужен Text.');
    if (s && s.type !== 'Text') msgs.push('session_id лучше хранить как Text: это идентификатор, а не число для арифметики (Number может отобразить его с разделителями или в экспоненте).');
    if (g && g.type !== 'Text') msgs.push('gclid — строка из букв и цифр. Нужен Text.');
    if (g && g.type === 'Text' && +g.length < 100) msgs.push('gclid бывает длиннее 100 символов — поставь длину 255.');
    if (c && c.type === 'Text' && +c.length < 30) msgs.push('Длины ' + c.length + ' для client_id мало, поставь хотя бы 50 (лучше 255).');
    return msgs.length ? { ok: false, msgs: msgs } : { ok: true, msgs: ['Поля созданы и правильного типа.'] };
  }
});
M.newField = function () { fieldWizard = { type: 'Text' }; render(); };
M.cancelField = function () { fieldWizard = null; render(); };
M.fwLabel = function () { $('fw-api').value = apiFromLabel(val('fw-label')); };
M.saveField = function () {
  var f = { label: val('fw-label').trim(), api: val('fw-api').trim(), type: val('fw-type'), length: +val('fw-len') || null, sfid: '00N5g00000' + rnd(5, '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ') };
  var err = !f.label ? 'Метка поля обязательна.' : !/^[A-Za-z][A-Za-z0-9_]*__c$/.test(f.api) ? 'Имя поля должно быть латиницей и заканчиваться на __c.' :
    findField(f.api) ? 'Поле ' + f.api + ' уже существует.' : (f.type === 'Text' && (f.length < 1 || f.length > 255)) ? 'Длина текстового поля: от 1 до 255.' : '';
  if (err) { fieldWizard = { type: f.type, error: err }; render(); $('fw-label').value = f.label; $('fw-api').value = f.api; return; }
  if (f.type !== 'Text' && f.type !== 'Number') f.length = null;
  S.sf.fields.push(f); fieldWizard = null; saveState(); render();
};
M.delField = function (api) { S.sf.fields = S.sf.fields.filter(function (f) { return f.api !== api; }); saveState(); render(); };

/* ---------- 5. Salesforce: Web-to-Lead ---------- */
var SITE_HIDDEN = ['ga_client_id', 'ga_session_id', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign'];
MISSIONS.push({
  id: 'w2l', title: 'Salesforce: Web-to-Lead', icon: '📥', app: 'sf',
  render: function () {
    var w = S.sf.w2l;
    var selectable = allLeadFields().filter(function (f) { return ['Id', 'Status'].indexOf(f.api) === -1; });
    var gen = '<p><b>1. Выбери поля для формы</b></p><div class="chk-grid">' + selectable.map(function (f) {
      return '<label class="chk"><input type="checkbox" class="w2l-f" value="' + f.api + '"' + (w.included.indexOf(f.api) !== -1 ? ' checked' : '') + '> ' + esc(f.label) + ' <small>' + f.api + '</small></label>';
    }).join('') + '</div><button class="sf-btn brand" onclick="M.genW2L()">Создать</button>';
    if (w.generated) {
      var html = '<form action="https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8" method="POST">\n<input type="hidden" name="oid" value="00D5g000004GrCo">\n<input type="hidden" name="retURL" value="https://valeriakoval4-jpg.github.io/gtm-practice-site/">\n' +
        w.included.map(function (api) {
          var f = findField(api);
          var name = f.std ? { FirstName: 'first_name', LastName: 'last_name', Email: 'email', Phone: 'phone', Company: 'company', Description: 'description', LeadSource: 'lead_source' }[api] || api.toLowerCase() : f.sfid;
          return '<label for="' + name + '">' + f.label + '</label><input id="' + name + '" name="' + name + '" type="text">  ';
        }).join('\n') + '\n<input type="submit" name="submit">\n</form>';
      gen += '<p><b>Сгенерированный HTML</b> — обрати внимание: у настраиваемых полей вместо имени стоит ID поля (<code>00N…</code>). Именно этот ID разработчик ставит в name скрытого поля.</p>' + codeBlock(html);
    }
    var custom = S.sf.fields.filter(function (f) { return w.included.indexOf(f.api) !== -1; });
    var map = '<p><b>2. Сопоставь скрытые поля сайта с полями Лида</b></p><table class="tbl sf"><tr><th>Скрытое поле на сайте</th><th>Поле Лида в Salesforce</th></tr>' +
      SITE_HIDDEN.map(function (h) {
        return '<tr><td><code>' + h + '</code></td><td><select id="map-' + h + '"><option value="">— не сопоставлено —</option>' + custom.map(function (f) {
          return '<option value="' + f.api + '"' + (w.mapping[h] === f.api ? ' selected' : '') + '>' + esc(f.label) + ' (' + f.sfid + ')</option>';
        }).join('') + '</select></td></tr>';
      }).join('') + '</table>' + (custom.length ? '' : '<p class="empty-note">Сначала включи в форму свои настраиваемые поля (шаг 1).</p>') +
      '<button class="sf-btn brand" onclick="M.saveMapping()">Сохранить сопоставление</button>';
    var web = S.sf.leads.filter(function (l) { return l.origin === 'web'; });
    var pending = getOutbox().filter(function (x) { return S.sf.processedWebIds.indexOf(x.web_id) === -1; }).length;
    var proc = '<p><b>3. Приём заявок</b> — входящих необработанных заявок: <b>' + pending + '</b></p>' +
      '<button class="sf-btn brand" onclick="M.process()">Принять заявки с сайта</button> ' +
      (web.length ? '<button class="sf-btn" onclick="M.reprocess()">Удалить лиды с сайта и принять заново</button>' : '') +
      (web.length ? '<table class="tbl sf"><tr><th>Лид</th><th>Источник</th><th>Данные GA/UTM в Лиде</th></tr>' + web.map(function (l) {
        return '<tr><td>' + esc(l.FirstName + ' ' + l.LastName) + '<br><small>' + esc(l.Company) + '</small></td><td>' + esc(l.LeadSource) + '</td><td>' +
          (Object.keys(l.custom).length ? Object.keys(l.custom).map(function (k) { return '<code>' + k + '</code> = ' + esc(l.custom[k] || '∅'); }).join('<br>') : '<span class="bad-text">пусто — сопоставление не настроено</span>') + '</td></tr>';
      }).join('') + '</table>' : '');
    return '<p>Web-to-Lead — встроенный механизм Salesforce: форма на сайте отправляет POST, и Salesforce создаёт Лид. Разработчик добавляет в форму скрытые поля с ID твоих настраиваемых полей.</p>' +
      '<ol class="task"><li>Сгенерируй форму Web-to-Lead со своими новыми полями и найди их ID.</li><li>Сопоставь скрытые поля сайта с полями Лида (это то, что разработчик пропишет в <code>name</code> полей).</li><li>Прими заявки с сайта и проверь, что данные GA/UTM попали в Лиды.</li></ol>' +
      '<p class="small">В настоящем Salesforce: <b>Setup → Web-to-Lead → Create Web-to-Lead Form</b>. Для защиты от спама там же включают reCAPTCHA.</p>' +
      frame('sf', ['Setup', 'Маркетинг', 'Web-to-Lead'], gen) + frame('sf', ['Setup', 'Web-to-Lead', 'Сопоставление полей сайта'], map) + frame('sf', ['Лиды', 'Входящие с сайта'], proc);
  },
  check: function () {
    var w = S.sf.w2l, msgs = [];
    if (!w.generated) msgs.push('Сначала сгенерируй форму Web-to-Lead.');
    SITE_HIDDEN.forEach(function (h) {
      var want = fieldBy(FIELD_RE[h]);
      if (!want) { msgs.push('Нет поля Лида для <code>' + h + '</code> (миссия 4).'); return; }
      if (w.mapping[h] !== want.api) msgs.push('<code>' + h + '</code> должно попадать в поле <code>' + want.api + '</code>' + (w.mapping[h] ? ', а сейчас в <code>' + w.mapping[h] + '</code>' : '') + '.');
    });
    var web = S.sf.leads.filter(function (l) { return l.origin === 'web'; });
    if (!msgs.length && !web.length) msgs.push('Сопоставление верное. Теперь прими заявки с сайта (шаг 3).');
    if (!msgs.length && !web.some(function (l) { return leadClientId(l); })) msgs.push('Лиды созданы, но в них нет client_id — вероятно, их приняли до сопоставления. Нажми «Удалить лиды с сайта и принять заново».');
    return msgs.length ? { ok: false, msgs: msgs } : { ok: true, msgs: ['Лиды с сайта приходят в Salesforce вместе с client_id, session_id и UTM.'] };
  }
});
M.genW2L = function () {
  S.sf.w2l.included = Array.prototype.slice.call(document.querySelectorAll('.w2l-f:checked')).map(function (c) { return c.value; });
  S.sf.w2l.generated = true; saveState(); render();
};
M.saveMapping = function () { SITE_HIDDEN.forEach(function (h) { S.sf.w2l.mapping[h] = val('map-' + h); }); saveState(); flash.w2l = 'Сопоставление сохранено.'; render(); };
M.process = function () { var n = processOutbox(); flash.w2l = n ? 'Создано лидов: ' + n : 'Новых заявок нет — отправь форму на сайте.'; render(); };
M.reprocess = function () {
  var webIds = S.sf.leads.filter(function (l) { return l.origin === 'web'; }).map(function (l) { return l.Id; });
  S.sf.leads = S.sf.leads.filter(function (l) { return l.origin !== 'web'; });
  S.sf.processedWebIds = []; S.log = S.log.filter(function (e) { return webIds.indexOf(e.leadId) === -1; });
  S.gaReceived = S.gaReceived.filter(function (e) { return webIds.indexOf(e.leadId) === -1; });
  M.process();
};

/* ---------- 6. Salesforce: подключение к GA4 ---------- */
MISSIONS.push({
  id: 'connect', title: 'Salesforce: подключение к GA4', icon: '🔌', app: 'sf',
  render: function () {
    var ec = S.sf.extCred || {}, nc = S.sf.nc || {}, ps = S.sf.permSet, st = S.sf.settings;
    var a = '<div class="sf-row"><label>Метка / Имя</label><input id="ec-name" value="' + esc(ec.name || '') + '" placeholder="GA4_External"></div>' +
      '<div class="sf-row"><label>Протокол аутентификации</label><select id="ec-proto">' + ['', 'No Authentication', 'OAuth 2.0', 'AWS Signature Version 4', 'Custom'].map(function (p) { return '<option' + (ec.protocol === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></div>' +
      '<div class="sf-row"><label>Принципал (Principal)</label><input id="ec-principal" value="' + esc(ec.principal || '') + '" placeholder="GA4_Principal"></div>' +
      '<button class="sf-btn brand" onclick="M.saveEC()">Сохранить</button>';
    var b = '<div class="sf-row"><label>Метка</label><input id="nc-label" value="' + esc(nc.label || '') + '" placeholder="GA4 Measurement Protocol"></div>' +
      '<div class="sf-row"><label>Имя (API)</label><input id="nc-name" value="' + esc(nc.name || '') + '" placeholder="GA4_MP"></div>' +
      '<div class="sf-row"><label>URL</label><input id="nc-url" value="' + esc(nc.url || '') + '" placeholder="https://…"></div>' +
      '<div class="sf-row"><label>External Credential</label><select id="nc-ec"><option value="">—</option>' + (S.sf.extCred ? '<option' + (nc.extCred === S.sf.extCred.name ? ' selected' : '') + '>' + esc(S.sf.extCred.name) + '</option>' : '') + '</select></div>' +
      '<label class="chk"><input type="checkbox" id="nc-auth"' + (nc.generateAuth ? ' checked' : '') + '> Генерировать заголовок Authorization</label>' +
      '<button class="sf-btn brand" onclick="M.saveNC()">Сохранить</button>';
    var c = '<p>Набор разрешений <b>«GA4 Integration»</b></p>' +
      '<label class="chk"><input type="checkbox" id="ps-access"' + (ps.principalAccess ? ' checked' : '') + '> Доступ к принципалам External Credential: ' + esc(S.sf.extCred ? S.sf.extCred.name + ' – ' + S.sf.extCred.principal : '(сначала создай External Credential)') + '</label>' +
      '<label class="chk"><input type="checkbox" id="ps-assign"' + (ps.assigned ? ' checked' : '') + '> Назначен пользователям, от имени которых меняются лиды (отдел продаж)</label>' +
      '<button class="sf-btn brand" onclick="M.savePS()">Сохранить</button>';
    var d = '<p>Тип настраиваемых метаданных <code>GA4_Settings__mdt</code>, запись <b>Default</b></p>' +
      '<div class="sf-row"><label>Measurement_ID__c</label><input id="st-mid" value="' + esc(st.Measurement_ID__c) + '" placeholder="G-…"></div>' +
      '<div class="sf-row"><label>API_Secret__c</label><input id="st-sec" value="' + esc(st.API_Secret__c) + '" placeholder="значение секрета из GA4"></div>' +
      '<button class="sf-btn brand" onclick="M.saveSettings()">Сохранить</button>';
    return '<p>Flow будет делать HTTP-запрос во внешнюю систему. Salesforce разрешает такие запросы только через <b>Named Credential</b> — «закладку» с адресом и способом входа.</p>' +
      '<ol class="task"><li><b>External Credential</b> — как авторизоваться. Подумай: нужна ли GA4 авторизация?</li>' +
      '<li><b>Named Credential</b> — базовый адрес сервиса (только хост, путь укажем в самом запросе).</li>' +
      '<li><b>Permission Set</b> — дать пользователям доступ к External Credential. Частая забытая деталь!</li>' +
      '<li><b>Custom Metadata</b> — хранить ID потока и секрет, чтобы не зашивать их во Flow.</li></ol>' +
      '<p class="small">В настоящем Salesforce: <b>Setup → Named Credentials</b> (вкладки Named Credentials и External Credentials), <b>Setup → Permission Sets</b>, <b>Setup → Custom Metadata Types</b>.</p>' +
      frame('sf', ['Setup', 'Named Credentials', 'External Credentials', 'Создать'], a) +
      frame('sf', ['Setup', 'Named Credentials', 'Создать'], b) +
      frame('sf', ['Setup', 'Permission Sets', 'GA4 Integration'], c) +
      frame('sf', ['Setup', 'Custom Metadata Types', 'GA4 Settings', 'Default'], d) +
      hint('Measurement Protocol не использует OAuth: авторизация — это <code>api_secret</code> в адресе запроса. Поэтому External Credential с протоколом «No Authentication». ' +
        'URL в Named Credential — <code>https://www.google-analytics.com</code>, без пути.');
  },
  check: function () {
    var msgs = [], ec = S.sf.extCred, nc = S.sf.nc, ps = S.sf.permSet, st = S.sf.settings;
    if (!ec) msgs.push('Создай External Credential.');
    else if (ec.protocol !== 'No Authentication') msgs.push('Протокол «' + ec.protocol + '» не подходит: GA4 MP не использует OAuth/подписи — ключ (api_secret) передаётся в URL. Выбери «No Authentication».');
    if (!nc) msgs.push('Создай Named Credential.');
    else {
      var u = (nc.url || '').replace(/\/+$/, '');
      if (/\/mp\//.test(u) || /collect/.test(u)) msgs.push('В URL Named Credential не нужен путь /mp/collect — только хост. Путь задаётся в действии HTTP-запроса.');
      else if (u !== 'https://www.google-analytics.com') msgs.push('URL Named Credential должен быть <code>https://www.google-analytics.com</code>.');
      if (!ec || nc.extCred !== ec.name) msgs.push('Named Credential должен ссылаться на твой External Credential.');
    }
    if (!ps.principalAccess || !ps.assigned) msgs.push('Permission Set: дай доступ к принципалу и назначь набор пользователям. Без этого запрос упадёт с ошибкой доступа к credential.');
    if (st.Measurement_ID__c.trim() !== GA_PROPERTY_MID) msgs.push('Measurement_ID__c должен совпадать с ID потока в GA4 (миссия 2).');
    if (!S.ga.secrets.some(function (s) { return s.value === st.API_Secret__c.trim(); })) msgs.push('API_Secret__c не совпадает ни с одним секретом из GA4.');
    return msgs.length ? { ok: false, msgs: msgs } : { ok: true, msgs: ['Salesforce может обращаться к GA4.'] };
  }
});
M.saveEC = function () { S.sf.extCred = { name: val('ec-name').trim(), protocol: val('ec-proto'), principal: val('ec-principal').trim() }; saveState(); flash.connect = 'External Credential сохранён.'; render(); };
M.saveNC = function () { S.sf.nc = { label: val('nc-label').trim(), name: val('nc-name').trim(), url: val('nc-url').trim(), extCred: val('nc-ec'), generateAuth: val('nc-auth') }; saveState(); flash.connect = 'Named Credential сохранён.'; render(); };
M.savePS = function () { S.sf.permSet = { principalAccess: !!S.sf.extCred && val('ps-access'), assigned: val('ps-assign') }; saveState(); flash.connect = 'Набор разрешений сохранён.'; render(); };
M.saveSettings = function () { S.sf.settings.Measurement_ID__c = val('st-mid').trim(); S.sf.settings.API_Secret__c = val('st-sec').trim(); saveState(); flash.connect = 'Запись метаданных сохранена.'; render(); };

/* ---------- 7. Flow ---------- */
var CONDITION_OPS = [['equals', 'Равно'], ['not_equals', 'Не равно'], ['is_changed', 'Изменено (Is Changed)'], ['is_null', 'Пусто (Is Null)']];
MISSIONS.push({
  id: 'flow', title: 'Salesforce: Flow', icon: '⚡', app: 'flow',
  render: function () {
    var f = S.sf.flow, a = f.action;
    function sel(id, cur, opts) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
    var fieldOpts = [['', '—']].concat(allLeadFields().map(function (x) { return [x.api, x.label + ' (' + x.api + ')']; }));
    var start = '<div class="fb-node start"><div class="fb-title">▶ Старт: запуск при изменении записи</div>' +
      '<div class="sf-row"><label>Объект</label>' + sel('f-object', f.object, [['', '—'], ['Lead', 'Лид'], ['Contact', 'Контакт'], ['Opportunity', 'Возможность']]) + '</div>' +
      '<div class="sf-row"><label>Запускать, когда запись</label>' + sel('f-trigger', f.trigger, [['', '—'], ['create', 'создана'], ['update', 'обновлена'], ['create_update', 'создана или обновлена']]) + '</div>' +
      '<div class="fb-sub">Условия входа (все условия выполнены — AND)</div>' +
      f.conditions.map(function (c, i) {
        return '<div class="cond-row">' + sel('c-field-' + i, c.field, fieldOpts) + sel('c-op-' + i, c.op, [['', '—']].concat(CONDITION_OPS)) +
          '<input id="c-val-' + i + '" value="' + esc(c.value) + '" list="cond-vals" placeholder="значение"><button class="link-btn" onclick="M.delCond(' + i + ')">✕</button></div>';
      }).join('') + '<datalist id="cond-vals">' + LEAD_STATUSES.concat(['True', 'False']).map(function (s) { return '<option value="' + s + '">'; }).join('') + '</datalist>' +
      '<button class="link-btn" onclick="M.addCond()">+ Добавить условие</button>' +
      '<div class="sf-row"><label>Когда запускать для обновлённых записей</label>' + sel('f-when', f.when, [['', '—'], ['every', 'Каждый раз, когда запись обновлена и соответствует условиям'], ['only_when_met', 'Только когда запись обновлена так, что начала соответствовать условиям']]) + '</div>' +
      '<div class="sf-row"><label>Оптимизировать Flow для</label>' + sel('f-opt', f.optimize, [['', '—'], ['fast', 'Быстрые обновления полей (before-save)'], ['actions', 'Действия и связанные записи (after-save)']]) + '</div>' +
      '<label class="chk"><input type="checkbox" id="f-async"' + (f.asyncPath ? ' checked' : '') + '> Включить путь «Run Asynchronously» (асинхронно)</label></div>';
    var decision = '<div class="fb-arrow">↓</div><div class="fb-node decision"><div class="fb-title">◆ Решение: какой статус?</div>' +
      '<table class="tbl sf"><tr><th>Если {!$Record.Status} равно</th><th>Отправить событие GA4</th></tr>' +
      LEAD_STATUSES.map(function (s) {
        return '<tr><td>' + s + ' <small>(' + STATUS_RU[s] + ')</small></td><td><input id="d-' + s + '" value="' + esc(f.decision[s]) + '" list="ga-events" placeholder="— не отправлять —"></td></tr>';
      }).join('') + '</table><datalist id="ga-events">' + GA_LEAD_EVENTS.map(function (e) { return '<option value="' + e + '">'; }).join('') + '</datalist>' +
      '<small>Пустое значение = исход по умолчанию, ничего не отправляем.</small></div>';
    var action = '<div class="fb-arrow">↓</div><div class="fb-node action"><div class="fb-title">⚙ Действие: HTTP-запрос в GA4</div>' +
      '<div class="sf-row"><label>Где стоит действие</label>' + sel('a-path-kind', f.calloutPath, [['', '—'], ['immediate', 'На основном (немедленном) пути'], ['async', 'На пути Run Asynchronously']]) + '</div>' +
      '<div class="sf-row"><label>Named Credential</label>' + sel('a-nc', a.nc, [['', '—']].concat(S.sf.nc ? [[S.sf.nc.name, S.sf.nc.label + ' (' + S.sf.nc.name + ')']] : [])) + '</div>' +
      '<div class="sf-row"><label>Метод</label>' + sel('a-method', a.method, [['', '—'], ['GET', 'GET'], ['POST', 'POST'], ['PUT', 'PUT']]) + '</div>' +
      '<div class="sf-row"><label>Путь URL</label><input id="a-path" value="' + esc(a.path) + '" placeholder="/…"></div>' +
      '<div class="fb-sub">Параметры запроса (query)</div>' +
      '<div class="sf-row"><label>measurement_id</label><input id="q-mid" list="resources" value="' + esc(a.query.measurement_id) + '" placeholder="{!…} или текст"></div>' +
      '<div class="sf-row"><label>api_secret</label><input id="q-sec" list="resources" value="' + esc(a.query.api_secret) + '" placeholder="{!…} или текст"></div>' +
      '<div class="fb-sub">Тело запроса (JSON)</div>' +
      '<div class="sf-row"><label>client_id</label><input id="b-client_id" list="resources" value="' + esc(a.body.client_id) + '"></div>' +
      '<div class="fb-sub small">events[0].name = событие из «Решения»; events[0].params:</div>' +
      ['session_id', 'engagement_time_msec', 'lead_id', 'lead_source', 'value', 'currency', 'debug_mode'].map(function (k) {
        return '<div class="sf-row"><label>' + k + '</label><input id="b-' + k + '" list="resources" value="' + esc(a.body[k]) + '" placeholder="{!…} или текст, пусто = не отправлять"></div>';
      }).join('') + resourceList() + '</div>';
    var fs = S.sf.flowSaved, fa = S.sf.flowActive, dirty = fs && flowDirty(), latestOn = fs && fa && fa.version === fs.version;
    var toolbar = '<div class="fb-toolbar"><input id="f-label" value="' + esc(f.label) + '" placeholder="Имя Flow, напр. Lead Status → GA4">' +
      '<span class="fb-status ' + (latestOn ? 'on' : '') + '">' + (fs ? 'Версия ' + fs.version + ' · ' + (latestOn ? 'Активна' : 'Не активна') + (fa && !latestOn ? ' (работает версия ' + fa.version + ')' : '') + (dirty ? ' · есть несохранённые изменения' : '') : 'Не сохранён') + '</span>' +
      '<button class="sf-btn" onclick="M.saveFlow()">Сохранить</button>' +
      '<button class="sf-btn brand" id="flow-activate" onclick="M.toggleFlow()"' + (fs ? '' : ' disabled') + '>' + (latestOn ? 'Деактивировать' : 'Активировать') + '</button></div>';
    var errs = S._flowErrors;
    return '<p>Сердце интеграции: Flow, который ловит смену статуса Лида и отправляет событие в GA4 через Measurement Protocol.</p>' +
      '<ol class="task"><li>Настрой стартовый элемент: объект, когда запускать, <b>условия входа</b>.</li>' +
      '<li>В «Решении» сопоставь статусы и рекомендованные события GA4.</li>' +
      '<li>Настрой HTTP-запрос: куда, каким методом, какие параметры и тело.</li><li>Сохрани и активируй. Правильность проверят тесты в миссии 8 — там же вылезут ошибки, если они есть.</li></ol>' +
      '<p class="small">Как в настоящем Salesforce: «Сохранить» создаёт новую <b>версию</b>, но лиды продолжает обрабатывать <b>активная</b> версия, пока ты не активируешь новую.</p>' +
      '<p class="small">Формат запроса Measurement Protocol:</p>' +
      codeBlock('POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXXX&api_secret=XXXX\n{\n  "client_id": "1234567890.1730000000",\n  "events": [{\n    "name": "qualify_lead",\n    "params": { "session_id": "1730712345", "engagement_time_msec": 1, "value": 2000, "currency": "USD" }\n  }]\n}') +
      frame('flow', null, toolbar + (errs && errs.length ? '<div class="sf-error"><b>Не удалось сохранить:</b><ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul></div>' : '') +
        '<div class="fb-canvas">' + start + decision + action + '</div>') +
      hint('<b>Условия входа:</b> подумай о двух тестах из миссии 8 — правка телефона у уже квалифицированного лида не должна слать событие повторно, а лид без client_id вообще не должен слать запрос.<br>' +
        '<b>Где ставить HTTP-запрос:</b> Salesforce не даёт делать внешний запрос в той же транзакции, где сохраняется запись.<br>' +
        '<b>Ресурсы</b> выбирай из подсказок в полях (начни печатать <code>{!</code>). Значения-константы (например, валюту) пиши просто текстом.');
  },
  check: function () {
    var f = S.sf.flowSaved, fa = S.sf.flowActive;
    if (!f) return { ok: false, msgs: ['Flow ещё не сохранён.'] };
    var e = flowSaveErrors(f);
    if (e.length) return { ok: false, msgs: e };
    if (!fa) return { ok: false, msgs: ['Flow сохранён, но не активирован.'] };
    if (fa.version !== f.version) return { ok: false, msgs: ['Сейчас работает версия ' + fa.version + ', а последняя сохранённая — ' + f.version + '. Активируй последнюю версию.'] };
    return { ok: true, msgs: ['Flow активен (версия ' + f.version + '). Время тестов!'] };
  }
});
function collectFlow() {
  var f = S.sf.flow, a = f.action;
  if (!$('f-object')) return;
  f.label = val('f-label'); f.object = val('f-object'); f.trigger = val('f-trigger'); f.when = val('f-when'); f.optimize = val('f-opt'); f.asyncPath = val('f-async');
  f.conditions = f.conditions.map(function (c, i) { return { field: val('c-field-' + i), op: val('c-op-' + i), value: val('c-val-' + i).trim() }; });
  LEAD_STATUSES.forEach(function (s) { f.decision[s] = val('d-' + s).trim(); });
  f.calloutPath = val('a-path-kind'); a.nc = val('a-nc'); a.method = val('a-method'); a.path = val('a-path').trim();
  a.query.measurement_id = val('q-mid').trim(); a.query.api_secret = val('q-sec').trim();
  Object.keys(a.body).forEach(function (k) { a.body[k] = val('b-' + k).trim(); });
}
M.addCond = function () { collectFlow(); S.sf.flow.conditions.push({ field: '', op: '', value: '' }); saveState(); render(); };
M.delCond = function (i) { collectFlow(); S.sf.flow.conditions.splice(i, 1); saveState(); render(); };
M.saveFlow = function () {
  collectFlow();
  var e = flowSaveErrors();
  S._flowErrors = e;
  if (!e.length) {
    var v = (S.sf.flowSaved ? S.sf.flowSaved.version : 0) + 1;
    S.sf.flowSaved = JSON.parse(JSON.stringify(S.sf.flow)); S.sf.flowSaved.version = v;
    var fa = S.sf.flowActive;
    flash.flow = 'Сохранена версия ' + v + '. Она пока не активна' + (fa ? ' — лиды по-прежнему обрабатывает версия ' + fa.version : '') + '. Чтобы изменения заработали, нажми кнопку активации.';
  }
  saveState(); render();
};
M.toggleFlow = function () {
  collectFlow();
  var fs = S.sf.flowSaved, fa = S.sf.flowActive; if (!fs) return;
  var on = !(fa && fa.version === fs.version);
  S.sf.flowActive = on ? JSON.parse(JSON.stringify(fs)) : null; saveState();
  flash.flow = on ? 'Версия ' + fs.version + ' активирована.' + (flowDirty() ? ' ⚠️ В редакторе есть несохранённые изменения — они НЕ работают, пока не сохранишь и не активируешь новую версию.' : '') : 'Flow деактивирован.';
  render();
};
function flowDirty() {
  var a = JSON.parse(JSON.stringify(S.sf.flowSaved)); delete a.version; delete a.active;
  var b = JSON.parse(JSON.stringify(S.sf.flow)); delete b.version; delete b.active;
  return JSON.stringify(a) !== JSON.stringify(b);
}

/* ---------- 8. Тестирование ---------- */
var openLeadId = null;
MISSIONS.push({
  id: 'test', title: 'Тестирование цепочки', icon: '🧪', app: 'sf',
  render: function () {
    var tests = testResults();
    var tbl = '<div class="tests">' + tests.map(function (t) {
      return '<div class="test ' + t.status + '"><span class="test-ico">' + { pass: '✅', fail: '❌', todo: '⏳' }[t.status] + '</span><div><b>' + t.id + '. ' + t.title + '</b><small>' + t.note + '</small></div></div>';
    }).join('') + '</div>';
    var leads = S.sf.leads;
    if (!openLeadId && leads.length) openLeadId = leads[0].Id;
    var list = '<table class="tbl sf clickable"><tr><th>Имя</th><th>Компания</th><th>Источник</th><th>Статус</th></tr>' + leads.map(function (l) {
      return '<tr class="' + (l.Id === openLeadId ? 'sel' : '') + '" onclick="M.openLead(\'' + l.Id + '\')"><td>' + esc(l.FirstName + ' ' + l.LastName) + '</td><td>' + esc(l.Company) + '</td><td>' + esc(l.LeadSource) + '</td><td>' + STATUS_RU[l.Status] + '</td></tr>';
    }).join('') + '</table>';
    var lead = leads.filter(function (l) { return l.Id === openLeadId; })[0], detail = '';
    if (lead) {
      detail = '<div class="lead-card"><div class="lead-head"><div><small>Лид</small><h4>' + esc(lead.FirstName + ' ' + lead.LastName) + '</h4><span>' + esc(lead.Company) + ' · ' + esc(lead.Phone || '') + '</span></div>' +
        '<button class="sf-btn" onclick="M.editPhone()">✏️ Изменить телефон</button></div>' +
        '<div class="path">' + LEAD_STATUSES.map(function (s) {
          var cls = s === lead.Status ? 'cur' : LEAD_STATUSES.indexOf(s) < LEAD_STATUSES.indexOf(lead.Status) && s !== 'Unqualified' ? 'done' : '';
          return '<button class="path-step ' + cls + '" onclick="M.setStatus(\'' + s + '\')">' + STATUS_RU[s] + '</button>';
        }).join('') + '</div>' +
        '<div class="lead-fields">' + [['Источник лида', lead.LeadSource], ['Бюджет', '$' + lead.Budget__c], ['ID', lead.Id]].concat(S.sf.fields.map(function (f) { return [f.label, leadValue(lead, f.api)]; })).map(function (p) {
          return '<div><small>' + esc(p[0]) + '</small><b>' + (p[1] === '' || p[1] == null ? '—' : esc(p[1])) + '</b></div>';
        }).join('') + '</div><p class="small">Нажми на статус в «дорожке», чтобы сменить его. В реальном Salesforce «Конвертирован» — это отдельная кнопка Convert (создаёт Аккаунт, Контакт и Возможность); здесь упрощено.</p></div>';
    }
    var logHtml = S.log.slice(0, 8).map(function (e) {
      return '<div class="log-item"><div class="log-head"><b>' + time(e.ts) + '</b> ' + esc(e.leadName) + ': ' + (e.change === 'status' ? 'статус ' + STATUS_RU[e.from] + ' → ' + STATUS_RU[e.to] : 'телефон изменён') + '</div>' +
        e.steps.map(function (s) { return '<div class="log-step ' + s.kind + '">' + { ok: '✓', skip: '⏭', warn: '⚠️', error: '⛔' }[s.kind] + ' ' + esc(s.text) + '</div>'; }).join('') +
        (e.request ? '<details><summary>HTTP-запрос и ответ</summary>' + codeBlock(e.request.method + ' ' + e.request.url + '\n\n' + JSON.stringify(e.request.body, null, 2)) +
          codeBlock('← ' + e.response.status + ' ' + e.response.text) + (e.realSent ? '<small>📡 Копия отправлена в настоящий GA4.</small>' : '') + '</details>' : '') + '</div>';
    }).join('') || '<p class="empty-note">Пока пусто. Поменяй статус у лида.</p>';
    var rt = {}; S.gaReceived.forEach(function (e) { if (e.params.engagement_time_msec && e.params.session_id) rt[e.name] = (rt[e.name] || 0) + 1; });
    var dbg = S.gaReceived.filter(function (e) { return e.params.debug_mode === true; });
    var ga = '<div class="ga-cols"><div><div class="ga-card-title">В режиме реального времени · события</div>' +
      (Object.keys(rt).length ? Object.keys(rt).map(function (k) { return '<div class="rt-row"><span>' + k + '</span><b>' + rt[k] + '</b></div>'; }).join('') : '<p class="empty-note">Нет данных</p>') +
      '<small>Здесь видны только события с session_id и engagement_time_msec.</small></div>' +
      '<div><div class="ga-card-title">DebugView</div>' + (dbg.length ? dbg.slice(-6).reverse().map(function (e) { return '<div class="rt-row"><span>' + time(e.ts) + ' · ' + e.name + '</span><small>' + esc(e.client_id) + '</small></div>'; }).join('') : '<p class="empty-note">Нет событий с debug_mode</p>') + '</div></div>';
    return '<p>Пора проверить цепочку целиком. Меняй статусы лидов как менеджер по продажам и смотри журнал отладки Flow и то, что дошло до GA4. ' +
      'Если тест падает — возвращайся в нужную миссию, исправляй, <b>сохраняй и активируй новую версию Flow</b> и тестируй снова.</p>' + tbl +
      '<div class="test-grid"><div>' + frame('sf', ['Продажи', 'Лиды'], list + detail) + '</div><div>' +
      frame('sf', ['Setup', 'Отладка Flow', 'Журнал запусков'], logHtml + (S.log.length ? '<button class="link-btn" onclick="M.clearLog()">Очистить журнал и события GA4</button>' : '')) +
      frame('ga', ['Отчёты', 'В режиме реального времени'], ga) + '</div></div>' +
      '<p class="small">Нужно больше лидов? Отправь ещё заявки на <a href="../lead.html?utm_source=facebook&utm_medium=paid_social&utm_campaign=office_green" target="_blank">сайте</a> или создай симуляцию в миссии 1, затем прими их в миссии 5.</p>';
  },
  check: function () {
    var t = testResults(), bad = t.filter(function (x) { return x.status !== 'pass'; });
    return bad.length ? { ok: false, msgs: bad.map(function (x) { return x.id + ': ' + x.note; }) } : { ok: true, msgs: ['Все 5 тестов пройдены. Цепочка работает!'] };
  }
});
M.openLead = function (id) { openLeadId = id; render(); };
M.setStatus = function (s) {
  var l = S.sf.leads.filter(function (x) { return x.Id === openLeadId; })[0];
  if (!l || l.Status === s) return;
  updateLead(openLeadId, { type: 'status', to: s }); render();
};
M.editPhone = function () { updateLead(openLeadId, { type: 'phone', to: '+1 000 ' + rnd(3, '0123456789') + '-' + rnd(2, '0123456789') + '-' + rnd(2, '0123456789') }); render(); };
M.clearLog = function () { if (!confirm('Очистить журнал Flow и полученные события GA4?')) return; S.log = []; S.gaReceived = []; saveState(); render(); };

/* ---------- 9. Отчёт и итоги ---------- */
MISSIONS.push({
  id: 'report', title: 'Отчёт в GA4 и итоги', icon: '📈', app: 'ga',
  render: function () {
    var rows = {};
    function row(key) { return rows[key] = rows[key] || { leads: 0, q: 0, dq: 0, won: 0, value: 0 }; }
    S.sf.leads.filter(function (l) { return l.origin === 'web'; }).forEach(function (l) {
      var src = leadValue(l, (fieldBy(FIELD_RE.utm_source) || {}).api), med = leadValue(l, (fieldBy(FIELD_RE.utm_medium) || {}).api);
      row((src || '(direct)') + ' / ' + (med || '(none)')).leads++;
    });
    S.gaReceived.forEach(function (e) {
      var key = e.params.session_id ? ((e.utm_source || '(direct)') + ' / ' + (e.utm_medium || '(none)')) : '(not set)';
      var r = row(key);
      if (e.name === 'qualify_lead') r.q++;
      if (e.name === 'disqualify_lead') r.dq++;
      if (e.name === 'close_convert_lead') { r.won++; r.value += +e.params.value || 0; }
    });
    var keys = Object.keys(rows);
    var table = keys.length ? '<table class="tbl ga"><tr><th>Источник / канал сеанса</th><th>generate_lead</th><th>qualify_lead</th><th>% квалиф.</th><th>disqualify_lead</th><th>close_convert_lead</th><th>Ценность</th></tr>' +
      keys.map(function (k) {
        var r = rows[k];
        return '<tr><td>' + esc(k) + '</td><td>' + r.leads + '</td><td>' + r.q + '</td><td>' + (r.leads ? Math.round(r.q / r.leads * 100) + '%' : '—') + '</td><td>' + r.dq + '</td><td>' + r.won + '</td><td>$' + r.value.toLocaleString('ru-RU') + '</td></tr>';
      }).join('') + '</table>' : '<p class="empty-note">Данных пока нет — пройди тесты в миссии 8.</p>';
    return '<p>Ради этого всё и делалось: теперь маркетинг видит не просто заявки, а <b>качество</b> трафика по каналам.</p>' +
      frame('ga', ['Исследования', 'Лиды по каналам (свободная форма)'], table +
        '<p class="small">В настоящем GA4: <b>Исследования → Произвольная форма</b>. Параметр: «Источник/канал сеанса». Показатели: «Число событий» с фильтром по названию события или ключевые события по каждому событию. ' +
        'Строка <b>(not set)</b> появляется, если в событии нет session_id: GA4 не может привязать его к сессии и её источнику.</p>') +
      '<h3>Что дальше в реальной жизни</h3><ul>' +
      '<li><b>Задержка.</b> Квалификация бывает через недели. Measurement Protocol принимает <code>timestamp_micros</code> только в пределах 72 часов назад, поэтому событие пишется датой отправки, а связь с источником держится на client_id и session_id.</li>' +
      '<li><b>Google Ads.</b> Тот же gclid из Лида позволяет импортировать квалифицированные лиды как офлайн-конверсии в Google Ads (готовая интеграция Google Ads ↔ Salesforce) — и оптимизировать ставки на качество.</li>' +
      '<li><b>Согласие.</b> Если посетитель отказался от аналитических cookie, client_id не будет — и правильно: такой лид не надо отправлять в GA4.</li>' +
      '<li><b>Мониторинг.</b> Настрой оповещение об ошибках Flow (Setup → Process Automation Settings → получатель ошибок) — иначе сломавшаяся интеграция тихо перестанет слать данные.</li></ul>' +
      '<h3>Финальный тест</h3>' +
      quiz('f1', 'Flow отправил запрос, GA4 ответил 204, но события нет. Что проверить в первую очередь?', ['Ничего, 204 = успех, просто подождать сутки', 'Отправить то же тело на /debug/mp/collect и прочитать validationMessages, проверить measurement_id и api_secret', 'Пересоздать поток данных'], 1, '/mp/collect всегда отвечает 2xx, даже на неверный запрос. Ошибки показывает только валидационный сервер /debug/mp/collect.') +
      quiz('f2', 'Почему HTTP-запрос стоит на пути Run Asynchronously?', ['Так быстрее', 'Salesforce запрещает внешние запросы в незакрытой транзакции сохранения записи (uncommitted work pending)', 'Асинхронный путь бесплатный'], 1, 'Внешний вызов возможен только после фиксации транзакции — для этого и есть асинхронный путь.') +
      quiz('f3', 'Как не отправлять qualify_lead повторно при любой правке квалифицированного лида?', ['Условие входа «Status Изменено = True» (или запуск «только когда запись начала соответствовать условиям»)', 'Отключить историю полей', 'Удалять лид после квалификации'], 0, 'Flow должен реагировать на факт смены статуса, а не на «статус равен Квалифицирован».') +
      quiz('f4', 'Зачем в событии session_id и engagement_time_msec?', ['Это обязательные поля, без них запрос отклоняется', 'Чтобы событие привязалось к сессии (и её источнику) и было видно в отчётах вроде «Реального времени»', 'Для защиты от спама'], 1, 'Без session_id событие попадёт в отчёты с источником (not set) — и смысл связки с кампаниями пропадёт.') +
      quiz('f5', 'Какой тип поля в Salesforce выбрать для client_id?', ['Number(18, 2)', 'Text(255)', 'Checkbox'], 1, 'client_id — строка вида 1234567890.1730000000; числовой тип её исказит.');
  },
  check: function () {
    var ids = ['f1', 'f2', 'f3', 'f4', 'f5'], right = { f1: 1, f2: 1, f3: 0, f4: 1, f5: 1 };
    var done = ids.filter(function (i) { return S.quiz[i] === right[i]; }).length;
    if (done < 5) return { ok: false, msgs: ['Финальный тест: ' + done + ' из 5 верно.'] };
    return { ok: true, msgs: ['🎓 Лаборатория пройдена! Ты настроила полную цепочку GA4 ⇄ Salesforce.'] };
  }
});

/* =========================================================
   НАВИГАЦИЯ И РЕНДЕР
   ========================================================= */
var lastCheck = {};
M.go = function (id) { if ($('f-object')) collectFlow(); S.current = id; saveState(); lastCheck = {}; render(); window.scrollTo(0, 0); };
M.check = function () { if ($('f-object')) { collectFlow(); saveState(); } var m = current(); lastCheck[m.id] = m.check(); render(); };
M.reset = function () { if (confirm('Сбросить весь прогресс лаборатории? (заявки с сайта останутся)')) { resetState(); openLeadId = null; lastCheck = {}; render(); } };
function current() { return MISSIONS.filter(function (m) { return m.id === S.current; })[0] || MISSIONS[0]; }

function render() {
  var cur = current(), idx = MISSIONS.indexOf(cur);
  var states = MISSIONS.map(function (m) { return m.id === 'brief' ? true : m.check().ok; });
  var doneCount = states.filter(Boolean).length - 1;
  $('nav').innerHTML = MISSIONS.map(function (m, i) {
    return '<button class="nav-item' + (m === cur ? ' active' : '') + '" onclick="M.go(\'' + m.id + '\')"><span class="nav-ico">' + (i && states[i] ? '✅' : m.icon) + '</span><span><small>' + (i ? 'Миссия ' + i : 'Старт') + '</small>' + m.title + '</span></button>';
  }).join('') + '<button class="nav-reset" onclick="M.reset()">↺ Сбросить прогресс</button>';
  $('progress').style.width = Math.round(doneCount / (MISSIONS.length - 1) * 100) + '%';
  $('progress-text').textContent = doneCount + ' / ' + (MISSIONS.length - 1);
  var res = lastCheck[cur.id];
  $('main').innerHTML = '<div class="m-head"><small>' + (idx ? 'Миссия ' + idx + ' из ' + (MISSIONS.length - 1) : 'Старт') + '</small><h2>' + cur.icon + ' ' + cur.title + '</h2></div>' +
    (flash[cur.id] ? '<div class="flash">' + flash[cur.id] + '</div>' : '') + cur.render() +
    (idx ? '<div class="m-foot"><button class="btn" onclick="M.check()">Проверить миссию</button>' +
      (idx < MISSIONS.length - 1 ? '<button class="btn ghost" onclick="M.go(\'' + MISSIONS[idx + 1].id + '\')">Следующая →</button>' : '') + '</div>' + feedback(res) : '');
  delete flash[cur.id];
  if (cur.id !== 'flow') delete S._flowErrors;
}

document.addEventListener('DOMContentLoaded', function () {
  loadState(); saveState(); render();
  window.addEventListener('storage', function (e) { if (e.key === 'gc_sf_outbox') render(); });
  window.addEventListener('focus', function () { if (S.current === 'site' || S.current === 'w2l') render(); });
});
