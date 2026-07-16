# Прототип 1 — Колесо фортуны / Scratch-Card

## 1. Обзор

Брендированная performance-игра: пользователь крутит колесо призов (или стирает scratch-карту) и получает скидку/подарок/промокод, после чего должен оставить контакт (email/телефон) для получения приза.

**Для какого клиента/кампании подходит:**
- FMCG — активация промо на упаковке, лендинг под ATL-кампанию, конкурс в соцсетях
- Банкинг — квиз-механика "выиграй кэшбэк", лидогенерация под открытие карты/счёта
- Туризм — розыгрыш скидок на бронирование, сезонные акции
- Мобильность (каршеринг/самокаты) — промокоды на первую поездку

Механика хорошо ложится на TikTok/Instagram traffic (клиенты marswalk.media) — короткий цикл "клик по рекламе → лендинг → игра 10 сек → лид".

**Бизнес-метрика:** conversion rate лендинга (% сыгравших от зашедших), cost per lead (CPL), share rate (виральность результата).

## 2. Технический стек

### Runtime-зависимости

```
pixi.js@^8.6          — рендер-движок (WebGL/WebGPU с фолбэком на Canvas)
gsap@^3.12            — анимация вращения (easing, инерция)
howler@^2.2           — звук
react@^18.3           — UI-обвязка
react-dom@^18.3
zod@^3.23             — валидация формы лида
nanoid@^5.0           — session id
react-hook-form@^7.52 — форма лида (интеграция с zod через @hookform/resolvers)
@hookform/resolvers@^3.9
canvas-confetti@^1.9  — эффект выигрыша (лёгкая альтернатива pixi-партиклам)
```

### Dev-зависимости

```
vite@^5.4
@vitejs/plugin-react@^4.3
typescript@^5.5
vitest@^2.0                — unit-тесты (prizeResolver, computeRotation)
@playwright/test@^1.47     — smoke e2e (крутим колесо → видим результат)
eslint@^9 + typescript-eslint@^8
prettier@^3.3
```

Для scratch-card варианта — та же pixi.js, но вместо вращения используется `PIXI.Graphics` с `blendMode: 'erase'` (pixi v8 API: `graphics.blendMode = 'erase'`) поверх слоя с призом, либо кастомная маска через `RenderTexture` + `extract`.

### package.json — установка одной командой

```bash
npm create vite@latest marswalk-wheel -- --template react-ts
cd marswalk-wheel
npm install pixi.js gsap howler zod nanoid react-hook-form @hookform/resolvers canvas-confetti
npm install -D vitest @playwright/test
```

## 3. Архитектура

Разделение на 3 слоя:

1. **Config layer** — JSON/TS-объект с описанием кампании: сегменты колеса (текст, цвет, вес вероятности, приз), брендинг (логотип, цветовая палитра, шрифт), тексты формы. Это единственное, что меняется под нового клиента.
2. **Render engine (pixi.js)** — не знает о React и о бизнес-логике. Принимает config, рисует колесо/scratch-карту, эмитит события (`onSpinStart`, `onSpinEnd(result)`, `onScratchProgress(percent)`, `onScratchComplete(result)`).
3. **UI/App layer (React)** — экран приветствия, кнопка "Крутить", модалка результата, форма захвата лида, отправка аналитики. Слушает события из render engine через callback-props, не трогает pixi API напрямую.

### Схема потока данных

```
Campaign Config (JSON)
        │
        ▼
 React App (state: idle → spinning → result → lead_form → submitted → error)
        │                              ▲
        │  props/config                │ callbacks (onSpinEnd)
        ▼                              │
   WheelEngine (pixi.js class, изолирован в отдельном модуле)
        │
        ▼
   Prize resolver (weighted random, серверный или клиентский seed)
```

**Важно про вероятности:** резолвинг приза должен происходить ДО начала анимации (или на сервере), а анимация лишь визуально "доезжает" до заранее выбранного сегмента — иначе на демо и на проде легко словить рассинхрон между визуальным результатом и записанным призом.

### Структура репозитория

