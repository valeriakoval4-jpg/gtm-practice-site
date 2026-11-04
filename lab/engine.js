/* =========================================================
   Лаборатория GA4 ⇄ Salesforce — «движок» симуляции
   Состояние, псевдо-Salesforce (поля, Web-to-Lead, Flow),
   псевдо-GA4 (секреты, ключевые события, приём Measurement Protocol)
   ========================================================= */
var LAB_KEY = 'gc_lab_state_v1';
var GA_PROPERTY_MID = 'G-EK6764V55Q';      // ID потока данных твоего ресурса GA4
var LEAD_STATUSES = ['New', 'Working', 'Qualified', 'Unqualified', 'Converted'];
var STATUS_RU = { New: 'Новый', Working: 'В работе', Qualified: 'Квалифицирован', Unqualified: 'Не квалифицирован', Converted: 'Конвертирован' };
var GA_LEAD_EVENTS = ['generate_lead', 'working_lead', 'qualify_lead', 'disqualify_lead', 'close_convert_lead', 'close_unconvert_lead'];
var RESERVED_EVENTS = ['ad_activeview', 'ad_click', 'ad_exposure', 'ad_query', 'ad_reward', 'adunit_exposure', 'app_clear_data', 'app_exception', 'app_install', 'app_remove', 'app_store_refund', 'app_update', 'app_upgrade', 'dynamic_link_app_open', 'dynamic_link_app_update', 'dynamic_link_first_open', 'error', 'firebase_campaign', 'firebase_in_app_message_action', 'first_open', 'first_visit', 'notification_dismiss', 'notification_foreground', 'notification_open', 'notification_receive', 'notification_send', 'os_update', 'session_start', 'user_engagement'];

/* Стандартные поля Лида, которые уже есть в «org» */
var STANDARD_LEAD_FIELDS = [
  { label: 'Имя', api: 'FirstName', type: 'Text', std: true },
  { label: 'Фамилия', api: 'LastName', type: 'Text', std: true },
  { label: 'Email', api: 'Email', type: 'Email', std: true },
  { label: 'Телефон', api: 'Phone', type: 'Phone', std: true },
  { label: 'Компания', api: 'Company', type: 'Text', std: true },
  { label: 'Описание', api: 'Description', type: 'Long Text Area', std: true },
  { label: 'Статус лида', api: 'Status', type: 'Picklist', std: true },
  { label: 'Источник лида', api: 'LeadSource', type: 'Picklist', std: true },
  { label: 'ID записи', api: 'Id', type: 'ID', std: true },
  { label: 'Бюджет', api: 'Budget__c', type: 'Currency', std: false, preset: true, sfid: '00N5g00000Bdg01' }
];

function defaultState() {
  return {
    version: 1,
    current: 'brief',
    ga: {
      secrets: [],              // {nickname, value, real}
      ackTerms: false,
      keyEvents: { page_view: false, scroll: false, generate_lead: false, working_lead: false, qualify_lead: false, disqualify_lead: false, close_convert_lead: false },
      dims: [],                 // {name, scope, param}
      realSend: false
    },
    sf: {
      fields: [],               // кастомные поля {label, api, type, length, sfid}
      w2l: { generated: false, included: [], mapping: {} },
      processedWebIds: [],
      leads: [],
      extCred: null,            // {name, protocol, principal}
      permSet: { assigned: false, principalAccess: false },
      nc: null,                 // {label, name, url, extCred, generateAuth}
      settings: { Measurement_ID__c: '', API_Secret__c: '' },
      flow: {
        label: '', object: '', trigger: '', conditions: [], when: '', optimize: '', asyncPath: false, calloutPath: '',
        decision: { New: '', Working: '', Qualified: '', Unqualified: '', Converted: '' },
        action: {
          nc: '', method: '', path: '',
          query: { measurement_id: '', api_secret: '' },
          body: { client_id: '', session_id: '', engagement_time_msec: '', lead_id: '', lead_source: '', value: '', currency: '', debug_mode: '' }
        },
      },
      flowSaved: null,          // последняя сохранённая версия Flow {..., version}
      flowActive: null          // активная версия — именно она исполняется (может быть старше последней!)
    },
    log: [],                    // запуски Flow
    gaReceived: [],             // события, принятые «GA4»
    quiz: {},
    seeded: false
  };
}

