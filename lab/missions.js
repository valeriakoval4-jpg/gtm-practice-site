/* =========================================================
   Лаборатория GA4 ⇄ Salesforce v2 — миссии (шаги 0–12 документа)
   ========================================================= */
var M = {}, flash = {}, ui = { obj: 'Lead', rec: null, recType: 'Lead', variantTab: null, fw: null };
function $(id) { return document.getElementById(id); }
function val(id) { var el = $(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }

/* ---------- компоненты ---------- */
function frame(kind, crumbs, inner) {
  var heads = {
    ga: '<span>📊</span><b>Аналитика</b><span class="fr-tag">симулятор GA4</span>',
    sf: '<span>☁️</span><b>Setup</b><span class="fr-tag">симулятор Salesforce</span>',
    sales: '<span>☁️</span><b>Продажи</b><span class="fr-tag">симулятор Salesforce</span>',
    gtm: '<span>🏷</span><b>Tag Manager</b><span class="fr-tag">делается в настоящем GTM</span>',
    srv: '<span>🖥</span><b>Сервер api.greencorner.example</b><span class="fr-tag">учебный backend</span>',
    gcp: '<span>🗄</span><b>Google Cloud · BigQuery</b><span class="fr-tag">симулятор</span>',
    ls: '<span>📑</span><b>Looker Studio</b><span class="fr-tag">симулятор</span>'
  };
  return '<div class="frame frame-' + kind + '"><div class="fr-head">' + heads[kind] + '</div>' +
    (crumbs ? '<div class="fr-crumbs">' + crumbs.map(esc).join(' <span>›</span> ') + '</div>' : '') + '<div class="fr-body">' + inner + '</div></div>';
}
/* выбор-«карточки»; correct = индекс правильного (для квиза) или undefined (решение без правильного ответа) */
function choice(key, q, options, correct, explain) {
  var chosen = S.ans[key];
  return '<div class="quiz"><div class="quiz-q">' + q + '</div>' + options.map(function (o, i) {
    var cls = chosen === undefined ? '' : correct === undefined ? (chosen === i ? ' picked' : '') : i === correct ? (chosen === i ? ' right' : '') : i === chosen ? ' wrong' : '';
    return '<button class="quiz-opt' + cls + '" onclick="M.pick(\'' + key + '\',' + i + ')">' + o + '</button>';
  }).join('') + (chosen !== undefined && explain ? '<div class="quiz-exp ' + (correct === undefined || chosen === correct ? 'ok' : 'bad') + '">' + (correct === undefined ? '📌 ' : chosen === correct ? '✅ ' : '❌ ') + explain + '</div>' : '') + '</div>';
}
M.pick = function (k, i) { S.ans[k] = i; saveState(); render(); };
function ok(key, correct) { return S.ans[key] === correct; }
function sel(path, options, extra) {
  var cur = getPath(S, path);
  return '<select onchange="M.setv(\'' + path + '\', this.value)"' + (extra || '') + '>' + options.map(function (o) {
    if (typeof o === 'string') o = [o, o];
    return '<option value="' + esc(o[0]) + '"' + (String(cur) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
  }).join('') + '</select>';
}
function inp(path, ph) { return '<input value="' + esc(getPath(S, path) || '') + '" placeholder="' + esc(ph || '') + '" onchange="M.setv(\'' + path + '\', this.value.trim())">'; }
function chk(path, label) { return '<label class="chk"><input type="checkbox"' + (getPath(S, path) ? ' checked' : '') + ' onchange="M.setb(\'' + path + '\', this.checked)"> <span>' + label + '</span></label>'; }
function row(label, control) { return '<div class="sf-row"><label>' + label + '</label>' + control + '</div>'; }
M.setv = function (p, v) { setPath(S, p, v); saveState(); };
M.setb = function (p, v) { setPath(S, p, v); saveState(); render(); };
function hint(html) { return '<details class="hint"><summary>💡 Подсказка</summary><div>' + html + '</div></details>'; }
function code(t) { return '<pre class="code">' + esc(t) + '</pre>'; }
function tasks(items) { return '<ol class="task">' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>'; }
function where(t) { return '<p class="small">📍 ' + t + '</p>'; }
function who(t) { return '<div class="who">👤 ' + t + '</div>'; }
function res(okFlag, msgs) { return { ok: okFlag, msgs: msgs }; }
function errs(list, okText) { return list.length ? res(false, list) : res(true, [okText]); }
function clockBar() {
  return '<div class="clock">🕘 Учебное время: <b>' + clockText(S.clock) + '</b> ' +
    [1, 5, 15, 1440].map(function (m) { return '<button class="mini" onclick="M.tick(' + m + ')">⏩ +' + (m === 1440 ? '1 день' : m + ' мин') + '</button>'; }).join('') + '</div>';
}
M.tick = function (m) { S.clock += m; var r = runQueue(); if (r.length) flash[S.current] = 'Обработчик очереди: ' + r.map(esc).join('; '); saveState(); render(); };

var MISSIONS = [];

/* ===== Шаг 0 ===== */
MISSIONS.push({ id: 's0', title: 'Договориться до начала работ', icon: '🤝',
  render: function () {
    return '<p class="lead">Задача проекта: по каждой заявке видеть, откуда пришёл человек, с какой страницы отправил форму, стал ли лид квалифицированным, закрыта ли сделка и сколько денег поступило.</p>' +
      '<div class="callout"><b>Главное правило:</b> у каждой заявки свой номер <code>submission_id</code>, у каждой сделки свой ID в Salesforce. Всё связывается через эти два номера.</div>' +
      '<div class="chain">' + [['🌐', 'Сайт', 'страницы, UTM, client_id'], ['🖥', 'Сервер', 'submission_id, очередь'], ['☁️', 'Salesforce', 'Lead → Opportunity'], ['📊', 'GA4', 'generate_lead + статусы'], ['💳', 'Finance', 'оплаты'], ['🗄', 'BigQuery', 'всё вместе'], ['📑', 'Looker Studio', 'отчёты']].map(function (c) {
        return '<div class="chain-step"><div class="chain-icon">' + c[0] + '</div><b>' + c[1] + '</b><small>' + c[2] + '</small></div>'; }).join('') + '</div>' +
      who('Владелец проекта') + '<p>Перед стартом зафиксируй три решения (правильных ответов нет — это договорённости, но от них зависит всё остальное):</p>' +
      choice('main_lead', '1. Какая заявка основная, если у клиента их несколько?', ['Первая заявка клиента', 'Последняя заявка перед созданием сделки', 'Все заявки, вес сделки делится между ними'], undefined, 'Записали. В шаге 10 это правило понадобится, чтобы связать сделку с заявкой.') +
      choice('amount', '2. Что значит «сумма сделки» в отчётах?', ['Стоимость контракта (Opportunity Amount)', 'Фактически полученные деньги (из платёжной системы)'], undefined, 'Записали. Эти цифры — разные метрики, и в шаге 9 они не складываются.') +
      choice('variant', '3. Как возвращать статусы из Salesforce в GA4?', ['Вариант А — встроенный импорт GA4 из Salesforce (проще, без разработки)', 'Вариант Б — через свой сервер и Measurement Protocol (гибче)'], undefined, 'Записали. Этот вариант будешь настраивать в шаге 8.') +
      '<h3>Этапы воронки</h3><table class="tbl"><tr><th>Этап</th><th>Когда считается достигнутым</th></tr>' +
      [['Заявка принята', 'Сервер сохранил заявку и выдал ей номер'], ['Доставлена в CRM', 'Salesforce создал запись или привязал к существующей'], ['Квалифицирована', 'Продажи подтвердили, что лид подходит'], ['Создана сделка', 'Есть связанная Opportunity'], ['Выиграна / проиграна', 'Сделка закрыта'], ['Оплачена', 'Финансы подтвердили платёж']].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>' +
      choice('q_conv', 'Проверь себя: конвертация лида в Salesforce (Lead Converted) — это то же самое, что выигранная сделка?', ['Да, это одно и то же', 'Нет, это разные этапы, считать отдельно'], 1, 'Конвертация создаёт сделку, но сделка ещё может быть проиграна.');
  },
  check: function () {
    var e = [];
    ['main_lead', 'amount', 'variant'].forEach(function (k, i) { if (S.ans[k] === undefined) e.push('Не принято решение ' + (i + 1) + '.'); });
    if (!ok('q_conv', 1)) e.push('Ответь верно на вопрос про конвертацию и выигрыш.');
    return errs(e, 'Договорённости зафиксированы.');
  }
});

/* ===== Шаг 1 ===== */
MISSIONS.push({ id: 's1', title: 'Доступы и тестовая среда', icon: '🔐',
  render: function () {
    return who('Аналитик, администратор Salesforce') +
      tasks(['Выдай исполнителям доступы нужного уровня — не больше, но и не меньше.', 'Запиши ID контейнера и потока.', 'Подготовь тестовую среду.']) +
      frame('sf', ['Матрица доступов проекта'],
        row('Google Tag Manager', sel('ans.acc_gtm', [['', '—'], ['read', 'Чтение'], ['edit', 'Изменение'], ['approve', 'Утверждение'], ['publish', 'Публикация']])) +
        row('GA4', sel('ans.acc_ga', [['', '—'], ['viewer', 'Читатель'], ['analyst', 'Аналитик'], ['editor', 'Редактор (Editor)'], ['admin', 'Администратор']])) +
        row('Salesforce', sel('ans.acc_sf', [['', '—'], ['standard', 'Standard User'], ['marketing', 'Marketing User'], ['sysadmin', 'System Administrator']])) +
        row('Google Cloud', sel('ans.acc_gcp', [['', '—'], ['none', 'Не нужен'], ['bq', 'Доступ к проекту для BigQuery']])) +
        chk('ans.acc_mad', 'Пользователю, который будет связывать Salesforce с GA4, выдано право <b>Modify All Data</b>') +
        row('ID контейнера GTM', inp('ans.id_gtm', 'GTM-XXXXXXX')) + row('ID потока GA4', inp('ans.id_ga', 'G-XXXXXXXXXX')) +
        chk('ans.env_ga', 'Создан отдельный тестовый ресурс GA4') + chk('ans.env_sf', 'Создан Salesforce Sandbox — все проверки делаем там')) +
      choice('q_secret', 'Где хранить секретные ключи (доступ к Salesforce, GA4 API secret)?', ['В коде сайта, чтобы фронтенд мог отправлять события', 'В git-репозитории, чтобы не потерялись', 'Только на сервере (в переменных окружения / хранилище секретов)'], 2, 'Ключ в браузере или в git может увидеть кто угодно и засорить данные.');
  },
  check: function () {
    var a = S.ans, e = [];
    if (a.acc_gtm !== 'publish') e.push('GTM: нужно право публикации — иначе изменения не выкатить.');
    if (a.acc_ga !== 'editor') e.push(a.acc_ga === 'admin' ? 'GA4: Администратор — больше, чем нужно. По документу достаточно Editor.' : 'GA4: нужен уровень Editor (настройка событий, импорта, связей).');
    if (a.acc_sf !== 'sysadmin') e.push('Salesforce: для настройки полей, Flow и импорта нужен System Administrator.');
    if (a.acc_gcp !== 'bq') e.push('Google Cloud: доступ нужен для BigQuery (шаг 10).');
    if (!a.acc_mad) e.push('Без Modify All Data не получится подключить Salesforce к GA4.');
    if ((a.id_gtm || '').trim() !== GTM_ID) e.push('Запиши ID своего контейнера GTM (' + GTM_ID.slice(0, 5) + '…).');
    if ((a.id_ga || '').trim() !== GA_MID) e.push('Запиши ID потока GA4 (G-EK…).');
    if (!a.env_ga || !a.env_sf) e.push('Подготовь тестовую среду: отдельный ресурс GA4 и Sandbox.');
    if (!ok('q_secret', 2)) e.push('Вопрос про секреты.');
    return errs(e, 'Доступы выданы, тестовая среда готова.');
  }
});

/* ===== Шаг 2 ===== */
MISSIONS.push({ id: 's2', title: 'GA4 через GTM', icon: '🏷',
  render: function () {
    var g = S.ga;
    return who('Аналитик, frontend-разработчик') +
      '<p>Установку ты уже сделала на учебном сайте: контейнер ' + GTM_ID + ', Google tag с ID ' + GA_MID + ' на Initialization – All Pages. Отметь и доделай остальное.</p>' +
      frame('gtm', ['Твой настоящий контейнер ' + GTM_ID],
        chk('ans.g_tag', 'Google tag (Tag ID = ' + GA_MID + ') на триггере <b>Initialization – All Pages</b>') +
        chk('ans.g_nodup', 'Других установок GA4 нет (прямой gtag удалён) — иначе данные задвоятся') +
        chk('ans.g_consent', 'Подключён баннер согласия на cookies (Consent Mode)') +
        chk('ans.g_preview', 'Проверено в Preview + DebugView: на каждую страницу ровно один page_view')) +
      frame('ga', ['Администратор', 'Сбор и изменение данных', 'Хранение данных'],
        row('Хранение данных о событиях', sel('ga.retention', [['2', '2 месяца'], ['14', '14 месяцев']])) +
        '<p class="small">По умолчанию 2 месяца — детальные отчёты (исследования) по старым заявкам пропадут.</p>') +
      frame('ga', ['Потоки данных', 'Green Corner', 'Настройки тега', 'Список нежелательных переходов'],
        '<div class="chips">' + (g.unwanted.length ? g.unwanted.map(function (d, i) { return '<span class="chip">' + esc(d) + ' <button class="link-btn" onclick="M.delRef(' + i + ')">✕</button></span>'; }).join('') : '<span class="empty-note">Список пуст</span>') + '</div>' +
        '<div class="inline-form"><input id="ref-dom" placeholder="домен, напр. paypal.com"><button class="ga-btn primary" onclick="M.addRef()">Добавить</button></div>' +
        '<p class="small">Добавь домены платёжных систем и сервисов, через которые проходит пользователь (оплата, календарь встреч), иначе источник заявки заменится на этот сервис.</p>') +
      frame('ga', ['Потоки данных', 'Настройки тега', 'Определение внутреннего трафика'],
        row('IP-адрес офиса', inp('ga.internalIp', 'напр. 203.0.113.10')) +
        row('Фильтр данных «Internal Traffic» (Администратор → Фильтры данных)', sel('ga.internalFilter', [['testing', 'Тестирование'], ['active', 'Активный'], ['inactive', 'Неактивный']]))) +
      choice('q_spa', 'Если сайт одностраничный (SPA): как учитывать просмотры?', ['И автоматически (история браузера), и вручную из кода — для надёжности', 'Выбрать один способ: либо автоматический, либо вручную из кода'], 1, 'Два способа сразу дают два page_view на один переход.') +
      choice('q_domains', 'Путь клиента идёт через сайт и отдельный домен личного кабинета. Что настроить?', ['Configure your domains — добавить все свои домены (кросс-доменное отслеживание)', 'Ничего, GA4 сам поймёт'], 0, 'Иначе переход между доменами начнёт новую сессию с источником «ваш же сайт».');
  },
  check: function () {
    var a = S.ans, g = S.ga, e = [];
    if (!a.g_tag || !a.g_nodup || !a.g_consent || !a.g_preview) e.push('Отметь все пункты установки в GTM (сделай их в настоящем контейнере).');
    if (g.retention !== '14') e.push('Хранение данных: поставь 14 месяцев.');
    if (!g.unwanted.some(function (d) { return /paypal|stripe|checkout|pay|yookassa|cloudpayments|calendly/i.test(d); })) e.push('Добавь в нежелательные переходы хотя бы один платёжный сервис.');
    if (g.unwanted.some(function (d) { return /github\.io|greencorner/i.test(d); })) e.push('Свой домен в нежелательные переходы добавлять не нужно — он и так исключается.');
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(g.internalIp || '')) e.push('Укажи IP-адрес офиса.');
    if (g.internalFilter !== 'active') e.push('Фильтр Internal Traffic остался в статусе «' + ({ testing: 'Тестирование', inactive: 'Неактивный' })[g.internalFilter] + '» — трафик сотрудников всё ещё попадает в отчёты. Переведи в «Активный».');
    if (!ok('q_spa', 1) || !ok('q_domains', 0)) e.push('Ответь на вопросы про SPA и домены.');
    return errs(e, 'GA4 установлен и настроен.');
  }
});
M.addRef = function () { var d = val('ref-dom').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''); if (d) { S.ga.unwanted.push(d); saveState(); render(); } };
M.delRef = function (i) { S.ga.unwanted.splice(i, 1); saveState(); render(); };

/* ===== Шаг 3 ===== */
function subsTable(list, cols) {
  if (!list.length) return '<p class="empty-note">Заявок пока нет.</p>';
  return '<div class="table-wrap"><table class="tbl"><tr>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '</tr>' +
    list.map(function (s) { return '<tr>' + cols.map(function (c) { var v = c[1](s); return '<td>' + (v === '' || v == null ? '<span class="bad-text">∅</span>' : v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
}
function shortPath(p) { return p ? '<code>' + esc(String(p).replace(/^\/gtm-practice-site/, '')) + '</code>' : ''; }
MISSIONS.push({ id: 's3', title: 'Страницы и источник визита', icon: '🧭',
  render: function () {
    var db = getDb();
    var ad = '../about.html?utm_source=google&utm_medium=cpc&utm_campaign=b2b_autumn';
    return who('Frontend-разработчик') +
      '<p>На учебном сайте это уже запрограммировано по документу: первое касание (не перезаписывается), касание визита, страница формы, страница кнопки (сбрасывается через 30 минут или после отправки), UTM, referrer, а client_id и session_id берутся через <code>gtag(\'get\')</code> с таймаутом 1,5 с.</p>' +
      tasks(['Открой «рекламную ссылку» в новой вкладке: <a href="' + ad + '" target="_blank">about.html?utm_source=google&amp;utm_medium=cpc…</a> — это статья.',
        'Перейди в <b>Каталог</b> (страница продукта).', 'Нажми в меню <b>«Для бизнеса»</b> — это кнопка, ведущая на форму.',
        'Включи «🛠 Показать, что уйдёт на сервер», посмотри поля и отправь форму.', 'Вернись сюда и проверь, что три страницы записались в правильные поля.']) +
      frame('srv', ['База заявок', 'context'], subsTable(db.submissions.slice().reverse(), [
        ['submission_id', function (s) { return '<code>' + esc(s.submission_id) + '</code>'; }],
        ['first_landing', function (s) { return shortPath(s.context.first_landing_path); }],
        ['session_landing', function (s) { return shortPath(s.context.session_landing_path); }],
        ['cta_origin', function (s) { return shortPath(s.context.cta_origin_path); }],
        ['form_page', function (s) { return shortPath(s.context.form_page_path); }],
        ['UTM визита', function (s) { var u = s.context.submission_utm || {}; return esc([u.source, u.medium, u.campaign].filter(Boolean).join(' / ')); }],
        ['client_id', function (s) { return s.context.ga_client_id ? '<code>' + esc(s.context.ga_client_id) + '</code>' : ''; }]])) +
      '<p class="small">client_id пустой? Значит GA4 не ответил за 1,5 с (блокировщик рекламы, отказ от cookie). Это нормально: форма работает, ничего не подставляем. Для тренировки дальше можно <button class="link-btn" onclick="M.fakeSub()">добавить учебную заявку с тестовым client_id</button>.</p>' +
      choice('q_utm', 'Маркетолог хочет поставить UTM-метки на баннер «Озеленение офиса» на главной, чтобы видеть клики. Что ответишь?', ['Отличная идея', 'Нельзя: UTM на внутренних ссылках сбрасывает настоящий источник визита. Для кликов есть события GTM'], 1, 'Переход по ссылке с UTM начинает в GA4 новую сессию с этим «источником».');
  },
  check: function () {
    var good = getDb().submissions.filter(function (s) {
      var c = s.context, f = c.form_page_path || '';
      return /lead\.html$/.test(f) && c.session_landing_path && c.session_landing_path !== f && c.cta_origin_path && c.cta_origin_path !== f && c.cta_origin_path !== c.session_landing_path && (c.submission_utm || {}).source;
    });
    var e = [];
    if (!good.length) e.push('Нет заявки, где страница входа, страница кнопки и страница формы — три разные страницы, и есть UTM визита. Пройди путь «рекламная ссылка → статья → каталог → «Для бизнеса» → форма».');
    if (!ok('q_utm', 1)) e.push('Вопрос про UTM на внутренних ссылках.');
    return errs(e, 'Путь «статья → продукт → форма» сохранился в правильных полях.');
  }
});
M.fakeSub = function () {
  var db = getDb(), n = db.submissions.length + 1, base = '/gtm-practice-site/';
  db.submissions.push({ submission_id: 'sub_sim' + rnd(5).toLowerCase(), idem_key: 'idem_sim' + rnd(6), received_at: new Date().toISOString(),
    contact: { first_name: 'Тест', last_name: 'Симуляция ' + n, email: 'sim' + n + '@company.example', phone: '+1 000 555-01' + n, company: 'ООО «Тест ' + n + '»', budget: '5000', description: '' },
    context: { site_id: 'main_site', form_id: 'business_contact', site_language: 'ru', ga_client_id: Math.floor(1e9 + Math.random() * 8e9) + '.' + Math.floor(Date.now() / 1000),
      ga_session_id: String(Math.floor(Date.now() / 1000) - 300), ga_measurement_id: GA_MID, first_landing_path: base + 'index.html', session_landing_path: base + 'about.html',
      form_page_path: base + 'lead.html', cta_origin_path: base + 'catalog.html', first_utm: { source: 'google', medium: 'organic', campaign: '' },
      submission_utm: { source: 'google', medium: 'cpc', campaign: 'b2b_autumn' }, first_referrer: 'https://www.google.com/', session_referrer: '', consent_analytics: true, submitted_at: new Date().toISOString(), simulated: true },
    delivery: { status: 'pending', attempts: 0, sf_lead_id: '', next_try_min: 0, log: [] } });
  saveDb(db); render();
};

/* ===== Шаг 4 ===== */
MISSIONS.push({ id: 's4', title: 'Отправка заявки через сервер', icon: '🖥',
  render: function () {
    var db = getDb();
    var reqs = db.requests.slice(-8).reverse().map(function (r) {
      return '<div class="log-step ' + (r.duplicate ? 'warn' : 'ok') + '">' + new Date(r.ts).toLocaleTimeString('ru-RU') + ' POST /api/leads idem=' + esc(r.idem_key.slice(0, 14)) + '… → ' + esc(r.submission_id) + (r.duplicate ? ' (повтор: тот же номер, дубль не создан)' : ' (создана)') + '</div>';
    }).join('') || '<p class="empty-note">Запросов не было.</p>';
    var queue = db.submissions.slice().reverse().map(function (s) {
      var d = s.delivery, st = { pending: '⏳ ожидает', retry: '🔁 повтор в ' + clockText(d.next_try_min), delivered: '✅ доставлено', failed: '⛔ ошибка' }[d.status];
      return '<div class="log-item"><div class="log-head"><code>' + esc(s.submission_id) + '</code> · ' + st + ' · попыток: ' + d.attempts + (d.sf_lead_id ? ' · Salesforce: <code>' + d.sf_lead_id + '</code>' : '') +
        (d.status === 'failed' ? ' <button class="mini" onclick="M.retry(\'' + s.submission_id + '\')">Повторить вручную</button>' : '') + '</div>' +
        d.log.slice(-4).map(function (l) { return '<div class="log-step ' + (l.ok ? 'ok' : 'error') + '">' + clockText(l.min) + ' — ' + esc(l.text) + '</div>'; }).join('') + '</div>';
    }).join('') || '<p class="empty-note">Очередь пуста.</p>';
    return who('Backend-разработчик') + '<p>Схема: сайт → свой сервер → Salesforce. Сервер выдаёт <code>submission_id</code>, хранит заявку и сам доставляет её в Salesforce с повторами. Тебе как аналитику важно уметь проверить, что это работает.</p>' +
      tasks(['<b>Двойной клик:</b> открой <a href="../lead.html" target="_blank">форму</a>, заполни и быстро нажми «Отправить заявку» два раза. В журнале запросов должно быть два запроса и один номер.',
        '<b>Salesforce недоступен:</b> включи переключатель ниже, нажми «Запустить обработчик очереди» — заявка должна остаться в очереди. Промотай время, потом «почини» Salesforce.',
        'Заявки сейчас будут падать с ошибкой <code>INVALID_FIELD</code> — в Salesforce ещё нет полей. Это нормально: поля создашь в шаге 5 и вернёшься сюда.']) +
      frame('srv', ['Журнал запросов POST /api/leads'], reqs) +
      frame('srv', ['Очередь доставки в Salesforce'],
        '<div class="toolbar"><label class="chk"><input type="checkbox"' + (S.sf.down ? ' checked' : '') + ' onchange="M.setb(\'sf.down\', this.checked)"> 🔌 Salesforce недоступен (503)</label>' +
        '<button class="sf-btn brand" onclick="M.queue()">▶ Запустить обработчик очереди</button></div>' + clockBar() + queue) +
      '<p class="small">Если своего сервера нет, можно начать с Web-to-Lead, но там лимит 500 заявок в сутки, нет подтверждения доставки и защиты от дублей.</p>' +
      choice('q_srv', 'Почему событие заявки в GA4 отправляется только после ответа сервера «сохранено»?', ['Так быстрее', 'Чтобы в GA4 не было «заявок», которые на самом деле не сохранились, и у события был submission_id', 'Так требует Salesforce'], 1, 'Событие должно означать реально принятую заявку и нести её номер.');
  },
  check: function () {
    var db = getDb(), e = [];
    if (!db.requests.some(function (r) { return r.duplicate; })) e.push('Нет повторного запроса с тем же ключом — сделай тест двойного клика.');
    if (!db.submissions.some(function (s) { return s.delivery.log.some(function (l) { return /503/.test(l.text); }); })) e.push('Не было попытки доставки при недоступном Salesforce — включи 🔌 и запусти обработчик.');
    if (!ok('q_srv', 1)) e.push('Вопрос про порядок «сохранено → событие».');
    return errs(e, 'Дубли не создаются, а при сбое Salesforce заявка ждёт в очереди.');
  }
});
M.queue = function () { var r = runQueue(); flash.s4 = r.length ? r.map(esc).join('<br>') : 'Нечего обрабатывать — нет заявок, которым пора доставляться.'; render(); };
M.retry = function (id) { retryFailed(id); M.queue(); };

/* ===== Шаг 5 ===== */
function fieldList(obj) {
  var fs = S.sf.fields[obj];
  return '<table class="tbl sf"><tr><th>Метка</th><th>Имя поля (API)</th><th>Тип</th><th></th></tr>' +
    (fs.length ? fs.map(function (f, i) {
      return '<tr><td>' + esc(f.label) + '</td><td><code>' + esc(f.name) + '__c</code></td><td>' + esc(f.type) + (f.length ? '(' + f.length + ')' : '') + '</td><td><button class="link-btn" onclick="M.delField(\'' + obj + '\',' + i + ')">Удалить</button></td></tr>';
    }).join('') : '<tr><td colspan="4" class="empty-note">Настраиваемых полей нет</td></tr>') + '</table>';
}
var FIELD_TYPES = [['Text', 'Text'], ['DateTime', 'Date/Time'], ['Date', 'Date'], ['Number', 'Number'], ['Picklist', 'Picklist']];
MISSIONS.push({ id: 's5', title: 'Поля в Salesforce', icon: '🧩',
  render: function () {
    var obj = ui.obj, lf = S.sf.fields.Lead, of = S.sf.fields.Opportunity;
    var map = '<table class="tbl sf"><tr><th>Поле лида</th><th>→ Поле сделки (Opportunity)</th></tr>' + (lf.length ? lf.map(function (f) {
      var cur = S.sf.leadMap[f.name + '__c'] || '';
      return '<tr><td><code>' + f.name + '__c</code></td><td><select onchange="M.mapField(\'' + f.name + '__c\', this.value)"><option value="">— не сопоставлено —</option>' +
        of.map(function (o) { return '<option' + (cur === o.name + '__c' ? ' selected' : '') + '>' + o.name + '__c</option>'; }).join('') + '</select></td></tr>';
    }).join('') : '<tr><td colspan="2" class="empty-note">Сначала создай поля на Lead</td></tr>') + '</table>';
    return who('Администратор Salesforce') +
      tasks(['Создай поля из таблицы документа на <b>Lead</b> и такие же на <b>Opportunity</b>: Text(255), а <code>SUBMITTED_AT</code> — Date/Time.',
        'Первые три поля — строго <code>GACLIENTID</code>, <code>GAUSERID</code>, <code>GAMEASUREMENTID</code>, заглавными: этого требует импорт Google.',
        'Сделай поля «только чтение» для менеджеров (Field-Level Security).', 'Map Lead Fields: сопоставь поля лида с полями сделки, чтобы при конвертации данные переходили.',
        'Вернись в шаг 4 и нажми «Повторить вручную» у заявок с ошибкой — они должны доставиться.']) +
      hint('Список полей: ' + REQ_FIELDS.map(function (f) { return '<code>' + f[0] + '</code>'; }).join(', ') + '. Salesforce сам добавит окончание <code>__c</code>.') +
      '<div class="tabs">' + ['Lead', 'Opportunity'].map(function (o) { return '<button class="tab' + (o === obj ? ' active' : '') + '" onclick="M.obj(\'' + o + '\')">' + (o === 'Lead' ? 'Лид' : 'Сделка (Opportunity)') + ' · ' + S.sf.fields[o].length + '</button>'; }).join('') + '</div>' +
      frame('sf', ['Setup', 'Object Manager', obj, 'Fields & Relationships'],
        '<div class="toolbar"><b>Создать поле</b></div>' +
        '<div class="form-grid4"><select id="nf-type">' + FIELD_TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select>' +
        '<input id="nf-label" placeholder="Метка (Field Label)" oninput="$(\'nf-name\').value=this.value.trim().replace(/[^A-Za-z0-9]+/g,\'_\').replace(/^_|_$/g,\'\')">' +
        '<input id="nf-name" placeholder="Имя поля (Field Name)"><input id="nf-len" type="number" value="255" title="Длина">' +
        '<button class="sf-btn brand" onclick="M.addField()">Сохранить</button></div>' +
        '<details class="bulk"><summary>⚡ Создать несколько полей сразу (как через Change Set / Metadata API)</summary>' +
        '<textarea id="bulk" rows="5" placeholder="Одно имя поля на строку, напр.\nFIRST_LANDING_PATH\nSESSION_LANDING_PATH"></textarea>' +
        '<div class="inline-form"><select id="bulk-type">' + FIELD_TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select><button class="sf-btn brand" onclick="M.bulk()">Создать</button>' +
        (obj === 'Opportunity' ? '<button class="sf-btn" onclick="M.copyFromLead()">Скопировать набор полей с Lead</button>' : '') + '</div></details>' +
        (ui.fieldErr ? '<div class="sf-error">' + ui.fieldErr + '</div>' : '') + fieldList(obj)) +
      frame('sf', ['Setup', 'Object Manager', 'Lead', 'Field-Level Security'], chk('sf.flsReadOnly', 'Для профилей менеджеров эти поля <b>Read-Only</b>; запись — только у пользователя интеграции')) +
      frame('sf', ['Setup', 'Object Manager', 'Lead', 'Fields & Relationships', 'Map Lead Fields'], map);
  },
  check: function () {
    var e = [];
    ['Lead', 'Opportunity'].forEach(function (obj) {
      var missing = REQ_FIELDS.filter(function (f) { return !fieldExists(obj, f[0]); }).map(function (f) { return f[0]; });
      if (missing.length) e.push(obj + ': не хватает полей ' + missing.slice(0, 4).join(', ') + (missing.length > 4 ? ' и ещё ' + (missing.length - 4) : '') + '.');
      S.sf.fields[obj].forEach(function (f) {
        var lower = REQ_FIELDS.filter(function (r) { return r[0].toLowerCase() === f.name.toLowerCase() && r[0] !== f.name; })[0];
        if (lower) e.push(obj + ': <code>' + f.name + '</code> → должно быть строго <code>' + lower[0] + '</code> (заглавными).');
        if (f.name === 'SUBMITTED_AT' && f.type !== 'DateTime') e.push(obj + ': SUBMITTED_AT должен быть типа Date/Time.');
        if (f.name !== 'SUBMITTED_AT' && REQ_FIELDS.some(function (r) { return r[0] === f.name; }) && (f.type !== 'Text' || +f.length !== 255)) e.push(obj + ': ' + f.name + ' — нужен Text(255).');
      });
    });
    if (!S.sf.flsReadOnly) e.push('Сделай поля «только чтение» для менеджеров.');
    var unmapped = S.sf.fields.Lead.filter(function (f) { return S.sf.leadMap[f.name + '__c'] !== f.name + '__c'; });
    if (unmapped.length) e.push('Map Lead Fields: ' + unmapped.length + ' пол. не сопоставлено с одноимёнными полями сделки.');
    if (!e.length && !getDb().submissions.some(function (s) { return s.delivery.status === 'delivered'; })) e.push('Поля готовы. Теперь вернись в шаг 4 и доставь заявки («Повторить вручную»).');
    return errs(e, 'Поля созданы, данные переходят в сделку, заявки доставляются.');
  }
});
M.obj = function (o) { ui.obj = o; ui.fieldErr = ''; render(); };
function addFieldTo(obj, name, label, type, len) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || /__/.test(name) || /_$/.test(name)) return 'Имя «' + name + '»: только латиница, цифры и одиночные «_», не заканчивается на «_».';
  if (fieldExists(obj, name)) return 'Поле ' + name + '__c уже существует.';
  S.sf.fields[obj].push({ name: name, label: label || name, type: type, length: type === 'Text' ? (+len || 255) : null });
}
M.addField = function () { ui.fieldErr = addFieldTo(ui.obj, val('nf-name').trim(), val('nf-label').trim(), val('nf-type'), val('nf-len')) || ''; saveState(); render(); };
M.bulk = function () {
  var errsL = []; val('bulk').split(/\s+/).filter(Boolean).forEach(function (n) { var r = addFieldTo(ui.obj, n.replace(/__c$/, ''), n, val('bulk-type'), 255); if (r) errsL.push(r); });
  ui.fieldErr = errsL.join('<br>'); saveState(); render();
};
M.copyFromLead = function () { S.sf.fields.Lead.forEach(function (f) { if (!fieldExists('Opportunity', f.name)) S.sf.fields.Opportunity.push(JSON.parse(JSON.stringify(f))); }); saveState(); render(); };
M.delField = function (obj, i) { S.sf.fields[obj].splice(i, 1); saveState(); render(); };
M.mapField = function (lf, of) { S.sf.leadMap[lf] = of; saveState(); };

/* ===== Шаг 6 ===== */
var DIMS_REQ = ['form_id', 'site_id', 'site_language', 'form_page_path', 'cta_origin_path', 'first_landing_path', 'session_landing_path'];
MISSIONS.push({ id: 's6', title: 'Событие заявки в GA4', icon: '🎯',
  render: function () {
    var g = S.ga;
    var t = tracked(), db = getDb();
    return who('Frontend-разработчик, аналитик') +
      '<p>Сайт после ответа сервера пушит в dataLayer (без имени, email и телефона):</p>' +
      code('{ event: "lead_form_success", lead_submission_id: "sub_…", form_id: "business_contact",\n  first_landing_path, session_landing_path, form_page_path, cta_origin_path,\n  site_id: "main_site", site_language: "ru" }') +
      frame('gtm', ['Твой настоящий контейнер ' + GTM_ID, 'это делается руками в GTM'],
        chk('ans.t_dlv', 'Variables → New → Data Layer Variable: по переменной на каждое поле (DLV - form_id, DLV - lead_submission_id …)') +
        chk('ans.t_trg', 'Triggers → New → Custom Event, Event name <code>lead_form_success</code>, название «CE - lead_form_success»') +
        chk('ans.t_tag', 'Tags → New → GA4 Event, Event name <code>generate_lead</code>, параметры из переменных, триггер CE - lead_form_success') +
        chk('ans.t_prev', 'В Preview: успешная отправка → ровно одно generate_lead; ошибка в форме → события нет') +
        '<p class="small">Сайт сам следит, чтобы событие было одно на submission_id: сейчас в базе ' + db.submissions.length + ' заявок, событий отправлено ' + t.length + '.</p>') +
      frame('ga', ['Администратор', 'Отображение данных', 'Специальные определения'],
        '<table class="tbl ga"><tr><th>Параметр события</th><th>Область</th><th></th></tr>' + (g.dims.length ? g.dims.map(function (d, i) { return '<tr><td><code>' + esc(d.param) + '</code></td><td>' + (d.scope === 'event' ? 'Событие' : 'Пользователь') + '</td><td><button class="link-btn" onclick="M.delDim(' + i + ')">Архивировать</button></td></tr>'; }).join('') : '<tr><td colspan="3" class="empty-note">Пусто</td></tr>') + '</table>' +
        '<div class="inline-form"><input id="dim-param" placeholder="имя параметра, напр. form_id"><select id="dim-scope"><option value="event">Событие</option><option value="user">Пользователь</option></select><button class="ga-btn primary" onclick="M.addDim()">Создать</button></div>') +
      frame('ga', ['Администратор', 'Отображение данных', 'Ключевые события'],
        '<table class="tbl ga">' + Object.keys(g.keyEvents).map(function (k) { return '<tr><td><code>' + k + '</code></td><td><label class="switch"><input type="checkbox"' + (g.keyEvents[k] ? ' checked' : '') + ' onchange="M.setb(\'ga.keyEvents.' + k + '\', this.checked)"><span></span></label></td></tr>'; }).join('') + '</table>') +
      choice('q_value', 'Задать generate_lead денежную ценность, например $50, «чтобы было видно в отчётах»?', ['Да, так удобнее', 'Нет: выдуманная ценность искажает данные; деньги придут со сделкой'], 1, 'Документ прямо запрещает выдуманную ценность заявки.') +
      choice('q_formsubmit', 'Почему автоматическое событие form_submit не подходит как конверсия?', ['Оно срабатывает даже при ошибке отправки', 'Оно слишком редкое'], 0, 'Нужна отправка, подтверждённая сервером.');
  },
  check: function () {
    var a = S.ans, g = S.ga, e = [];
    if (!a.t_dlv || !a.t_trg || !a.t_tag || !a.t_prev) e.push('Сделай и отметь все шаги в настоящем GTM.');
    var missing = DIMS_REQ.filter(function (p) { return !g.dims.some(function (d) { return d.param === p && d.scope === 'event'; }); });
    if (missing.length) e.push('Создай специальные параметры (область «Событие»): ' + missing.join(', ') + '.');
    if (g.dims.some(function (d) { return /submission|client_id/.test(d.param); })) e.push('Номера заявок и client_id регистрировать не нужно (уникальные значения → «(other)»).');
    if (!g.keyEvents.generate_lead) e.push('Отметь generate_lead как ключевое событие.');
    if (g.keyEvents.form_submit) e.push('form_submit не должен быть ключевым событием.');
    if (!ok('q_value', 1) || !ok('q_formsubmit', 0)) e.push('Ответь на вопросы.');
    return errs(e, 'generate_lead настроен: одно событие на заявку, без контактных данных.');
  }
});
M.addDim = function () { var p = val('dim-param').trim(); if (p) { S.ga.dims.push({ param: p, scope: val('dim-scope') }); saveState(); render(); } };
M.delDim = function (i) { S.ga.dims.splice(i, 1); saveState(); render(); };

/* ===== Шаг 7 ===== */
var EV_OPTS = [['', '—'], ['generate_lead', 'generate_lead'], ['working_lead', 'working_lead'], ['qualify_lead', 'qualify_lead'], ['disqualify_lead', 'disqualify_lead'], ['close_convert_lead', 'close_convert_lead'], ['close_unconvert_lead', 'close_unconvert_lead'], ['purchase', 'purchase']];
MISSIONS.push({ id: 's7', title: 'Статусы в Salesforce', icon: '🚦',
  render: function () {
    return who('Администратор Salesforce, отдел продаж') +
      frame('sf', ['Setup', 'Object Manager', 'Set History Tracking'],
        chk('sf.history.LeadStatus', 'Lead → Lead Status') + chk('sf.history.OppStage', 'Opportunity → Stage') + chk('sf.history.OppAmount', 'Opportunity → Amount') +
        '<p class="small">История пишется только с момента включения — включай заранее.</p>') +
      frame('sf', ['Сопоставление статусов и событий GA4'],
        '<table class="tbl sf"><tr><th>Что произошло в Salesforce</th><th>Событие GA4</th></tr>' + TRANSITIONS.map(function (t) {
          return '<tr><td>' + t.text + ' <small>(' + t.obj + ': ' + t.value + ')</small></td><td>' + sel('ans.map_' + t.key, EV_OPTS) + '</td></tr>'; }).join('') + '</table>') +
      frame('sf', ['Setup', 'Object Manager', 'Lead / Opportunity'],
        chk('sf.reasonField', 'Создано поле-список «Причина» (варианты из шага 0) на Lead и Opportunity') +
        chk('sf.reasonRule', 'Validation Rule: причина обязательна при переходе в «Не подходит» и Closed Lost')) +
      choice('dates', 'Как фиксировать дату квалификации и дату выигрыша?', ['Брать LastModifiedDate', 'Отдельные поля: дата первой квалификации и дата закрытия сделки'], 1, 'LastModifiedDate меняется при любой правке записи — дата «выигрыша» уедет.') +
      choice('flow_when', 'Record-Triggered Flow: когда запускать для обновлённых записей?', ['Every time a record is updated and meets the condition requirements', 'Only when a record is updated to meet the condition requirements'], 1, 'Тогда событие срабатывает только при реальной смене статуса, и повторное сохранение Closed Won не создаёт новую продажу.') +
      choice('reopen', 'Договорённость: сделку переоткрыли или изменили сумму после выигрыша. Как учитываем?', ['Отчёт берёт первую дату выигрыша, изменения суммы — отдельной корректировкой', 'Перезаписываем: в отчёте последняя сумма и последняя дата выигрыша', 'Переоткрытие = отмена выигрыша, повторный выигрыш — новая продажа'], undefined, 'Записали правило — его проверит тест №10 в шаге 12.');
  },
  check: function () {
    var e = [], h = S.sf.history;
    if (!h.LeadStatus || !h.OppStage || !h.OppAmount) e.push('Включи историю для Lead Status, Opportunity Stage и Amount.');
    TRANSITIONS.forEach(function (t) { if (S.ans['map_' + t.key] !== t.event) e.push('«' + t.text + '» → неверное событие.'); });
    if (!S.sf.reasonField || !S.sf.reasonRule) e.push('Сделай причину отказа обязательной (поле + Validation Rule).');
    if (!ok('dates', 1)) e.push('Даты квалификации и выигрыша — в отдельные поля.');
    if (!ok('flow_when', 1)) e.push('Режим запуска Flow выбран неверно.');
    if (S.ans.reopen === undefined) e.push('Зафиксируй правило для переоткрытия сделки.');
    return errs(e, 'Статусы, причины и даты настроены.');
  }
});

/* ===== Шаг 8 ===== */
function salesConsole() {
  var leads = S.sf.leads, opps = S.sf.opps;
  if (!ui.rec && leads.length) { ui.rec = leads[0].Id; ui.recType = 'Lead'; }
  var list = '<div class="cols2"><div><b>Лиды</b><table class="tbl sf clickable">' + (leads.length ? leads.map(function (l) {
    return '<tr class="' + (ui.rec === l.Id ? 'sel' : '') + '" onclick="M.rec(\'Lead\',\'' + l.Id + '\')"><td>' + esc(l.FirstName + ' ' + l.LastName) + '<br><small>' + esc(l.Company) + (l.f.GACLIENTID__c ? '' : ' · без client_id') + '</small></td><td>' + RU[l.Status] + '</td></tr>'; }).join('') : '<tr><td class="empty-note">Нет лидов — доставь заявки (шаг 4)</td></tr>') + '</table></div>' +
    '<div><b>Сделки</b><table class="tbl sf clickable">' + (opps.length ? opps.map(function (o) {
      return '<tr class="' + (ui.rec === o.Id ? 'sel' : '') + '" onclick="M.rec(\'Opp\',\'' + o.Id + '\')"><td>' + esc(o.Name) + '<br><small>$' + o.Amount + '</small></td><td>' + RU[o.Stage] + '</td></tr>'; }).join('') : '<tr><td class="empty-note">Конвертируй лид</td></tr>') + '</table></div></div>';
  var det = '';
  var reasonSel = '<select id="reason"><option value="">— причина —</option>' + REASONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select>';
  if (ui.recType === 'Lead' && findLead(ui.rec)) {
    var l = findLead(ui.rec);
    det = '<div class="lead-card"><b>' + esc(l.FirstName + ' ' + l.LastName) + '</b> · ' + RU[l.Status] + (l.Reason ? ' · причина: ' + esc(l.Reason) : '') + (l.QualifiedDate ? ' · квалифицирован: ' + l.QualifiedDate : '') +
      '<div class="path">' + LEAD_STATUSES.map(function (s) { return '<button class="path-step' + (l.Status === s ? ' cur' : '') + '" onclick="M.lead(\'' + s + '\')"' + (l.IsConverted ? ' disabled' : '') + '>' + RU[s] + '</button>'; }).join('') + '</div>' +
      '<div class="toolbar">' + reasonSel + '<button class="sf-btn" onclick="M.resaveLead()"' + (l.IsConverted ? ' disabled' : '') + '>✏️ Сохранить запись ещё раз</button><button class="sf-btn brand" onclick="M.convert()"' + (l.IsConverted ? ' disabled' : '') + '>Convert → сделка</button></div>' +
      '<small>GACLIENTID__c: <code>' + esc(l.f.GACLIENTID__c || '∅') + '</code> · заявок: ' + S.sf.subs.filter(function (s) { return s.leadId === l.Id; }).length + '</small></div>';
  } else if (ui.recType === 'Opp' && findOpp(ui.rec)) {
    var o = findOpp(ui.rec);
    det = '<div class="lead-card"><b>' + esc(o.Name) + '</b> · ' + RU[o.Stage] + ' · $' + o.Amount + (o.LostReason ? ' · причина: ' + esc(o.LostReason) : '') + (o.CloseDate ? ' · закрыта: ' + o.CloseDate : '') +
      '<div class="path">' + ['Prospecting', 'Proposal', 'Closed Won', 'Closed Lost'].map(function (s) { return '<button class="path-step' + (o.Stage === s ? ' cur' : '') + '" onclick="M.opp(\'' + s + '\')">' + RU[s] + '</button>'; }).join('') + '</div>' +
      '<div class="toolbar">' + reasonSel + '<button class="sf-btn" onclick="M.opp(\'' + o.Stage + '\', true)">✏️ Сохранить ещё раз</button><button class="sf-btn" onclick="M.amount()">💲 Сумма +10%</button></div>' +
      '<small>GACLIENTID__c на сделке: <code>' + esc(o.f.GACLIENTID__c || ((findLead(o.LeadId) || {f: {}}).f.GACLIENTID__c ? '∅ (не перенеслось — проверь Map Lead Fields)' : '∅ (у лида тоже не было client_id)')) + '</code></small></div>';
  }
  var log = S.events.slice(0, 10).map(function (e) {
    return '<div class="log-item"><div class="log-head"><b>' + clockText(e.min) + '</b> ' + esc(e.name) + ': ' + esc(e.change) + '</div>' + e.steps.map(function (s) { return '<div class="log-step ' + s.k + '">' + { ok: '✓', skip: '⏭', warn: '⚠️', error: '⛔' }[s.k] + ' ' + esc(s.t) + '</div>'; }).join('') + '</div>';
  }).join('') || '<p class="empty-note">Пока пусто.</p>';
  var ga = S.gaReceived.slice().reverse().slice(0, 12).map(function (e) {
    return '<tr><td>' + e.name + '</td><td><small>' + esc(e.recId) + '</small></td><td>' + (e.via === 'import' ? 'импорт' : 'MP') + '</td><td>' + clockText(e.eventTime) + '</td><td>' + esc(Object.keys(e.params).filter(function (k) { return e.params[k] !== undefined && ['value', 'currency', 'reason'].indexOf(k) !== -1; }).map(function (k) { return k + '=' + e.params[k]; }).join(', ')) + '</td></tr>';
  }).join('');
  return clockBar() + '<div class="test-grid"><div>' + frame('sales', ['Лиды и сделки'], list + det) + '</div><div>' +
    frame('sf', ['Журнал: изменения и Flow'], (S.ga.imp.created ? '<button class="sf-btn brand" onclick="M.import()">▶ Запустить импорт сейчас (вариант А)</button> ' : '') +
      (S.sf.flow.active ? '<button class="sf-btn" onclick="M.replay()">↺ Salesforce повторил последний вызов</button>' : '') + log) +
    frame('ga', ['Полученные события'], ga ? '<table class="tbl ga"><tr><th>Событие</th><th>Запись</th><th>Как</th><th>Время события</th><th>Параметры</th></tr>' + ga + '</table>' : '<p class="empty-note">Событий нет.</p>') + '</div></div>';
}
M.rec = function (t, id) { ui.recType = t; ui.rec = id; render(); };
function act(r) { if (r && r.error) flash[S.current] = '⛔ ' + r.error; render(); }
M.lead = function (s) { act(setLeadStatus(ui.rec, s, val('reason'))); };
M.resaveLead = function () { resaveLead(ui.rec); render(); };
M.convert = function () { var o = convertLead(ui.rec); if (o) { ui.recType = 'Opp'; ui.rec = o.Id; } render(); };
M.opp = function (s) { act(setOppStage(ui.rec, s, val('reason'))); };
M.amount = function () { editOppAmount(ui.rec); render(); };
M.import = function () { flash[S.current] = runImport().map(esc).join('<br>'); render(); };
M.replay = function () { if (!replayLastCallout()) flash[S.current] = 'Ещё не было вызовов.'; render(); };

MISSIONS.push({ id: 's8', title: 'Передать статусы в GA4', icon: '🔁',
  render: function () {
    var v = S.ans.variant, tab = ui.variantTab || (v === 1 ? 'B' : 'A'), imp = S.ga.imp;
    var A = frame('ga', ['Администратор', 'Сбор и изменение данных', 'Импорт данных', 'Создать источник данных'],
      row('Название', inp('ga.imp.name', 'Salesforce statuses')) +
      row('Тип данных', sel('ga.imp.dataType', [['', '—'], ['events', 'Данные о событиях (Events)'], ['cost', 'Данные о расходах'], ['item', 'Данные о товарах']])) +
      chk('ga.imp.terms', 'Review terms: условия импорта приняты') +
      row('Источник', '<b>Web → Salesforce</b>') +
      row('Authenticate: войти в Salesforce как', sel('ga.imp.user', [['', '—'], ['manager', 'manager@greencorner (Standard User)'], ['integration', 'integration@greencorner (Modify All Data)']])) +
      row('Расписание', sel('ga.imp.schedule', [['', '—'], ['hourly', 'Ежечасно'], ['daily', 'Ежедневно'], ['weekly', 'Еженедельно']])) +
      '<div class="fb-sub">Этапы (milestones)</div>' +
      chk('ga.imp.ms.created', 'Лид создан → generate_lead') + TRANSITIONS.map(function (t) { return chk('ga.imp.ms.' + t.key, t.text + ' → ' + (t.key === 'won' ? 'событие ниже' : t.event)); }).join('') +
      '<div class="fb-sub">Выигранная сделка — какое событие</div>' + chk('ga.imp.won.purchase', 'purchase') + chk('ga.imp.won.close_convert_lead', 'close_convert_lead') +
      '<button class="ga-btn primary" onclick="M.createImport()">' + (imp.created ? 'Обновить источник' : 'Import') + '</button>' + (imp.created ? ' <span class="pill">источник создан</span>' : ''));
    var B = frame('ga', ['Потоки данных', 'Green Corner', 'Секретные ключи Measurement Protocol'],
        (S.ga.ackTerms ? '' : chk('ga.ackTerms', 'Подтверждаю условия сбора данных пользователей')) +
        '<table class="tbl ga">' + (S.ga.secrets.map(function (s) { return '<tr><td>' + esc(s.nick) + '</td><td><code>' + esc(s.value) + '</code></td></tr>'; }).join('') || '<tr><td class="empty-note">Нет ключей</td></tr>') + '</table>' +
        '<div class="inline-form"><input id="sec-nick" placeholder="псевдоним, напр. backend_statuses"><button class="ga-btn primary" onclick="M.secret()"' + (S.ga.ackTerms ? '' : ' disabled') + '>Создать</button></div>') +
      frame('sf', ['Setup', 'Named Credentials + Flow'],
        row('URL Named Credential', inp('sf.ncUrl', 'https://…')) +
        row('Flow запускается', '<b>' + (S.ans.flow_when === 1 ? 'Only when a record is updated to meet the condition requirements' : S.ans.flow_when === 0 ? 'Every time a record is updated and meets the condition requirements' : 'режим не выбран — шаг 7') + ' <small>(задаётся в шаге 7)</small>' + '</b>') +
        chk('sf.flow.async', 'Вызов сервера стоит на пути <b>Run Asynchronously</b>') + chk('sf.flow.active', '<b>Flow активен</b>')) +
      frame('srv', ['Обработчик /salesforce/status', 'настройки backend'],
        row('Ключ защиты от дублей', sel('server.dedup', [['', '— нет —'], ['record_event', 'ID записи + тип события'], ['client', 'client_id + тип события'], ['record_change_event', 'ID записи + ID изменения + тип события']])) +
        chk('server.realTime', 'Передавать реальное время события (timestamp_micros = время изменения статуса)') +
        chk('server.skipNoClient', 'Если у записи нет client_id — в GA4 не отправлять') +
        row('GA4 api_secret (переменная окружения)', inp('server.secret', 'значение секрета')) +
        '<button class="sf-btn" onclick="M.debugMp()">🧪 Проверить формат через /debug/mp/collect</button>' + (ui.debugOut ? code(ui.debugOut) : ''));
    return who(tab === 'A' ? 'Аналитик, администратор Salesforce' : 'Backend-разработчик, администратор Salesforce') +
      '<p>В шаге 0 ты выбрала <b>вариант ' + (v === 1 ? 'Б' : v === 0 ? 'А' : '— (не выбран)') + '</b>. Для каждого статуса работает ровно один вариант — если включить оба, события задвоятся.</p>' +
      '<div class="tabs"><button class="tab' + (tab === 'A' ? ' active' : '') + '" onclick="M.vtab(\'A\')">Вариант А · встроенный импорт</button><button class="tab' + (tab === 'B' ? ' active' : '') + '" onclick="M.vtab(\'B\')">Вариант Б · свой сервер</button></div>' +
      (tab === 'A' ? A : B) +
      '<h3>Проверка: поработай за отдел продаж</h3>' +
      tasks(['Переведи лид с client_id в «Квалифицирован»' + (tab === 'A' ? ' и запусти импорт' : '') + ' — в GA4 должно появиться ровно одно событие.', 'Сохрани запись ещё раз — нового события быть не должно.',
        'Конвертируй лид, выиграй сделку, сохрани её ещё раз.' + (tab === 'B' ? ' Нажми «↺ Salesforce повторил вызов» — сервер должен отсечь дубль.' : '')]) +
      salesConsole() +
      '<p class="small">Сделку, закрытую через месяц после заявки, GA4 не привяжет к исходному визиту — точная связь строится в BigQuery (шаг 10).</p>';
  },
  check: function () {
    var v = S.ans.variant, e = [], imp = S.ga.imp, f = S.sf.flow;
    if (v === undefined) return res(false, ['Сначала выбери вариант в шаге 0.']);
    if (v === 0) {
      if (!imp.created) e.push('Создай источник импорта.');
      else {
        if (imp.dataType !== 'events') e.push('Тип данных — события (Events).');
        if (!imp.terms) e.push('Прими условия (Review terms).');
        if (imp.user !== 'integration') e.push('Нужен пользователь с Modify All Data.');
        if (imp.schedule !== 'daily') e.push(imp.schedule === 'hourly' ? 'Ежечасный импорт доступен только в GA4 360 — в обычном GA4 ежедневный.' : 'Расписание: ежедневно.');
        if (imp.ms.created) e.push('Не импортируй создание лида: generate_lead уже отправляется с сайта — будет дубль.');
        if (imp.won.purchase && imp.won.close_convert_lead) e.push('Для выигранной сделки выбери одно событие: purchase ИЛИ close_convert_lead. Оба — двойная выручка.');
        if (!imp.won.purchase && !imp.won.close_convert_lead && imp.ms.won) e.push('Выбери событие для выигранной сделки.');
      }
      if (f.active) e.push('Выключи Flow варианта Б — иначе статусы задвоятся.');
    } else {
      if (!S.ga.secrets.length) e.push('Создай секрет Measurement Protocol.');
      if (!S.ga.secrets.some(function (s) { return s.value === S.server.secret; })) e.push('Секрет на сервере не совпадает с секретом в GA4.');
      if ((S.sf.ncUrl || '').replace(/\/+$/, '') !== 'https://api.greencorner.example') e.push('Flow должен звать ваш сервер (https://api.greencorner.example), а не GA4 напрямую.');
      if (!f.async || !f.active) e.push('Flow: путь Run Asynchronously и активация.');
      if (S.server.dedup !== 'record_change_event') e.push('Ключ защиты от дублей: ID записи + ID изменения + тип события.');
      if (!S.server.realTime) e.push('Передавай реальное время события.');
      if (!S.server.skipNoClient) e.push('Без client_id не отправлять.');
      if (!S.server.validated) e.push('Проверь формат через /debug/mp/collect.');
      if (imp.created && Object.keys(imp.ms).some(function (k) { return imp.ms[k]; })) e.push('Выключи этапы импорта варианта А — иначе статусы задвоятся.');
    }
    var q = S.gaReceived.filter(function (x) { return x.name === 'qualify_lead'; });
    if (!e.length && !q.length) e.push('Настройка готова — переведи лид в «Квалифицирован»' + (v === 0 ? ' и запусти импорт.' : '.'));
    var dup = {}; S.gaReceived.forEach(function (x) { var k = x.recId + x.name; dup[k] = (dup[k] || 0) + 1; });
    if (Object.keys(dup).some(function (k) { return dup[k] > 1; })) e.push('В GA4 есть дубли (одно событие дважды для одной записи). Найди причину в журнале, исправь и нажми «Сбросить события GA4».');
    return errs(e, 'Статусы доходят до GA4, ровно одно событие на переход.');
  }
});
M.vtab = function (t) { ui.variantTab = t; render(); };
M.createImport = function () { S.ga.imp.created = true; S.ga.imp.imported = S.ga.imp.imported || {}; saveState(); flash.s8 = 'Источник данных сохранён.'; render(); };
M.secret = function () { var n = val('sec-nick').trim(); if (!n) return; S.ga.secrets.push({ nick: n, value: rnd(22) }); saveState(); render(); };
M.debugMp = function () {
  var l = S.sf.leads.filter(function (x) { return x.f.GACLIENTID__c; })[0];
  var body = { client_id: l ? l.f.GACLIENTID__c : '', events: [{ name: 'qualify_lead', params: { session_id: l ? l.f.GA_SESSION_ID__c : '', engagement_time_msec: 1 } }] };
  ui.debugOut = 'POST /debug/mp/collect\n' + JSON.stringify(body, null, 1) + '\n\n← 200 ' + JSON.stringify({ validationMessages: validateMp(body) });
  if (l) S.server.validated = true; else ui.debugOut += '\n(Нет лида с client_id — проверка формата неполная.)';
  saveState(); render();
};

/* ===== Шаг 9 ===== */
MISSIONS.push({ id: 's9', title: 'Суммы и оплаты', icon: '💳',
  render: function () {
    return who('Finance, отдел продаж') +
      '<p>Сделка <b>006X</b> выиграна: контракт на <b>30 000 EUR</b>. Выгрузка из платёжной системы:</p>' +
      '<table class="tbl"><tr><th>payment_id</th><th>Сделка</th><th>Дата</th><th>Сумма, EUR</th><th>Статус</th></tr>' + SAMPLE.payments.map(function (p) {
        return '<tr' + (p.dup ? ' class="dim"' : '') + '><td><code>' + p.payment_id + '</code></td><td>' + p.opportunity_id + '</td><td>' + p.date + '</td><td>' + p.amount.toLocaleString('ru-RU') + '</td><td>' + p.status + (p.refund_of ? ' (к ' + p.refund_of + ')' : '') + '</td></tr>'; }).join('') + '</table>' +
      '<p class="small">Подсказка к таблице: одна строка попала в выгрузку дважды.</p>' +
      frame('ls', ['Посчитай показатели'],
        row('Closed Won Amount, EUR', inp('ans.p_won', 'число')) + row('Cash Received, EUR', inp('ans.p_cash', 'число')) + row('Net Cash Received, EUR', inp('ans.p_net', 'число')) +
        row('Источник курса валют', inp('ans.p_rate', 'напр. ЕЦБ')) + row('На какую дату курс', inp('ans.p_rate_date', 'напр. дата оплаты'))) +
      choice('p_main', 'Главный показатель «денег» для отчёта (договорённость):', ['Closed Won Amount', 'Cash Received', 'Net Cash Received'], undefined, 'Записали. Остальные показываем рядом, но не складываем.') +
      choice('q_sum', 'Руководитель просит «итого: контракты + поступления». Что ответишь?', ['Сложу: 30 000 + 15 000', 'Эти цифры не складываются: контракт — обещание, оплаты — часть этого же обещания'], 1, 'Сумма сделки (Amount) ≠ полученные деньги.');
  },
  check: function () {
    var a = S.ans, e = [], n = function (x) { return +String(x || '').replace(/[\s,]/g, ''); };
    if (n(a.p_won) !== 30000) e.push('Closed Won Amount — это стоимость контракта.');
    if (n(a.p_cash) !== 15000) e.push('Cash Received: сложи уникальные оплаты (дубль pay_2 считать один раз, возврат — отдельно).');
    if (n(a.p_net) !== 13000) e.push('Net Cash Received = поступления минус возвраты.');
    if (!a.p_rate || !a.p_rate_date) e.push('Зафиксируй правило пересчёта валют: источник и дату курса.');
    if (a.p_main === undefined || !ok('q_sum', 1)) e.push('Выбери главный показатель и ответь на вопрос.');
    return errs(e, 'Суммы посчитаны верно: дубль и возврат учтены.');
  }
});

/* ===== Шаг 10 ===== */
function joinTotals() {
  var j = S.ans, subs = SAMPLE.submissions, opps = SAMPLE.opps, pays = SAMPLE.payments.filter(function (p) { return j.bq_dedup ? !p.dup : true; });
  var dealRows = 0, won = 0, paySum = 0;
  opps.forEach(function (o) {
    var matched = j.k_opp === 'main' ? subs.filter(function (s) { return s.submission_id === o.main_submission; }) : j.k_opp === 'client' ? subs.filter(function (s) { return s.client_id === o.client_id; }) : [];
    dealRows += matched.length; if (o.stage === 'Closed Won') won += o.amount * matched.length;
  });
  pays.forEach(function (p) {
    var o = j.k_pay === 'opp' ? opps.filter(function (x) { return x.opportunity_id === p.opportunity_id; })[0] : null;
    var times = 0;
    if (j.k_pay === 'opp' && o) times = j.k_opp === 'main' ? 1 : j.k_opp === 'client' ? subs.filter(function (s) { return s.client_id === o.client_id; }).length : 0;
    if (j.k_pay === 'client') times = subs.filter(function (s) { return s.client_id === p.client_id; }).length;
    paySum += p.amount * times;
  });
  return { dealRows: dealRows, won: won, paySum: paySum };
}
MISSIONS.push({ id: 's10', title: 'Свести данные в BigQuery', icon: '🗄',
  render: function () {
    var bq = S.ga.bq, t = joinTotals();
    return who('Аналитик или разработчик данных') +
      frame('ga', ['Администратор', 'Связи с продуктами', 'BigQuery', 'Связать'],
        row('Проект Google Cloud', inp('ga.bq.project', 'напр. greencorner-analytics')) +
        row('Регион данных', sel('ga.bq.region', [['', '—'], ['EU', 'EU (multi-region)'], ['US', 'US (multi-region)'], ['europe-west3', 'europe-west3']])) +
        chk('ga.bq.daily', 'Частота экспорта: <b>Ежедневно (Daily)</b>') + chk('ans.bq_budget', 'В Billing → Budgets &amp; alerts поставлен лимит расходов') +
        '<p class="small">Данные пойдут со следующего дня, прошлые периоды не выгружаются — включай как можно раньше.</p>') +
      frame('gcp', ['Ключи связи таблиц'],
        row('События GA4 ↔ заявка', sel('ans.k_ga', [['', '—'], ['pseudo_session', 'user_pseudo_id (= client_id) + ga_session_id'], ['event_name', 'event_name'], ['page', 'page_location']])) +
        row('Заявка ↔ Lead / Contact', sel('ans.k_sub', [['', '—'], ['submission', 'submission_id'], ['email', 'email'], ['client', 'client_id']])) +
        row('Сделка ↔ заявка', sel('ans.k_opp', [['', '—'], ['main', 'opportunity_id → основная заявка (main_submission)'], ['client', 'client_id']])) +
        row('Оплата ↔ сделка', sel('ans.k_pay', [['', '—'], ['opp', 'opportunity_id'], ['client', 'client_id']])) +
        chk('ans.bq_dedup', 'Перед суммированием убрать дубли платежей по payment_id')) +
      frame('gcp', ['Контроль после объединения (учебный набор: 4 заявки, 2 сделки, оплаты из шага 9)'],
        '<table class="tbl"><tr><th>Проверка</th><th>В источнике</th><th>После объединения</th></tr>' +
        '<tr><td>Строк-сделок</td><td>2</td><td class="' + (t.dealRows === 2 ? 'good' : 'bad-text') + '">' + t.dealRows + '</td></tr>' +
        '<tr><td>Сумма выигранных контрактов</td><td>30 000</td><td class="' + (t.won === 30000 ? 'good' : 'bad-text') + '">' + t.won.toLocaleString('ru-RU') + '</td></tr>' +
        '<tr><td>Сумма оплат (net)</td><td>13 000</td><td class="' + (t.paySum === 13000 ? 'good' : 'bad-text') + '">' + t.paySum.toLocaleString('ru-RU') + '</td></tr></table>' +
        '<p class="small">У клиента 111.1 две заявки. Если связать сделку или оплаты через client_id, суммы размножатся.</p>');
  },
  check: function () {
    var bq = S.ga.bq, a = S.ans, e = [], t = joinTotals();
    if (!bq.project || !bq.region || !bq.daily) e.push('Свяжи GA4 с BigQuery: проект, регион, Daily.');
    if (!a.bq_budget) e.push('Поставь лимит расходов в Billing.');
    if (a.k_ga !== 'pseudo_session') e.push('События GA4 связываются с заявкой через user_pseudo_id + ga_session_id.');
    if (a.k_sub !== 'submission') e.push('Заявка связывается с Lead/Contact через submission_id.');
    if (t.dealRows !== 2 || t.won !== 30000 || t.paySum !== 13000) e.push('После объединения цифры не совпадают с источником — проверь ключи сделок и оплат и дедупликацию.');
    return errs(e, 'Данные сведены: число сделок и сумма оплат не выросли.');
  }
});

/* ===== Шаг 11 ===== */
MISSIONS.push({ id: 's11', title: 'Отчёты', icon: '📑',
  render: function () {
    var dateOpts = [['', '—'], ['sub', 'Дата заявки'], ['close', 'Дата закрытия сделки'], ['pay', 'Дата оплаты']];
    var fOpts = [['', '—'], ['uniq', 'Число уникальных submission_id'], ['deliv', 'Доставленные / принятые заявки'], ['qual', 'Квалифицированные / все заявки той же группы'], ['win', 'Won / (Won + Lost)'], ['cash', 'Оплаты минус возвраты']];
    var rowsS = {}; SAMPLE.submissions.forEach(function (s) { var k = S.ans.r_touch === 1 ? s.first_source : s.source; var r = rowsS[k] = rowsS[k] || { n: 0, q: 0 }; r.n++; if (s.qualified) r.q++; });
    return who('Аналитик, владелец проекта') +
      frame('ls', ['Три отчёта — по какой дате строится каждый'], row('Привлечение', sel('ans.r_acq', dateOpts)) + row('Продажи', sel('ans.r_sales', dateOpts)) + row('Деньги', sel('ans.r_money', dateOpts))) +
      frame('ls', ['Как считать метрики'], row('Заявки', sel('ans.f_leads', fOpts)) + row('Доставка в CRM', sel('ans.f_deliv', fOpts)) + row('Доля квалификации', sel('ans.f_qual', fOpts)) + row('Win rate', sel('ans.f_win', fOpts)) + row('Поступления', sel('ans.f_cash', fOpts))) +
      frame('ls', ['Привлечение (учебный набор)', 'модель источника: ' + (S.ans.r_touch === 1 ? 'первое касание' : 'касание заявки')],
        '<div class="toolbar"><button class="mini" onclick="M.pick(\'r_touch\',0)">Касание заявки</button><button class="mini" onclick="M.pick(\'r_touch\',1)">Первое касание</button></div>' +
        '<table class="tbl"><tr><th>Источник / канал</th><th>Заявки</th><th>Квалиф.</th><th>Доля</th></tr>' + Object.keys(rowsS).map(function (k) { var r = rowsS[k]; return '<tr><td>' + k + '</td><td>' + r.n + '</td><td>' + r.q + '</td><td>' + Math.round(r.q / r.n * 100) + '%</td></tr>'; }).join('') + '</table>' +
        '<p class="small">Обновлено: ' + new Date().toLocaleDateString('ru-RU') + ' · заявок без источника: 0%</p>') +
      choice('q_touch', 'Можно ли в одном отчёте сложить «заявки по первому касанию» и «заявки по касанию заявки»?', ['Да, будет полная картина', 'Нет: показывать отдельно, суммы не складывать'], 1, 'Это два взгляда на одни и те же заявки — сумма их удвоит.') +
      choice('q_cnt', 'В GA4 generate_lead = 96, а в CRM 100 заявок. Что считать основным?', ['GA4', 'BigQuery (заявки по submission_id)', 'Среднее'], 1, 'Часть посетителей блокирует аналитику — GA4 не видит все заявки.');
  },
  check: function () {
    var a = S.ans, e = [];
    if (a.r_acq !== 'sub' || a.r_sales !== 'close' || a.r_money !== 'pay') e.push('Даты отчётов: привлечение — дата заявки, продажи — дата закрытия, деньги — дата оплаты.');
    if (a.f_leads !== 'uniq' || a.f_deliv !== 'deliv' || a.f_qual !== 'qual' || a.f_win !== 'win' || a.f_cash !== 'cash') e.push('Проверь формулы метрик.');
    if (!ok('q_touch', 1) || !ok('q_cnt', 1)) e.push('Ответь на вопросы.');
    return errs(e, 'Отчёты спроектированы.');
  }
});

/* ===== Шаг 12 ===== */
function launchTests() {
  var db = getDb(), subs = db.submissions, sfSubs = S.sf.subs, ga = S.gaReceived;
  function has(fn) { return fn() ? 'pass' : 'todo'; }
  var wonOpps = S.sf.opps.filter(function (o) { return o.Stage === 'Closed Won'; });
  var t = [
    ['Статья → продукт → Contact: все страницы в правильных полях', MISSIONS[3].check().ok ? 'pass' : 'todo', 'Шаг 3'],
    ['Ошибка в обязательном поле → нет generate_lead', S.ans.t_prev ? 'pass' : 'todo', 'Проверка в GTM Preview (шаг 6)'],
    ['Успешная отправка → одна заявка и одно событие', has(function () { var tr = tracked(); return subs.length && subs.filter(function (s) { return !s.context.simulated; }).every(function (s) { return tr.indexOf(s.submission_id) !== -1; }); }), 'Каждая заявка с сайта отмечена одним lead_form_success'],
    ['Двойной клик → тот же submission_id', has(function () { return db.requests.some(function (r) { return r.duplicate; }); }), 'Шаг 4'],
    ['Salesforce недоступен → заявка ждёт и доставляется позже', has(function () { return subs.some(function (s) { return s.delivery.status === 'delivered' && s.delivery.log.some(function (l) { return /503/.test(l.text); }); }); }), 'Шаг 4: 503, затем доставка'],
    ['Две заявки одного человека → две записи', has(function () { var c = {}; sfSubs.forEach(function (s) { c[s.leadId] = (c[s.leadId] || 0) + 1; }); return Object.keys(c).some(function (k) { return c[k] > 1; }); }), 'Отправь вторую заявку с тем же email'],
    ['Конвертация лида → поля перенесены в сделку', has(function () { return S.sf.opps.some(function (o) { return o.f.GACLIENTID__c; }); }), 'Шаг 5 (Map Lead Fields) + Convert'],
    ['Квалификация и Lost → статусы, причины, время', has(function () { return S.sf.leads.some(function (l) { return l.Status === 'Unqualified' && l.Reason; }) && S.sf.opps.some(function (o) { return o.Stage === 'Closed Lost' && o.LostReason; }) && S.sf.history.LeadStatus; }), 'Лид «Не подходит» и сделка «Проиграна» с причиной'],
    ['Won и повторное сохранение → одна продажа', has(function () { return wonOpps.length && wonOpps.every(function (o) { return ga.filter(function (g) { return g.recId === o.Id && /purchase|close_convert_lead/.test(g.name); }).length === 1; }) && S.sf.changes.some(function (c) { return c.obj === 'Opportunity' && c.from === c.to && c.to === 'Closed Won' || c.field === 'Amount'; }); }), 'Выиграй сделку и сохрани её ещё раз'],
    ['Переоткрытие и изменение суммы → по правилу шага 7', S.ans.reopen !== undefined ? 'pass' : 'todo', 'Правило зафиксировано'],
    ['Оплата, повтор, возврат → суммы сходятся', MISSIONS[9].check().ok && MISSIONS[10].check().ok ? 'pass' : 'todo', 'Шаги 9–10'],
    ['Отказ от cookies → форма работает, источник пустой', has(function () { return subs.some(function (s) { return s.context.consent_analytics === false && !s.context.ga_client_id; }); }), 'На сайте: 🍪 Настройки cookie → «Отклонить все» → отправить форму']
  ];
  return t;
}
MISSIONS.push({ id: 's12', title: 'Тест и запуск', icon: '🚀',
  render: function () {
    var t = launchTests();
    return who('QA, аналитик, разработчики, администратор Salesforce') +
      '<table class="tbl"><tr><th>#</th><th>Тест</th><th>Как проверить</th><th>Пройден</th></tr>' + t.map(function (r, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + r[0] + '</td><td><small>' + r[2] + '</small></td><td>' + (r[1] === 'pass' ? '✅' : '⏳') + '</td></tr>'; }).join('') + '</table>' +
      '<h3>Консоль для тестов</h3>' + salesConsole() +
      choice('q_order', 'Порядок выкатки на production?', ['Сайт → сервер → поля в Salesforce', 'Поля в Salesforce → сервер → сайт', 'Всё одновременно'], 1, 'Иначе сайт начнёт отправлять данные, которые некуда записать.') +
      choice('q_rollback', 'Что-то сломалось после запуска. Что делать?', ['Откатить сайт целиком', 'Выключить проблемный тег в GTM или передачу статусов — приём заявок продолжит работать'], 1, 'Приём заявок — главное, его не трогаем.') +
      chk('ans.owner', 'Назначен ответственный: раз в неделю проверяет ошибки доставки, дубли, пустые ID, свежесть отчёта, расхождение сумм');
  },
  check: function () {
    var bad = launchTests().filter(function (r) { return r[1] !== 'pass'; }), e = bad.map(function (r) { return '⏳ ' + r[0]; });
    if (!ok('q_order', 1) || !ok('q_rollback', 1)) e.push('Ответь на вопросы о запуске.');
    if (!S.ans.owner) e.push('Назначь ответственного.');
    return errs(e, '🎓 Все тесты пройдены, одна заявка прослеживается до сделки и суммы. Лаборатория завершена!');
  }
});

/* =========================================================
   НАВИГАЦИЯ
   ========================================================= */
var lastCheck = {};
M.go = function (id) { S.current = id; saveState(); lastCheck = {}; render(); window.scrollTo(0, 0); };
M.check = function () { var m = current(); lastCheck[m.id] = m.check(); render(); };
M.reset = function () { if (confirm('Сбросить прогресс лаборатории? Заявки на учебном сервере останутся.')) { resetState(); ui = { obj: 'Lead', rec: null, recType: 'Lead', variantTab: null }; lastCheck = {}; render(); } };
M.resetGa = function () { S.gaReceived = []; S.server.sentKeys = []; S.ga.imp.imported = {}; S.events = []; saveState(); render(); };
M.resetServer = function () { if (confirm('Удалить все заявки с учебного сервера и лиды/сделки в Salesforce?')) { localStorage.removeItem('gc_server_db'); localStorage.removeItem('gc_tracked_submissions'); S.sf.leads = []; S.sf.opps = []; S.sf.subs = []; S.sf.changes = []; M.resetGa(); } };
function current() { return MISSIONS.filter(function (m) { return m.id === S.current; })[0] || MISSIONS[0]; }
function render() {
  var cur = current(), idx = MISSIONS.indexOf(cur);
  var states = MISSIONS.map(function (m) { try { return m.check().ok; } catch (e) { return false; } });
  var done = states.filter(Boolean).length;
  $('nav').innerHTML = MISSIONS.map(function (m, i) {
    return '<button class="nav-item' + (m === cur ? ' active' : '') + '" onclick="M.go(\'' + m.id + '\')"><span class="nav-ico">' + (states[i] ? '✅' : m.icon) + '</span><span><small>Шаг ' + i + '</small>' + m.title + '</span></button>';
  }).join('') + '<div class="nav-tools"><button class="nav-reset" onclick="M.resetGa()">↺ Сбросить события GA4</button><button class="nav-reset" onclick="M.resetServer()">🗑 Очистить заявки и CRM</button><button class="nav-reset" onclick="M.reset()">↺ Сбросить прогресс</button></div>';
  $('progress').style.width = Math.round(done / MISSIONS.length * 100) + '%';
  $('progress-text').textContent = done + ' / ' + MISSIONS.length;
  var r = lastCheck[cur.id];
  $('main').innerHTML = '<div class="m-head"><small>Шаг ' + idx + ' из ' + (MISSIONS.length - 1) + '</small><h2>' + cur.icon + ' ' + cur.title + '</h2></div>' +
    (flash[cur.id] ? '<div class="flash">' + flash[cur.id] + '</div>' : '') + cur.render() +
    '<div class="m-foot"><button class="btn" onclick="M.check()">Проверить шаг</button>' + (idx < MISSIONS.length - 1 ? '<button class="btn ghost" onclick="M.go(\'' + MISSIONS[idx + 1].id + '\')">Следующий →</button>' : '') + '</div>' +
    (r ? '<div class="feedback ' + (r.ok ? 'ok' : 'bad') + '">' + r.msgs.map(function (m) { return '<div>' + (r.ok ? '✅ ' : '') + m + '</div>'; }).join('') + '</div>' : '');
  delete flash[cur.id];
}
document.addEventListener('DOMContentLoaded', function () {
  loadState(); saveState(); render();
  window.addEventListener('storage', function (e) { if (/gc_server_db|gc_tracked/.test(e.key)) render(); });
});