```
marswalk-wheel/
├── public/
│   └── assets/
│       ├── fmcg-demo/
│       │   ├── logo.svg
│       │   ├── sound-tick.mp3
│       │   └── sound-win.mp3
│       ├── bank-demo/
│       └── travel-demo/
├── src/
│   ├── engine/
│   │   ├── WheelEngine.ts        # класс на pixi, публичный API
│   │   ├── ScratchEngine.ts      # альтернативный движок
│   │   ├── geometry.ts           # computeTargetRotation(), segment math
│   │   └── WheelEngine.test.ts
│   ├── lib/
│   │   ├── prizeResolver.ts      # чистая функция weighted random
│   │   ├── prizeResolver.test.ts
│   │   ├── analytics.ts          # обёртка над GA4
│   │   ├── audioUnlock.ts        # разблокировка звука на iOS Safari
│   │   └── session.ts            # nanoid + localStorage anti-replay
│   ├── config/
│   │   ├── schema.ts             # zod-схема CampaignConfig
│   │   └── campaigns/
│   │       ├── fmcg-demo.json
│   │       ├── bank-demo.json
│   │       └── travel-demo.json
│   ├── app/
│   │   ├── App.tsx                # state machine, оркестрация
│   │   ├── LandingScreen.tsx
│   │   ├── WheelCanvas.tsx        # монтирует WheelEngine в контейнер
│   │   ├── ResultModal.tsx
│   │   ├── LeadForm.tsx
│   │   └── DebugPanel.tsx         # переключатель конфигов для демо
│   ├── main.tsx
│   └── vite-env.d.ts
├── e2e/
│   └── spin-flow.spec.ts
├── vercel.ts
├── vite.config.ts
└── package.json
```

### Типы конфигурации (config/schema.ts)

```typescript
import { z } from 'zod';

export const WheelSegmentSchema = z.object({
  id: z.string(),
  label: z.string().max(20),          // текст на сегменте
  color: z.string(),                   // hex, напр. "#FF6B6B"
  textColor: z.string().default('#FFFFFF'),
  weight: z.number().min(0).max(100),  // вес вероятности, не обязан суммироваться в 100
  prize: z.object({
    code: z.string(),                  // промокод, отдаётся пользователю
    description: z.string(),
    isWin: z.boolean().default(true),  // false = "повезёт в следующий раз"
  }),
});

export const CampaignConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    logoUrl: z.string(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    fontFamily: z.string().default('Inter'),
    backgroundImageUrl: z.string().optional(),
  }),
  wheel: z.object({
    segments: z.array(WheelSegmentSchema).min(4).max(12),
    spinDurationMs: z.number().default(4200),
    minFullSpins: z.number().default(4),
  }),
  copy: z.object({
    title: z.string(),
    subtitle: z.string(),
    spinButtonLabel: z.string().default('Крутить'),
    resultWinTitle: z.string(),
    resultLoseTitle: z.string(),
    leadFormTitle: z.string(),
    leadFormSubmitLabel: z.string().default('Получить приз'),
  }),
  leadForm: z.object({
    fields: z.array(z.enum(['email', 'phone', 'name'])).min(1),
    consentText: z.string(),             // GDPR-текст согласия (обязателен для DACH)
    webhookUrl: z.string().url().optional(), // куда слать лид
  }),
  sound: z.object({
    tickUrl: z.string(),
    winUrl: z.string(),
    enabled: z.boolean().default(true),
  }),
});

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;
export type WheelSegment = z.infer<typeof WheelSegmentSchema>;
```

### Публичный API WheelEngine (engine/WheelEngine.ts)

```typescript
export interface WheelEngineOptions {
  container: HTMLElement;
  config: CampaignConfig;
  onSpinStart?: () => void;
  onSpinEnd?: (segment: WheelSegment) => void;
  onReady?: () => void; // все текстуры/шрифты загружены
}

export class WheelEngine {
  constructor(options: WheelEngineOptions);
  mount(): Promise<void>;               // инициализация PIXI.Application, загрузка ассетов
  spin(targetSegmentIndex: number): void; // запуск анимации к заранее вычисленному сегменту
  resize(width: number, height: number): void;
  destroy(): void;                      // обязателен cleanup при unmount React-компонента
}
```

`WheelCanvas.tsx` — тонкая обёртка: в `useEffect` создаёт `WheelEngine`, вызывает `mount()`, в cleanup вызывает `destroy()`. React никогда не рендерит содержимое колеса напрямую.

### Математика вращения (engine/geometry.ts)

