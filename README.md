# 🌱 Green Corner — учебный сайт для практики GTM + GA4

Маленький выдуманный магазин растений: главная, каталог, карточка товара, корзина,
оформление заказа, страница «Спасибо», «О нас» (с видео YouTube) и «Контакты» (с формой).

## 1. Подключить свой контейнер GTM
Открой `js/gtm.js` и замени `GTM-XXXXXXX` на ID своего контейнера. Больше нигде менять не нужно —
этот файл подключён в `<head>` каждой страницы.

## 2. Запустить сайт
**Вариант А — локально.** Если установлен Node.js: `npm run dev` (откроется на http://localhost:8000).
Или через Python (на Mac он уже есть):
```
cd gtm-practice-site
python3 -m http.server 8000
```
Открой http://localhost:8000. Режим предпросмотра GTM (Tag Assistant) и DebugView в GA4 отлично работают на localhost.

**Вариант Б — опубликовать в интернет бесплатно.** Зайди на https://app.netlify.com/drop и перетащи туда
папку `gtm-practice-site` — через минуту получишь ссылку вида `https://xxx.netlify.app`.

> Просто открыть `index.html` двойным кликом (адрес `file://...`) не получится — GTM так не работает, нужен сервер.

## 3. Панель dataLayer
Внизу справа есть тёмная панель 🧪 — в ней видно каждое событие, которое сайт отправляет в `dataLayer`.
Отключить: `SHOW_DEBUG_PANEL: false` в `js/gtm.js`.

## Что уже отправляет сайт в dataLayer

| Событие | Где |
|---|---|
| `page_type`, `user_status`, `user_id` (без event) | каждая страница, до загрузки GTM |
| `view_item_list`, `select_item` | главная, каталог, «Похожие товары» |
| `view_promotion`, `select_promotion` | промо-баннер на главной |
| `view_item`, `add_to_wishlist` | карточка товара |
| `add_to_cart` | кнопки «В корзину» |
| `view_cart`, `remove_from_cart` | корзина |
| `begin_checkout`, `add_shipping_info`, `add_payment_info` | оформление заказа |
| `purchase` | страница «Спасибо» (один раз, обновление не дублирует) |
| `filter_apply` | фильтры в каталоге |
| `coupon_apply` | промокод (рабочие: `WELCOME10`, `PLANTS20`) |
| `login`, `logout` | кнопка «Войти» в шапке |
| `generate_lead`, `form_error` | форма на странице «Контакты» |

Все ecommerce-события — в формате GA4 (`ecommerce.items[]`), перед каждым идёт `{ecommerce: null}`.

## Что специально НЕ отслежено — настрой сама встроенными триггерами GTM
- Подписка на рассылку: две формы — `#newsletter-form` (главная) и `#about-newsletter-form` (О нас), у обеих класс `newsletter-form`. Триггер «Отправка формы» (Form ID / Form Classes) или «Видимость элемента» (`#newsletter-success`, `#about-newsletter-success`)
- Скачивание PDF → «Только ссылки», Click URL содержит `.pdf`
- Клики по `tel:`, `mailto:`, WhatsApp, Telegram, соцсетям в футере (исходящие ссылки)
- Вкладки «Описание / Уход / Доставка» на карточке товара → «Все элементы» + Click Text
- Открытие вопросов FAQ на странице «О нас»
- Прокрутка 25/50/75/90% на странице «О нас»
- Видео YouTube на странице «О нас» (start / progress / complete)
- Клик по кнопке «Смотреть каталог» (`#hero-cta`)

## Задания по порядку
1. Создай в GTM тег **Google tag** с твоим Measurement ID (G-XXXX), триггер Initialization — All Pages. Проверь в Preview и в GA4 → DebugView.
2. Создай переменные уровня данных `page_type`, `user_id` и передай их в Google tag как параметры (`page_type`) / user property.
3. Создай один тег **GA4 Event** с `{{Event}}` в качестве имени, галкой «Send Ecommerce data» и триггером Custom Event по regex
   `view_item_list|select_item|view_item|add_to_cart|remove_from_cart|view_cart|begin_checkout|add_shipping_info|add_payment_info|purchase|view_promotion|select_promotion|add_to_wishlist`.
4. Пройди покупку целиком и найди её в DebugView и потом в отчёте «Монетизация → Электронная торговля».
5. Отследи `generate_lead` и отметь его ключевым событием (конверсией) в GA4.
6. Сделай задания из списка «не отслежено» выше.
7. Бонус: включи Enhanced Measurement в GA4 и посмотри, что из этого он ловит сам (прокрутка, исходящие клики, файлы, видео) — и чем это отличается от твоих тегов.

## 🍪 Cookie-баннер и Consent Mode

При первом визите внизу слева появляется баннер: «Принять все», «Отклонить все», «Настроить»
(категории **Аналитика** и **Маркетинг**). Открыть его снова — ссылка «🍪 Настройки cookie» в футере.
Чтобы снова увидеть баннер «как новый посетитель» — открой сайт в режиме инкогнито или удали cookie сайта.

**Где хранится выбор** — cookie (на 180 дней):

| Cookie | Значения | Consent Mode |
|---|---|---|
| `gc_consent_analytics` | `granted` / `denied` | `analytics_storage` |
| `gc_consent_marketing` | `granted` / `denied` | `ad_storage`, `ad_user_data`, `ad_personalization` |

**Что попадает в dataLayer:**
- на каждой странице до загрузки GTM: `consent_analytics`, `consent_marketing` (`granted` / `denied` / `unknown`, если выбора ещё не было);
- `cookie_banner_view` (`banner_source`: `first_visit` / `footer_link`);
- `cookie_consent_update` (`consent_action`: `accept_all` / `reject_all` / `custom`, плюс `consent_analytics`, `consent_marketing`).

**Режим** задаётся в `js/gtm.js` → `CONSENT_MODE`:
- `'gtm'` (по умолчанию) — сайт ничего не сообщает Google о согласии. Consent Mode настраиваешь сама в GTM — это и есть тренировка;
- `'code'` — сайт сам отправляет `gtag('consent', 'default', …)` (всё `denied`, пока нет выбора) и `gtag('consent', 'update', …)` после выбора;
- `'off'` — баннера нет.

### Задания по Consent Mode (режим `'gtm'`)
1. Включи в GTM **Админ → Настройки контейнера → «Включить обзор согласия»** (Consent Overview).
2. Создай переменные «Сторонний файл cookie» (1st Party Cookie) для `gc_consent_analytics` и `gc_consent_marketing`.
3. Добавь тег из галереи шаблонов (например, **Consent Mode (Google tags)** от Simo Ahava) на триггер **Consent Initialization – All Pages**: состояние `default` — `denied`, если cookie нет, иначе значение из cookie.
4. Второй такой же тег в режиме `update` на специальное событие `cookie_consent_update`.
5. В предпросмотре открой вкладку **Consent** в Tag Assistant: проверь On-page Default и On-page Update.
6. Нажми «Отклонить все» и посмотри, что GA4 отправляет cookieless-пинги (параметр `gcs=G100` в запросах `collect`); после «Принять все» — `gcs=G111`.