var S;
function loadState() {
  try { S = JSON.parse(localStorage.getItem(LAB_KEY)); } catch (e) { S = null; }
  if (!S || S.version !== 1) S = defaultState();
  if (!S.seeded) {
    S.sf.leads.push({
      Id: '00Q5g000001TrAde', FirstName: 'Олег', LastName: 'Петров', Email: 'oleg@expo-partner.example', Phone: '+1 000 111-22-33',
      Company: 'ТД «Выставка»', Description: 'Познакомились на выставке, ввёл менеджер вручную', Status: 'New',
      LeadSource: 'Trade Show', Budget__c: 3000, custom: {}, origin: 'manual'
    });
    S.seeded = true;
  }
}
function saveState() { try { localStorage.setItem(LAB_KEY, JSON.stringify(S)); } catch (e) {} }
function resetState() { localStorage.removeItem(LAB_KEY); S = null; loadState(); saveState(); }

/* ---------- утилиты ---------- */
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function rnd(n, abc) { abc = abc || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; var s = ''; for (var i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; }
function sfId(prefix) { return prefix + rnd(15 - prefix.length, '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'); }
function nowIso() { return new Date().toISOString(); }
function time(iso) { var d = new Date(iso); return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function getOutbox() { try { return JSON.parse(localStorage.getItem('gc_sf_outbox')) || []; } catch (e) { return []; } }
function allLeadFields() { return STANDARD_LEAD_FIELDS.concat(S.sf.fields); }
function findField(api) { return allLeadFields().filter(function (f) { return f.api === api; })[0]; }
function apiFromLabel(label) {
  var base = label.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  return base ? base + '__c' : '';
}
// Найти кастомное поле по смыслу (для проверок): client / session / gclid / utm_source ...
function fieldBy(re) { return S.sf.fields.filter(function (f) { return re.test(f.api) || re.test(f.label); })[0]; }
var FIELD_RE = {
  ga_client_id: /client/i, ga_session_id: /session/i, gclid: /gclid/i,
  utm_source: /utm.?source/i, utm_medium: /utm.?medium/i, utm_campaign: /utm.?campaign/i
};
function leadValue(lead, api) {
  if (!lead) return '';
  if (api in lead && api !== 'custom') return lead[api];
  return lead.custom ? lead.custom[api] : '';
}
function leadClientId(lead) { var f = fieldBy(FIELD_RE.ga_client_id); return f ? leadValue(lead, f.api) : ''; }
function leadSessionId(lead) { var f = fieldBy(FIELD_RE.ga_session_id); return f ? leadValue(lead, f.api) : ''; }

/* ---------- Web-to-Lead: превращаем заявки сайта в Лиды ---------- */
function processOutbox() {
  var created = 0;
  getOutbox().forEach(function (w) {
    if (S.sf.processedWebIds.indexOf(w.web_id) !== -1) return;
    var lead = {
      Id: sfId('00Q5g0000'), FirstName: w.first_name, LastName: w.last_name, Email: w.email, Phone: w.phone,
      Company: w.company, Description: w.description, Status: 'New', LeadSource: 'Web', Budget__c: +w.budget || 0,
      custom: {}, origin: 'web', web_id: w.web_id, raw: w
    };
    Object.keys(S.sf.w2l.mapping).forEach(function (formField) {
      var api = S.sf.w2l.mapping[formField];
      if (api && w[formField] !== undefined) lead.custom[api] = w[formField];
    });
    S.sf.leads.unshift(lead);
    S.sf.processedWebIds.push(w.web_id);
    created++;
  });
  saveState();
  return created;
}

/* ---------- ресурсы Flow: {!$Record.X}, {!$CustomMetadata...} ---------- */
function flowResources() {
  var r = allLeadFields().map(function (f) { return '{!$Record.' + f.api + '}'; });
  r.push('{!$CustomMetadata.GA4_Settings__mdt.Default.Measurement_ID__c}');
  r.push('{!$CustomMetadata.GA4_Settings__mdt.Default.API_Secret__c}');
  return r;
}
function resolveValue(expr, lead) {
  expr = (expr || '').trim();
  var m = expr.match(/^\{!\s*(.+?)\s*\}$/);
  if (!m) return { value: expr, literal: true };
  var path = m[1];
  if (path.indexOf('$Record.') === 0) {
    var api = path.slice(8);
    if (!findField(api)) return { error: 'Ресурс ' + expr + ' не найден: у Лида нет поля ' + api };
    var v = leadValue(lead, api);
    return { value: v == null ? '' : v };
  }
  if (path.indexOf('$CustomMetadata.GA4_Settings__mdt.Default.') === 0) {
    var k = path.split('.').pop();
    if (!(k in S.sf.settings)) return { error: 'Поле ' + k + ' не найдено в GA4_Settings__mdt' };
    return { value: S.sf.settings[k] };
  }
  return { error: 'Неизвестный ресурс ' + expr };
}

/* ---------- условия входа Flow ---------- */
function condResult(c, lead, prev) {
  var cur = String(leadValue(lead, c.field) == null ? '' : leadValue(lead, c.field));
  var old = prev ? String(leadValue(prev, c.field) == null ? '' : leadValue(prev, c.field)) : '';
  var want = String(c.value || '').trim();
  switch (c.op) {
    case 'equals': return cur === want;
    case 'not_equals': return cur !== want;
    case 'is_null': return (want === 'True') === (cur === '');
    case 'is_changed': return (want === 'True') === (!!prev && cur !== old);
    default: return false;
  }
}
function conditionsMet(f, lead, prev) {
  if (!f.conditions.length) return true;
  return f.conditions.every(function (c) { return condResult(c, lead, prev); });
}

/* ---------- проверки при сохранении Flow (как в Flow Builder) ---------- */
function flowSaveErrors(f) {
  f = f || S.sf.flow; var e = [];
  if (!f.label.trim()) e.push('Укажите имя Flow.');
  if (!f.object) e.push('Стартовый элемент: выберите объект.');
  if (!f.trigger) e.push('Стартовый элемент: выберите, когда запускать Flow.');
  if (!f.optimize) e.push('Стартовый элемент: выберите «Оптимизировать Flow для».');
  if (f.optimize === 'fast') e.push('Действие HTTP-запроса нельзя добавить во Flow, оптимизированный для «Быстрых обновлений полей» (before-save). Выберите «Действия и связанные записи».');
  if (f.trigger && f.trigger !== 'create' && !f.when) e.push('Для обновлённых записей выберите, когда запускать Flow.');
  f.conditions.forEach(function (c, i) { if (!c.field || !c.op) e.push('Условие ' + (i + 1) + ': заполните поле и оператор.'); });
  if (f.calloutPath === 'async' && !f.asyncPath) e.push('Путь «Run Asynchronously» не включён в стартовом элементе.');
  if (!f.calloutPath) e.push('Выберите, на каком пути стоит HTTP-запрос.');
  var a = f.action;
  if (!a.nc) e.push('HTTP-запрос: выберите Named Credential.');
  else if (!S.sf.nc || S.sf.nc.name !== a.nc) e.push('HTTP-запрос: Named Credential «' + a.nc + '» не существует.');
  if (!a.method) e.push('HTTP-запрос: выберите метод.');
  if (!a.path.trim()) e.push('HTTP-запрос: укажите путь URL.');
  var any = LEAD_STATUSES.some(function (s) { return f.decision[s]; });
  if (!any) e.push('Элемент «Решение»: ни для одного статуса не задано событие GA4.');
  [a.query.measurement_id, a.query.api_secret].concat(Object.keys(a.body).map(function (k) { return a.body[k]; })).forEach(function (v) {
    if (/^\{!/.test((v || '').trim())) { var r = resolveValue(v, {}); if (r.error) e.push(r.error); }
  });
  return e;
}

/* ---------- Measurement Protocol: валидатор (как /debug/mp/collect) ---------- */
function validateMp(body) {
  var msgs = [];
  if (!body.client_id && !body.app_instance_id) msgs.push({ fieldPath: 'client_id', validationCode: 'VALUE_REQUIRED', description: 'Measurement requires a client_id.' });
  (body.events || []).forEach(function (ev, i) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(ev.name || '')) msgs.push({ fieldPath: 'events[' + i + '].name', validationCode: 'NAME_INVALID', description: 'Event name "' + (ev.name || '') + '" is invalid. Names must start with a letter and contain only letters, numbers, underscores (max 40).' });
    else if (RESERVED_EVENTS.indexOf(ev.name) !== -1) msgs.push({ fieldPath: 'events[' + i + '].name', validationCode: 'NAME_RESERVED', description: 'Event name "' + ev.name + '" is reserved.' });
    Object.keys(ev.params || {}).forEach(function (p) {
      var v = ev.params[p];
      if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(p)) msgs.push({ fieldPath: 'events[' + i + '].params.' + p, validationCode: 'NAME_INVALID', description: 'Param name "' + p + '" is invalid.' });
      if (typeof v === 'string' && v.length > 100) msgs.push({ fieldPath: 'events[' + i + '].params.' + p, validationCode: 'VALUE_INVALID', description: 'Param value is too long (max 100).' });
    });
  });
  return msgs;
}