```typescript
// Указатель приза фиксирован сверху (angle = -90° / 270° в pixi-координатах,
// т.к. 0° = "восток", вращение по часовой стрелке).
export function computeTargetRotation(
  segmentIndex: number,
  totalSegments: number,
  minFullSpins: number,
): number {
  const segmentAngle = 360 / totalSegments;
  // центр нужного сегмента должен оказаться под указателем (0°/верх)
  const segmentCenterAngle = segmentIndex * segmentAngle + segmentAngle / 2;
  // добавляем небольшой случайный джиттер внутри сегмента, чтобы не было
  // визуально "слишком идеально" (эффект настоящей случайности)
  const jitter = (Math.random() - 0.5) * segmentAngle * 0.6;
  const finalAngle = segmentCenterAngle + jitter;
  // колесо крутится по часовой, указатель сверху -> нужно повернуть колесо
  // так, чтобы (360 - finalAngle) оказался под указателем
  const targetWithinCircle = (360 - finalAngle) % 360;
  return minFullSpins * 360 + targetWithinCircle;
}
```

Это чистая функция — покрывается unit-тестом (`geometry.test.ts`): для 8 сегментов, `segmentIndex=0..7`, проверяем что `targetRotation % 360` попадает в ожидаемый диапазон каждого сегмента.

### Prize resolver (lib/prizeResolver.ts)

```typescript
export function resolvePrize(segments: WheelSegment[], rng: () => number = Math.random): {
  segment: WheelSegment;
  index: number;
} {
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  let roll = rng() * totalWeight;
  for (let i = 0; i < segments.length; i++) {
    roll -= segments[i].weight;
    if (roll <= 0) return { segment: segments[i], index: i };
  }
  const lastIndex = segments.length - 1;
  return { segment: segments[lastIndex], index: lastIndex }; // fallback от rounding error
}
```

`rng` инжектится параметром — на демо это `Math.random`, но при переезде на сервер та же функция принимает seeded RNG (`mulberry32` или аналог) с фиксированным seed, присланным с бэкенда, чтобы клиент не мог предсказать/подменить результат.

### State machine приложения (app/App.tsx)

```
idle → (клик "Крутить") → spinning → (onSpinEnd) → result
result → (клик "Получить приз") → lead_form
lead_form → (submit success) → submitted
lead_form → (submit error) → error → (retry) → lead_form
```

Реализуется через `useReducer` с явным union-типом состояний — не через россыпь boolean-флагов (`isSpinning`, `isResult`...), чтобы избежать невозможных комбинаций состояний.

```typescript
type AppState =
  | { status: 'idle' }
  | { status: 'spinning' }
  | { status: 'result'; segment: WheelSegment }
  | { status: 'lead_form'; segment: WheelSegment }
  | { status: 'submitting'; segment: WheelSegment }
  | { status: 'submitted'; segment: WheelSegment }
  | { status: 'error'; segment: WheelSegment; message: string };
```

## 4. План разработки по этапам

### Этап 0 — Setup (2 ч)
- `npm create vite@latest` с шаблоном `react-ts`
- Установка всех зависимостей из раздела 2
- Настройка `eslint` + `prettier`, базовый `tsconfig.json` (strict: true)
- Пустой `vercel.ts`, первый деплой "hello world" на Vercel, проверка что preview-URL открывается
- Git-репозиторий, `.gitignore` (node_modules, dist, .env*)

### Этап 1 — Config layer + типы (2 ч)
- `config/schema.ts` — zod-схемы из раздела 3
- Один тестовый `campaigns/fmcg-demo.json`, соответствующий схеме
- Загрузчик конфига: `loadCampaignConfig(id: string): Promise<CampaignConfig>` с валидацией через `CampaignConfigSchema.parse()` — падать с понятной ошибкой при невалидном конфиге, а не тихо рендерить сломанное колесо

### Этап 2 — WheelEngine: статичное колесо (4 ч)
- `PIXI.Application` инициализация: `resolution: Math.min(window.devicePixelRatio, 2)`, `autoDensity: true`, `antialias: true`
- Рисование N секторов через `PIXI.Graphics` (`arc()` + `fill()`) по данным `config.wheel.segments`
- Текст на секторах: `PIXI.Text` с загруженным веб-шрифтом (см. раздел 5 — важен порядок загрузки шрифта ДО рендера текста, иначе FOUT-эффект на canvas)
- Логотип в центре колеса — `PIXI.Sprite.from(logoUrl)`, вписанный в круг
- Указатель (стрелка) сверху колеса — отдельный статичный `PIXI.Graphics`/`Sprite`, не часть вращающегося контейнера

