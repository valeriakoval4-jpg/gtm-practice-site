/* =========================================================
   Лаборатория GA4 ⇄ Salesforce v2 — движок
   По документу «GA4 + Salesforce: пошаговая настройка» (шаги 0–12)
   ========================================================= */
var LAB_KEY = 'gc_lab_state_v2';
var GA_MID = 'G-EK6764V55Q', GTM_ID = 'GTM-NQSBNR2L';

/* Поля из шага 5 документа: имя (без __c) → откуда берём значение в контексте заявки */
var REQ_FIELDS = [
  ['GACLIENTID', 'ga_client_id'], ['GAUSERID', ''], ['GAMEASUREMENTID', 'ga_measurement_id'],
  ['LEAD_SUBMISSION_ID', '#submission_id'], ['GA_SESSION_ID', 'ga_session_id'],
  ['FIRST_LANDING_PATH', 'first_landing_path'], ['SESSION_LANDING_PATH', 'session_landing_path'],
  ['FORM_PAGE_PATH', 'form_page_path'], ['CTA_ORIGIN_PATH', 'cta_origin_path'],
  ['FORM_ID', 'form_id'], ['SITE_ID', 'site_id'],
  ['FIRST_UTM_SOURCE', 'first_utm.source'], ['FIRST_UTM_MEDIUM', 'first_utm.medium'], ['FIRST_UTM_CAMPAIGN', 'first_utm.campaign'],
  ['SUBMISSION_UTM_SOURCE', 'submission_utm.source'], ['SUBMISSION_UTM_MEDIUM', 'submission_utm.medium'], ['SUBMISSION_UTM_CAMPAIGN', 'submission_utm.campaign'],
  ['SUBMITTED_AT', 'submitted_at']
];
var GA_IMPORT_FIELDS = ['GACLIENTID', 'GAUSERID', 'GAMEASUREMENTID'];
var LEAD_STATUSES = ['New', 'Working', 'Qualified', 'Unqualified'];
var RU = { New: 'Новый', Working: 'В работе', Qualified: 'Квалифицирован', Unqualified: 'Не подходит', Converted: 'Конвертирован',
  Prospecting: 'Поиск', Proposal: 'Предложение', 'Closed Won': 'Выиграна', 'Closed Lost': 'Проиграна' };
var REASONS = ['Нет бюджета', 'Не наш сегмент', 'Выбрали конкурента', 'Нет ответа', 'Спам'];
/* Что произошло → событие (таблица шага 7) */
var TRANSITIONS = [
  { key: 'working', obj: 'Lead', value: 'Working', text: 'Менеджер связался с лидом', event: 'working_lead' },
  { key: 'qualified', obj: 'Lead', value: 'Qualified', text: 'Лид квалифицирован', event: 'qualify_lead' },
  { key: 'disqualified', obj: 'Lead', value: 'Unqualified', text: 'Лид не подходит', event: 'disqualify_lead' },
  { key: 'won', obj: 'Opportunity', value: 'Closed Won', text: 'Сделка выиграна', event: 'close_convert_lead' },
  { key: 'lost', obj: 'Opportunity', value: 'Closed Lost', text: 'Сделка проиграна', event: 'close_unconvert_lead' }
];