/* ---------- выполнение Flow при изменении Лида ---------- */
function updateLead(leadId, change) {
  var lead = S.sf.leads.filter(function (l) { return l.Id === leadId; })[0];
  if (!lead) return;
  var prev = JSON.parse(JSON.stringify(lead));
  if (change.type === 'status') lead.Status = change.to;
  if (change.type === 'phone') lead.Phone = change.to;

  var entry = {
    ts: nowIso(), leadId: lead.Id, leadName: lead.FirstName + ' ' + lead.LastName, leadOrigin: lead.origin,
    change: change.type, from: change.type === 'status' ? prev.Status : prev.Phone, to: change.to,
    statusAfter: lead.Status, steps: [], sent: false, recorded: false
  };
  var f = S.sf.flowActive;
  function step(kind, text) { entry.steps.push({ kind: kind, text: text }); }

  if (!f) { step('skip', 'Нет активного Flow для объекта «Лид» — ничего не произошло.'); return finish(); }
  if (f.object !== 'Lead') { step('skip', 'Flow «' + f.label + '» привязан к объекту «' + (f.object || '—') + '», а не к Лиду.'); return finish(); }
  if (f.trigger === 'create') { step('skip', 'Flow запускается только при создании записи, а запись обновлена.'); return finish(); }

  var metNow = conditionsMet(f, lead, prev);
  if (!metNow) { step('skip', 'Условия входа не выполнены — Flow не запустился.'); return finish(); }
  if (f.when === 'only_when_met' && conditionsMet(f, prev, null)) {
    step('skip', 'Условия выполнялись и до изменения, а Flow запускается «только когда запись начинает соответствовать условиям» — Flow не запустился.');
    return finish();
  }
  step('ok', 'Flow «' + f.label + '» (версия ' + f.version + ') запущен: условия входа выполнены.');

  var evName = f.decision[lead.Status];
  if (!evName) { step('skip', 'Решение: для статуса «' + lead.Status + '» исход по умолчанию — событие не отправляется.'); return finish(); }
  step('ok', 'Решение: статус «' + lead.Status + '» → событие ' + evName + '.');

  if (f.calloutPath !== 'async') {
    step('error', 'Ошибка Flow: System.CalloutException: You have uncommitted work pending. Please commit or rollback before calling out. ' +
      '(HTTP-запрос нельзя делать в той же транзакции, что и сохранение записи — нужен путь Run Asynchronously.)');
    entry.error = 'uncommitted'; return finish();
  }
  step('ok', 'Путь Run Asynchronously: запрос выполняется после сохранения записи.');

  if (!S.sf.extCred || !S.sf.permSet.assigned || !S.sf.permSet.principalAccess) {
    step('error', 'Ошибка HTTP-запроса: We couldn\'t access the credential(s). You might not have the required permissions, or the external credential "' +
      ((S.sf.extCred && S.sf.extCred.name) || 'GA4_External') + '" might not exist. (Проверь Permission Set с доступом к принципалу External Credential и его назначение.)');
    entry.error = 'credential'; return finish();
  }

  var a = f.action, base = (S.sf.nc && S.sf.nc.url || '').replace(/\/+$/, '');
  var path = a.path.trim(); if (path && path[0] !== '/') path = '/' + path;
  var mid = resolveValue(a.query.measurement_id, lead), sec = resolveValue(a.query.api_secret, lead);
  var url = base + path + '?measurement_id=' + encodeURIComponent(mid.value || '') + '&api_secret=' + encodeURIComponent(sec.value || '');

  var params = {}, body = { client_id: '', events: [] };
  var b = a.body;
  var cid = resolveValue(b.client_id, lead); body.client_id = String(cid.value || '');
  ['session_id', 'engagement_time_msec', 'lead_id', 'lead_source', 'value', 'currency', 'debug_mode'].forEach(function (k) {
    if (!(b[k] || '').trim()) return;
    var r = resolveValue(b[k], lead);
    if (r.value === '' || r.value == null) return;
    var v = r.value;
    if (k === 'value' || k === 'engagement_time_msec') v = isNaN(+v) ? v : +v;
    if (k === 'debug_mode') v = (v === 'true' || v === '1' || v === true) ? true : v;
    params[k] = v;
  });
  body.events.push({ name: evName, params: params });
  entry.request = { method: a.method, url: url, body: body };
  entry.sent = true;

  // ---- ответ «GA4» ----
  var host = /^https:\/\/www\.google-analytics\.com$/.test(base);
  var isDebug = path === '/debug/mp/collect';
  if (!host) { entry.response = { status: 'Ошибка', text: 'Хост ' + (base || '(пусто)') + ' не отвечает как GA4. URL в Named Credential должен быть https://www.google-analytics.com' }; return finish(); }
  if (a.method !== 'POST') { entry.response = { status: 405, text: 'Measurement Protocol принимает только POST.' }; return finish(); }
  if (path !== '/mp/collect' && !isDebug) { entry.response = { status: 404, text: 'Неверный путь. Нужен /mp/collect.' }; return finish(); }

  var validation = validateMp(body);
  if (isDebug) {
    entry.response = { status: 200, text: JSON.stringify({ validationMessages: validation }, null, 2), debug: true };
    step('warn', 'Запрос ушёл на /debug/mp/collect: сервер проверил его, но НЕ записал данные. Для боевой отправки путь должен быть /mp/collect.');
    return finish();
  }
  entry.response = { status: 204, text: 'No Content' };
  var midOk = mid.value === GA_PROPERTY_MID;
  var secOk = S.ga.secrets.some(function (s) { return s.value === sec.value; });
  entry.validation = validation;
  if (!midOk || !secOk || validation.length) {
    entry.dropReason = !midOk ? 'measurement_id «' + (mid.value || '(пусто)') + '» не совпадает с потоком ' + GA_PROPERTY_MID
      : !secOk ? 'api_secret не найден среди секретов потока в GA4'
      : validation.map(function (m) { return m.description; }).join(' ');
    step('warn', 'GA4 ответил 204, но событие НЕ записано: ' + entry.dropReason + '. /mp/collect всегда отвечает 2xx — ошибки видно только через /debug/mp/collect.');
    return finish();
  }
  entry.recorded = true;
  S.gaReceived.push({
    ts: entry.ts, name: evName, client_id: body.client_id, params: params, leadId: lead.Id,
    utm_source: leadValue(lead, (fieldBy(FIELD_RE.utm_source) || {}).api) || '',
    utm_medium: leadValue(lead, (fieldBy(FIELD_RE.utm_medium) || {}).api) || ''
  });
  step('ok', 'GA4 принял событие ' + evName + ' для client_id ' + body.client_id + '.');
  if (S.ga.realSend) sendReal(url, body, entry);
  return finish();

  function finish() { S.log.unshift(entry); saveState(); return entry; }
}