### Этап 3 — Анимация вращения (4 ч)
- Все сегменты объединены в один `PIXI.Container` (`wheelContainer`), вращается целиком через `wheelContainer.rotation`
- `gsap.to(wheelContainer, { rotation: targetRotationRad, duration: config.wheel.spinDurationMs / 1000, ease: 'power4.out', onComplete })`
- `targetRotationRad = computeTargetRotation(...) * Math.PI / 180`
- Тиканье звука: `gsap` `onUpdate` callback, троттлинг через сравнение текущего "пройденного сегмента" с предыдущим кадром — звук `tick` играет один раз на пересечение границы сегмента, не на каждый кадр
- Кнопка "Крутить" блокируется (`disabled`) на время анимации через `spinning`-статус в state machine

### Этап 4 — Prize resolver + результат (3 ч)
- `prizeResolver.ts` из раздела 3, покрыт unit-тестом на распределение (10000 прогонов, проверка что частоты примерно соответствуют весам, допуск ±5%)
- `App.tsx`: при клике "Крутить" — сначала `resolvePrize()`, затем `wheelEngine.spin(index)`, `onSpinEnd` callback переводит state в `result`
- `canvas-confetti` запускается при `segment.prize.isWin === true` поверх модалки результата
- `ResultModal.tsx` — текст из `config.copy.resultWinTitle`/`resultLoseTitle`, промокод крупным шрифтом с кнопкой "скопировать"

### Этап 5 — Lead form (3 ч)
- `LeadForm.tsx` на `react-hook-form` + `zodResolver`, поля берутся динамически из `config.leadForm.fields`
- Чекбокс согласия (GDPR, обязателен для DACH-рынка) — `consentText` из конфига, submit заблокирован без чекбокса
- Submit: POST на `config.leadForm.webhookUrl` (если задан) или в моковый `console.log` + localStorage — на этапе прототипа без реального бэкенда
- Состояния `submitting` → `submitted`/`error` в state machine, соответствующий UI (спиннер, success-экран, retry при ошибке)

### Этап 6 — Scratch-card вариант (5 ч)
- `ScratchEngine.ts`: слой приза (`PIXI.Sprite`/`Container` с текстом приза) + слой покрытия (`PIXI.Graphics`, залитый цветом/паттерном бренда)
- Слой покрытия рендерится в `RenderTexture`, стирание реализуется через рисование кругов с `blendMode: 'erase'` по траектории `pointermove`/`touchmove`
- Прогресс стирания: подсчёт прозрачных пикселей через `renderer.extract.pixels()` раз в ~200мс (не на каждый кадр — дорогая операция), либо приближённая оценка по длине пройденного пути курсора (дешевле, достаточно точно для UX)
- Авто-reveal оставшегося покрытия (`gsap.to(coverLayer, { alpha: 0 })`) при прогрессе >70%, чтобы пользователь не "домучивал" последние пиксели

### Этап 7 — Брендинг-конфигурация под демо-клиентов (3 ч)
- `campaigns/bank-demo.json`, `campaigns/travel-demo.json` — второй и третий конфиг с другими цветами/сегментами/лого
- `DebugPanel.tsx` — невидимый в проде (или за query-параметром `?debug=1`) переключатель `?campaign=fmcg-demo|bank-demo|travel-demo`, читает `URLSearchParams`, ре-монтирует `WheelCanvas` с новым конфигом
- Проверка: смена конфига не требует пересборки — только смена query-параметра/JSON-файла

### Этап 8 — Аналитика (2 ч)
- `lib/analytics.ts` — обёртка над `window.gtag`, единая точка вызова событий
- События: `wheel_view` (монтирование), `spin_start`, `spin_result` (с параметром `prize_code`, `is_win`), `lead_form_view`, `lead_submitted`, `lead_error`
- GA4 подключается через `gtag.js` в `index.html`, `measurement_id` — env-переменная

### Этап 9 — Полировка и адаптив (4 ч)
- `WheelEngine.resize()` вызывается на `window.resize`/`ResizeObserver` контейнера — pixi canvas должен вписываться в контейнер без искажений (`Math.min(containerWidth, containerHeight)` для диаметра колеса)
- Touch-события: кнопка "Крутить" — обычная DOM-кнопка (не canvas-элемент), pixi-canvas не должен перехватывать touch с DOM UI
- Тест на реальном iOS Safari — специфика автоплей-политики звука (см. раздел 5)
- Проверка Lighthouse mobile score (цель — Performance > 80)