function defaultState() {
  return {
    version: 2, current: 's0', clock: 0,   // clock — учебное время, минуты
    ans: {},                                // ответы на выборы и квизы {key: value}
    ga: {
      retention: '2', unwanted: [], internalIp: '', internalFilter: 'testing',
      dims: [], keyEvents: { generate_lead: false, form_submit: false, qualify_lead: false, close_convert_lead: false, disqualify_lead: false, working_lead: false },
      secrets: [], ackTerms: false,
      imp: { name: '', dataType: '', terms: false, user: '', schedule: '', ms: {}, won: { purchase: false, close_convert_lead: false }, created: false, lastRun: null, imported: {} },
      bq: { project: '', region: '', daily: false, linked: false }
    },
    sf: {
      down: false, fields: { Lead: [], Opportunity: [] }, flsReadOnly: false, leadMap: {},
      history: { LeadStatus: false, OppStage: false, OppAmount: false }, reasonField: false, reasonRule: false,
      leads: [], opps: [], subs: [], changes: [], ncUrl: '',
      flow: { active: false, async: false, when: '' }
    },
    server: { dedup: '', realTime: false, skipNoClient: false, secret: '', validated: false, sentKeys: [] },
    gaReceived: [],
    events: []
  };
}
var S;
function loadState() {
  try { S = JSON.parse(localStorage.getItem(LAB_KEY)); } catch (e) { S = null; }
  if (!S || S.version !== 2) S = defaultState();
}
function saveState() { try { localStorage.setItem(LAB_KEY, JSON.stringify(S)); } catch (e) {} }
function resetState() { localStorage.removeItem(LAB_KEY); loadState(); saveState(); }