/* Реальная отправка в GA4 (если в шаге 2 вставлен настоящий секрет) */
function sendReal(url, body, entry) {
  try {
    fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(body) });
    entry.realSent = true;
  } catch (e) { entry.realSent = false; }
}

/* ---------- тест-кейсы (по журналу запусков) ---------- */
function testResults() {
  var webLeads = S.sf.leads.filter(function (l) { return l.origin === 'web'; });
  function ga(name) { return S.gaReceived.filter(function (e) { return e.name === name; }); }
  var t = [];

  var q = ga('qualify_lead').filter(function (e) {
    var l = S.sf.leads.filter(function (x) { return x.Id === e.leadId; })[0];
    return l && l.origin === 'web';
  });
  var qOk = q.filter(function (e) {
    var l = S.sf.leads.filter(function (x) { return x.Id === e.leadId; })[0];
    return e.client_id && e.client_id === (l.raw && l.raw.ga_client_id) && e.params.session_id && String(e.params.session_id) === String(l.raw.ga_session_id) && e.params.engagement_time_msec;
  });
  t.push({
    id: 'T1', title: 'Лид с сайта → «Квалифицирован» → в GA4 приходит qualify_lead с его client_id и session_id',
    status: qOk.length ? 'pass' : q.length ? 'fail' : 'todo',
    note: qOk.length ? 'Событие пришло с правильными client_id, session_id и engagement_time_msec.'
      : q.length ? 'qualify_lead пришёл, но client_id / session_id не совпадают с cookie посетителя или нет engagement_time_msec. Проверь сопоставление Web-to-Lead и тело запроса.'
      : webLeads.length ? 'Открой лид с сайта и переведи его в статус «Квалифицирован».' : 'Сначала нужен лид с сайта (миссии 1 и 5).'
  });

  var phoneRuns = S.log.filter(function (l) { return l.change === 'phone' && l.statusAfter === 'Qualified'; });
  var dupSent = phoneRuns.filter(function (l) { return l.sent; });
  t.push({
    id: 'T2', title: 'Правка телефона у квалифицированного лида НЕ отправляет событие повторно',
    status: !phoneRuns.length ? 'todo' : dupSent.length ? 'fail' : 'pass',
    note: !phoneRuns.length ? 'Открой квалифицированный лид и нажми «Изменить телефон».'
      : dupSent.length ? 'Дубль! Flow снова отправил событие. Подумай над условиями входа: запускаться нужно только когда статус ИЗМЕНИЛСЯ.'
      : 'Дубля нет — Flow реагирует только на смену статуса.'
  });

  var tradeRuns = S.log.filter(function (l) { return l.leadOrigin === 'manual' && l.change === 'status'; });
  var tradeSent = tradeRuns.filter(function (l) { return l.sent; });
  t.push({
    id: 'T3', title: 'Лид без client_id (с выставки) не порождает запрос в GA4',
    status: !tradeRuns.length ? 'todo' : tradeSent.length ? 'fail' : 'pass',
    note: !tradeRuns.length ? 'Смени статус у лида «Олег Петров (ТД «Выставка»)».'
      : tradeSent.length ? 'Ушёл запрос с пустым client_id — GA4 его молча отбросил. Добавь условие входа: поле client_id не пустое.'
      : 'Отлично: Flow даже не пытается отправить «пустой» запрос.'
  });

  var dq = ga('disqualify_lead');
  t.push({ id: 'T4', title: 'Лид → «Не квалифицирован» → disqualify_lead', status: dq.length ? 'pass' : 'todo',
    note: dq.length ? 'Событие получено.' : 'Переведи лид с сайта в статус «Не квалифицирован» (можно новый тестовый лид).' });

  var cc = ga('close_convert_lead');
  var ccOk = cc.filter(function (e) { return +e.params.value > 0 && e.params.currency === 'USD'; });
  t.push({ id: 'T5', title: 'Лид → «Конвертирован» → close_convert_lead с value и currency',
    status: ccOk.length ? 'pass' : cc.length ? 'fail' : 'todo',
    note: ccOk.length ? 'Событие пришло с ценностью — GA4 посчитает доход по лидам.'
      : cc.length ? 'Событие пришло, но без value > 0 или без currency = USD.' : 'Переведи лид в статус «Конвертирован».' });
  return t;
}