### Этап 10 — Деплой + QA (2 ч)
- `vercel.ts` финальная конфигурация (см. раздел 7)
- Прогон `e2e/spin-flow.spec.ts` (Playwright) на preview-деплое
- Финальный чеклист из раздела 9

**Итого: ~34 часа** (около 5 рабочих вечеров/выходных при 6-8ч/сессия)

## 5. Ключевые технические вызовы

- **Синхронизация "честного" результата с анимацией.** Решение: резолвить приз заранее (`resolvePrize()` ДО `wheelEngine.spin()`), анимация — чисто визуальный слой поверх готового ответа. Никогда не определять результат по тому, "где случайно остановилось" колесо.
- **Производительность на слабых мобильных (основной трафик из TikTok — низкобюджетные Android).** Решение: `resolution: Math.min(devicePixelRatio, 2)`, ограничить `canvas-confetti` до `particleCount: 80` максимум, тестировать на throttled CPU 4x в DevTools + на реальном бюджетном устройстве (не только эмуляция).
- **Загрузка веб-шрифтов ДО рендера pixi-текста.** Canvas-based рендер (в отличие от DOM) не переотрисовывается автоматически при догрузке шрифта — если `PIXI.Text` создан раньше, чем шрифт загрузился, текст останется в fallback-шрифте навсегда. Решение: `await document.fonts.load('700 24px "Inter"')` (Font Loading API) до инициализации `WheelEngine`, либо `document.fonts.ready` перед `mount()`.
- **iOS Safari блокирует автовоспроизведение звука без явного жеста пользователя.** Решение: `howler.js` инстансы создавать заранее, но `Howler.ctx.resume()` / первый `play()` вызывать строго внутри обработчика клика по кнопке "Крутить" (первый user gesture на странице), не при монтировании компонента.
- **ERASE blend mode для scratch-card может вести себя по-разному между WebGL1/WebGL2.** Решение: pixi v8 по умолчанию форсирует WebGL2/WebGPU где доступно; явно проверить `renderer.type` при инициализации и залогировать в консоль на этапе разработки; fallback-вариант на Canvas2D `globalCompositeOperation: 'destination-out'`, если `PIXI.Application.init()` вернул Canvas-рендерер.
- **Быстрая смена брендинга под нового клиента без пересборки.** Решение: config подгружается через `fetch('/config/campaigns/{id}.json')` в рантайме (не импортируется статически в бандл), тогда смена клиента = замена JSON-файла в `public/`, без `npm run build`.
- **Защита от повторного прохождения (открутил → обновил страницу → крутит снова).** Для прототипа — `lib/session.ts`: `localStorage` флаг `spun_{campaignId}` с `expiresAt` (TTL 24ч). Явно отметить в демо как "prototype-level" защиту — для прода нужен backend с rate-limit по IP/device fingerprint, localStorage обходится через incognito.
- **GDPR-согласие в форме лида обязательно для DACH-рынка.** Чекбокс согласия — не декоративный элемент: submit должен быть technically заблокирован (`disabled`) пока чекбокс не отмечен, текст согласия — редактируемое поле конфига, не хардкод.

## 6. MVP-скоуп vs nice-to-have

**MVP:**
- Колесо с 6-8 сегментами, вращение, честный weighted random (unit-тестом покрыт)
- Модалка результата + форма лида (email + GDPR-чекбокс)
- 1 брендинг-конфиг, адаптив под мобильный
- Базовая GA4-аналитика (5 событий из этапа 8)

**Nice-to-have (после демо):**
- Scratch-card как альтернативная механика (не обязательна для первого демо, но хорошо показывает гибкость движка)
- Sound design (джингл, тик колеса) — можно показать демо и без звука, если не хватает времени на этап 6/9
- Confetti-эффект при выигрыше
- A/B разные наборы призов/весов
- Интеграция с реальным CRM/email-провайдером вместо webhook-заглушки
- Мультиязычность (DE/EN для DACH-рынка) — структура конфига уже это допускает (`copy` — отдельный блок), но UI-переключатель языка не реализован в MVP
- Anti-fraud (rate limit на сервере, капча)
- Seeded RNG с сервера вместо `Math.random()` на клиенте

## 7. План деплоя