/* ---------- утилиты ---------- */
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function rnd(n, abc) { abc = abc || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789'; var s = ''; for (var i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; }
function sfId(prefix) { return prefix + rnd(15 - prefix.length); }
function clockText(min) { var d = Math.floor(min / 1440), h = Math.floor(min % 1440 / 60), m = min % 60; return (d ? 'день ' + (d + 1) + ', ' : '') + String(h + 9).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
function setPath(obj, path, v) { var ks = path.split('.'), last = ks.pop(); ks.reduce(function (o, k) { return o[k] = o[k] || {}; }, obj)[last] = v; }
function separateDates() { return S.ans.dates === 'separate'; }

/* ---------- «сервер» сайта (общий с сайтом localStorage) ---------- */
function getDb() { try { return JSON.parse(localStorage.getItem('gc_server_db')) || { submissions: [], requests: [] }; } catch (e) { return { submissions: [], requests: [] }; } }
function saveDb(db) { localStorage.setItem('gc_server_db', JSON.stringify(db)); }
function tracked() { try { return JSON.parse(localStorage.getItem('gc_tracked_submissions')) || []; } catch (e) { return []; } }

function fieldExists(obj, name) { return S.sf.fields[obj].some(function (f) { return f.name === name; }); }
function fieldValue(sub, src) {
  if (!src) return '';
  if (src === '#submission_id') return sub.submission_id;
  var v = getPath(sub.context, src);
  return v == null ? '' : v;
}

/* Доставка заявок в Salesforce с повторами через 1, 5, 15 минут (шаг 4) */
var RETRY = [1, 5, 15];
function runQueue() {
  var db = getDb(), report = [];
  db.submissions.forEach(function (sub) {
    var d = sub.delivery;
    if (d.status === 'delivered' || d.status === 'failed') return;
    if ((d.next_try_min || 0) > S.clock) return;
    d.attempts++;
    function fail(text, permanent) {
      d.log.push({ min: S.clock, ok: false, text: text });
      if (permanent || d.attempts > RETRY.length) {
        d.status = 'failed';
        d.log.push({ min: S.clock, ok: false, text: '📣 Уведомление ответственному: заявка ' + sub.submission_id + ' не доставлена (попыток: ' + d.attempts + ').' });
      } else {
        d.status = 'retry'; d.next_try_min = S.clock + RETRY[d.attempts - 1];
        d.log.push({ min: S.clock, ok: false, text: 'Заявка ждёт в очереди. Следующая попытка через ' + RETRY[d.attempts - 1] + ' мин.' });
      }
      report.push(sub.submission_id + ': ' + text);
    }
    if (S.sf.down) return fail('503 Service Unavailable — Salesforce недоступен');
    var missing = REQ_FIELDS.filter(function (f) { return !fieldExists('Lead', f[0]); }).map(function (f) { return f[0] + '__c'; });
    if (missing.length) return fail('INVALID_FIELD: No such column \'' + missing[0] + '\' on sobject of type Lead' + (missing.length > 1 ? ' (и ещё ' + (missing.length - 1) + ')' : ''), true);
    var vals = {};
    REQ_FIELDS.forEach(function (f) { vals[f[0] + '__c'] = fieldValue(sub, f[1]); });
    // Ищем существующий лид по email: повторная заявка не затирает данные первой
    var lead = S.sf.leads.filter(function (l) { return l.Email && l.Email.toLowerCase() === (sub.contact.email || '').toLowerCase(); })[0];
    var attached = !!lead;
    if (!lead) {
      lead = { Id: sfId('00Q'), FirstName: sub.contact.first_name, LastName: sub.contact.last_name, Email: sub.contact.email, Company: sub.contact.company,
        Phone: sub.contact.phone, Budget: +sub.contact.budget || 0, Status: 'New', Reason: '', IsConverted: false, OppId: '', QualifiedDate: '', f: vals, created: S.clock };
      S.sf.leads.unshift(lead);
      logChange('Lead', lead, 'Created', '', 'New');
    }
    S.sf.subs.push({ Id: sfId('a0S'), submission_id: sub.submission_id, leadId: lead.Id, f: vals, created: S.clock });
    d.status = 'delivered'; d.sf_lead_id = lead.Id; d.delivered_min = S.clock;
    d.log.push({ min: S.clock, ok: true, text: attached ? '201: заявка сохранена отдельной записью и привязана к существующему лиду ' + lead.Id + ' (поля лида не перезаписаны)' : '201: создан лид ' + lead.Id });
    report.push(sub.submission_id + ': доставлена');
  });
  saveDb(db); saveState();
  return report;
}
function retryFailed(id) {
  var db = getDb();
  db.submissions.forEach(function (s) { if (s.submission_id === id) { s.delivery.status = 'retry'; s.delivery.attempts = 0; s.delivery.next_try_min = S.clock; } });
  saveDb(db);
}

/* ---------- Salesforce: изменения записей ---------- */
function logChange(obj, rec, field, from, to) {
  var ch = { id: sfId('0Ch'), min: S.clock, obj: obj, recId: rec.Id, field: field, from: from, to: to };
  S.sf.changes.push(ch);
  return ch;
}
function findLead(id) { return S.sf.leads.filter(function (l) { return l.Id === id; })[0]; }
function findOpp(id) { return S.sf.opps.filter(function (o) { return o.Id === id; })[0]; }

function setLeadStatus(id, status, reason) {
  var l = findLead(id); if (!l || l.IsConverted) return { error: 'Лид уже конвертирован.' };
  if (status === 'Unqualified' && S.sf.reasonRule && !reason) return { error: 'Ошибка проверки (Validation Rule): укажите причину отказа.' };
  var from = l.Status; l.Status = status; if (status === 'Unqualified') l.Reason = reason || '';
  if (status === 'Qualified' && separateDates() && !l.QualifiedDate) l.QualifiedDate = clockText(S.clock);
  var ch = logChange('Lead', l, 'Status', from, status);
  afterSave('Lead', l, ch, from === status);
  saveState(); return { ok: true };
}
function resaveLead(id) {
  var l = findLead(id), old = l.Phone; l.Phone = '+1 000 ' + rnd(3, '0123456789') + '-' + rnd(2, '0123456789');
  afterSave('Lead', l, logChange('Lead', l, 'Phone', old, l.Phone), true); saveState();
}
function convertLead(id) {
  var l = findLead(id); if (!l || l.IsConverted) return;
  var o = { Id: sfId('006'), Name: l.Company + ' — озеленение', Stage: 'Prospecting', Amount: l.Budget || 2000, Currency: 'USD', LeadId: l.Id, LostReason: '', CloseDate: '', f: {}, created: S.clock };
  // Map Lead Fields: при конвертации значения переходят в поля сделки
  Object.keys(S.sf.leadMap).forEach(function (lf) { var of = S.sf.leadMap[lf]; if (of && fieldExists('Opportunity', of.replace(/__c$/, ''))) o.f[of] = l.f[lf]; });
  S.sf.opps.unshift(o); l.IsConverted = true; l.OppId = o.Id;
  var from = l.Status; l.Status = 'Converted';
  logChange('Lead', l, 'Status', from, 'Converted');
  logChange('Opportunity', o, 'Created', '', 'Prospecting');
  S.events.unshift({ min: S.clock, name: l.FirstName + ' ' + l.LastName, change: 'Лид конвертирован → сделка ' + o.Id, steps: [{ k: 'skip', t: 'Конвертация лида — отдельный этап, не выигрыш. Событие GA4 не нужно.' }] });
  saveState(); return o;
}
function setOppStage(id, stage, reason) {
  var o = findOpp(id);
  if (stage === 'Closed Lost' && S.sf.reasonRule && !reason) return { error: 'Ошибка проверки (Validation Rule): укажите причину проигрыша.' };
  var from = o.Stage; o.Stage = stage; if (stage === 'Closed Lost') o.LostReason = reason || '';
  if (stage === 'Closed Won' && separateDates() && !o.CloseDate) o.CloseDate = clockText(S.clock);
  var ch = logChange('Opportunity', o, 'Stage', from, stage);
  afterSave('Opportunity', o, ch, from === stage);
  saveState(); return { ok: true };
}
function editOppAmount(id) {
  var o = findOpp(id), from = o.Amount; o.Amount = Math.round(o.Amount * 1.1);
  afterSave('Opportunity', o, logChange('Opportunity', o, 'Amount', from, o.Amount), true); saveState();
}

/* ---------- Вариант Б: Flow → свой сервер → Measurement Protocol ---------- */
function transitionFor(obj, rec) {
  var v = obj === 'Lead' ? rec.Status : rec.Stage;
  return TRANSITIONS.filter(function (t) { return t.obj === obj && v === t.value; })[0];
}
function afterSave(obj, rec, ch, sameValue) {
  var f = S.sf.flow, t = transitionFor(obj, rec), when = S.ans.flow_when === 1 ? 'only_when_met' : 'every';   // режим из шага 7
  var entry = { min: S.clock, name: obj === 'Lead' ? rec.FirstName + ' ' + rec.LastName : rec.Name,
    change: (ch.field === 'Status' || ch.field === 'Stage') && !sameValue ? (RU[ch.from] || ch.from) + ' → ' + (RU[ch.to] || ch.to) : 'Повторное сохранение записи (' + ch.field + ')', steps: [] };
  function step(k, text) { entry.steps.push({ k: k, t: text }); }
  if (!f.active) step('skip', 'Flow передачи статусов (вариант Б) не активен.');
  else if (!t) step('skip', 'Для этого значения нет события в таблице сопоставления.');
  else if (sameValue && when === 'only_when_met') step('skip', 'Запись уже была в «' + RU[t.value] + '» — Flow не запускается (Only when a record is updated to meet the condition requirements).');
  else {
    step(sameValue ? 'warn' : 'ok', sameValue ? 'Flow запущен повторно: запись сохранена и всё ещё «' + RU[t.value] + '» (режим «каждый раз, когда соответствует условиям»).' : 'Flow запущен: запись перешла в «' + RU[t.value] + '».');
    if (!f.async) step('error', 'System.CalloutException: You have uncommitted work pending. Please commit or rollback before calling out. (Нужен путь Run Asynchronously.)');
    else if ((S.sf.ncUrl || '').replace(/\/+$/, '') !== 'https://api.greencorner.example') step('error', 'Callout failed: Named Credential должен указывать на ваш сервер https://api.greencorner.example');
    else { step('ok', 'Flow → POST api.greencorner.example/salesforce/status { record_id: ' + rec.Id + ', change_id: ' + ch.id + ', event: ' + t.event + ' }'); serverSend(rec, obj, ch, t, step); }
  }
  S.events.unshift(entry); if (S.events.length > 80) S.events.length = 80;
}
function dedupKey(rec, ch, t) {
  switch (S.server.dedup) {
    case 'record_change_event': return rec.Id + '|' + ch.id + '|' + t.event;
    case 'record_event': return rec.Id + '|' + t.event;
    case 'client': return (rec.f.GACLIENTID__c || '') + '|' + t.event;
    default: return null;
  }
}
var lastSend = null;
function serverSend(rec, obj, ch, t, step, isRetry) {
  if (!isRetry) lastSend = { recId: rec.Id, obj: obj, ch: ch, t: t };
  var key = dedupKey(rec, ch, t);
  if (key && S.server.sentKeys.indexOf(key) !== -1) { step('ok', 'Сервер: ключ «' + key + '» уже отправлялся — пропускаем (защита от дублей).'); return; }
  var cid = rec.f.GACLIENTID__c || '';
  if (!cid && S.server.skipNoClient) { step('skip', 'Сервер: у записи нет client_id — в GA4 не отправляем, результат остаётся в Salesforce.'); return; }
  var params = { session_id: rec.f.GA_SESSION_ID__c || undefined, engagement_time_msec: 1, lead_submission_id: rec.f.LEAD_SUBMISSION_ID__c || undefined };
  if (t.key === 'disqualified') params.reason = rec.Reason || '';
  if (t.key === 'lost') { params.reason = rec.LostReason || ''; params.opportunity_id = rec.Id; }
  if (t.key === 'won') { params.opportunity_id = rec.Id; params.value = rec.Amount; params.currency = rec.Currency; }
  var body = { client_id: cid, events: [{ name: t.event, params: params }] };
  if (S.server.realTime) body.timestamp_micros = '‹время изменения: ' + clockText(ch.min) + '›';
  step('ok', 'Сервер → POST /mp/collect ' + JSON.stringify(body));
  var secretOk = S.ga.secrets.some(function (s) { return s.value === S.server.secret; });
  if (!cid) { step('warn', 'GA4 ответил 204, но событие отброшено: нет client_id. Ответ 2xx не значит, что данные приняты.'); return; }
  if (!secretOk) { step('warn', 'GA4 ответил 204, но событие отброшено: api_secret на сервере не найден в потоке GA4.'); return; }
  if (key) S.server.sentKeys.push(key);
  recordGa(t.event, cid, params, 'mp', rec.Id, ch.min, S.server.realTime ? ch.min : S.clock);
  step('ok', 'GA4 принял ' + t.event + (isRetry ? ' (повторная доставка!)' : '') + '.');
}
/* «Salesforce повторил вызов» — проверка защиты от дублей */
function replayLastCallout() {
  if (!lastSend) return false;
  var rec = lastSend.obj === 'Lead' ? findLead(lastSend.recId) : findOpp(lastSend.recId);
  var entry = { min: S.clock, name: '↺ Повтор вызова', change: 'Salesforce повторно отправил тот же вызов на сервер (таймаут сети)', steps: [] };
  serverSend(rec, lastSend.obj, lastSend.ch, lastSend.t, function (k, t) { entry.steps.push({ k: k, t: t }); }, true);
  S.events.unshift(entry); saveState(); return true;
}
function recordGa(name, cid, params, via, recId, happenedMin, eventMin) {
  S.gaReceived.push({ name: name, client_id: cid, params: params, via: via, recId: recId, happened: happenedMin, eventTime: eventMin, received: S.clock });
}

/* ---------- Вариант А: встроенный импорт GA4 из Salesforce ---------- */
function runImport() {
  var imp = S.ga.imp, out = [];
  if (!imp.created) return ['Источник данных ещё не создан.'];
  function emit(key, ev, rec, ch, extra) {
    var k = rec.Id + '|' + key + '|' + ev;
    if (imp.imported[k]) return;
    var cid = rec.f.GACLIENTID__c;
    if (!cid) { out.push('⏭ Пропущено (пустое GACLIENTID): ' + rec.Id + ' / ' + key); imp.imported[k] = 'skipped'; return; }
    imp.imported[k] = true;
    recordGa(ev, cid, extra || {}, 'import', rec.Id, ch.min, ch.min);
    out.push('✓ Импортировано: ' + ev + ' (' + rec.Id + ')');
  }
  S.sf.changes.forEach(function (ch) {
    if (ch.obj === 'Lead') {
      var l = findLead(ch.recId); if (!l) return;
      if (ch.field === 'Created' && imp.ms.created) emit('created', 'generate_lead', l, ch);
      if (ch.field === 'Status') TRANSITIONS.forEach(function (t) { if (t.obj === 'Lead' && t.value === ch.to && imp.ms[t.key]) emit(t.key, t.event, l, ch, t.key === 'disqualified' ? { reason: l.Reason } : {}); });
    } else {
      var o = findOpp(ch.recId); if (!o || ch.field !== 'Stage') return;
      if (ch.to === 'Closed Won' && imp.ms.won) {
        if (imp.won.purchase) emit('won', 'purchase', o, ch, { value: o.Amount, currency: o.Currency, transaction_id: o.Id });
        if (imp.won.close_convert_lead) emit('won', 'close_convert_lead', o, ch, { value: o.Amount, currency: o.Currency });
      }
      if (ch.to === 'Closed Lost' && imp.ms.lost) emit('lost', 'close_unconvert_lead', o, ch, { reason: o.LostReason });
    }
  });
  imp.lastRun = S.clock; saveState();
  return out.length ? out : ['Новых данных для импорта нет.'];
}

/* ---------- MP: валидационный сервер /debug/mp/collect ---------- */
function validateMp(body) {
  var msgs = [];
  if (!body.client_id) msgs.push({ fieldPath: 'client_id', validationCode: 'VALUE_REQUIRED', description: 'Measurement requires a client_id.' });
  (body.events || []).forEach(function (ev, i) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(ev.name || '')) msgs.push({ fieldPath: 'events[' + i + '].name', validationCode: 'NAME_INVALID', description: 'Event name is invalid.' });
    Object.keys(ev.params || {}).forEach(function (p) {
      var v = ev.params[p];
      if (typeof v === 'string' && v.length > 100) msgs.push({ fieldPath: 'events[' + i + '].params.' + p, validationCode: 'VALUE_INVALID', description: 'Param value is too long (max 100).' });
    });
  });
  return msgs;
}

/* ---------- Учебный набор данных для шагов 9–11 ---------- */
var SAMPLE = {
  submissions: [
    { submission_id: 'sub_A1', client_id: '111.1', date: '2026-09-02', source: 'google / cpc', first_source: 'google / cpc', lead: '00QA', qualified: true },
    { submission_id: 'sub_A2', client_id: '111.1', date: '2026-09-20', source: 'newsletter / email', first_source: 'google / cpc', lead: '00QA', qualified: true },
    { submission_id: 'sub_B1', client_id: '222.2', date: '2026-09-05', source: 'facebook / paid_social', first_source: 'facebook / paid_social', lead: '00QB', qualified: false },
    { submission_id: 'sub_C1', client_id: '333.3', date: '2026-09-11', source: 'google / organic', first_source: 'google / organic', lead: '00QC', qualified: true }
  ],
  opps: [
    { opportunity_id: '006X', lead: '00QA', main_submission: 'sub_A1', client_id: '111.1', stage: 'Closed Won', amount: 30000, close_date: '2026-10-15' },
    { opportunity_id: '006Y', lead: '00QC', main_submission: 'sub_C1', client_id: '333.3', stage: 'Closed Lost', amount: 8000, close_date: '2026-10-20' }
  ],
  payments: [
    { payment_id: 'pay_1', opportunity_id: '006X', client_id: '111.1', date: '2026-10-20', amount: 5000, status: 'оплачено' },
    { payment_id: 'pay_2', opportunity_id: '006X', client_id: '111.1', date: '2026-11-01', amount: 10000, status: 'оплачено' },
    { payment_id: 'pay_2', opportunity_id: '006X', client_id: '111.1', date: '2026-11-01', amount: 10000, status: 'оплачено', dup: true },
    { payment_id: 'ref_1', opportunity_id: '006X', client_id: '111.1', date: '2026-11-03', amount: -2000, status: 'возврат', refund_of: 'pay_1' }
  ]
};