- **Хостинг:** Vercel (static build, pixi.js — чисто клиентский бандл, SSR не нужен)
- **CI/CD:** Vercel Git-интеграция — auto-deploy preview на каждый PR, prod-деплой на merge в main

### vercel.ts

```typescript
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  framework: 'vite',
  headers: [
    {
      source: '/config/campaigns/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=60' }],
    },
    {
      source: '/assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};
```

### Переменные окружения

```
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
VITE_DEFAULT_CAMPAIGN=fmcg-demo
```

- **Адаптация под нового клиента:** новый JSON в `public/config/campaigns/{client}.json` + ассеты (лого, звуки) в `public/assets/{client}/`. Цель — от "новый клиент подписал бриф" до "лендинг готов" за 2-4 часа (замена ассетов + конфига, без правки кода движка).
- **Мультитенантность (если нужно несколько клиентов на одном деплое):** роутинг по query-param (`?campaign=fmcg-demo`) уже реализован в MVP через `DebugPanel`; для прод-мультитенантности — роутинг по subdomain через Vercel `rewrites` в `vercel.ts`, маппинг subdomain → campaignId на edge.

## 8. Метрики для замера успеха прототипа

**"Вау"-метрики для презентации менеджменту:**
- Время загрузки первого кадра игры (< 1.5 сек — показывает техническую состоятельность)
- FPS во время анимации вращения (стабильные 60fps на демо-устройстве, проверяется через Chrome DevTools Performance panel вживую)
- Скорость адаптации под нового клиента вживую (переключить конфиг на глазах у менеджмента — "вот так за 5 минут меняем бренд")
- Визуальное качество (плавность, звук, "ощущение" приложения, а не веб-страницы)

**Реальные метрики для будущих клиентов:**
- Engagement rate: % посетителей лендинга, начавших игру (`spin_start` / `wheel_view`)
- Completion rate: % начавших → % досмотревших до результата (`spin_result` / `spin_start`)
- Lead conversion: % досмотревших → % оставивших контакт (`lead_submitted` / `spin_result`)
- Time to complete: среднее время от захода до отправки формы
- Share rate: % поделившихся результатом (если добавлена соц-кнопка)
- CPL в сравнении со стандартной формой захвата лида (baseline для питча агентства)

## 9. Чеклист готовности к демонстрации

- [ ] Колесо крутится плавно на десктопе и мобильном (реальное устройство, не только DevTools-эмуляция)
- [ ] Минимум 2 брендинг-конфига готовы к переключению вживую (`?campaign=...`)
- [ ] Форма лида валидируется, GDPR-чекбокс работает как хард-блокер, показывает success-состояние
- [ ] Нет консольных ошибок/warning в проде
- [ ] Задеплоено на публичный URL (не localhost) — менеджмент должен открыть с телефона
- [ ] Есть fallback-текст/скриншот на случай сбоя интернета на демо
- [ ] Подготовлен 1-минутный сценарий показа: "видим рекламу → лендинг → игра → приз → лид"
- [ ] Аналитика подключена и видно события в GA4 realtime (для убедительности "мы это тоже трекаем")
- [ ] Проверено на реальном iOS Safari — звук включается по клику, не падает молча
- [ ] `prizeResolver` покрыт unit-тестом на распределение весов
- [ ] Playwright smoke-тест `spin-flow.spec.ts` зелёный на preview-деплое

## Приложение — тестовый план

### Unit-тесты (vitest)
- `prizeResolver.test.ts` — 10000 прогонов, проверка распределения по весам (допуск ±5%), edge case: один сегмент с weight=100 остальные 0
- `geometry.test.ts` — `computeTargetRotation` возвращает угол в ожидаемом диапазоне для каждого индекса сегмента, для 4/8/12 сегментов

### E2E smoke-тест (Playwright, e2e/spin-flow.spec.ts)
```
1. Открыть /?campaign=fmcg-demo
2. Дождаться appearance кнопки "Крутить" (WheelEngine onReady)
3. Кликнуть "Крутить"
4. Дождаться модалки результата (таймаут = spinDurationMs + 1000мс)
5. Проверить что промокод отображается и не пустой
6. Заполнить форму лида, кликнуть submit
7. Проверить success-состояние
```

### Ручное QA на реальных устройствах перед демо
- iPhone (последние 2 поколения) — Safari
- Средний Android (напр. Samsung A-серия) — Chrome
- Desktop Chrome/Firefox/Safari
- Throttled 3G/4G сеть — проверка загрузки ассетов
