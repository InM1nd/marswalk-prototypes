# Прототип 4 — Personality-Quiz с 3D-визуализацией результата

## 1. Обзор

Квиз из 5-7 вопросов с ветвлением логики ("какой ты тип путешественника/инвестора/водителя"), по итогам которого генерируется персонализированный результат, визуализированный как 3D-объект/аватар, собранный из компонентов на основе ответов пользователя.

**Для какого клиента/кампании подходит:**
- Туризм — "какой ты турист" → 3D-чемодан/глобус, собранный из стикеров направлений
- Банкинг — "какой ты финансовый тип" → 3D-копилка/карта с персонализированным дизайном
- Мобильность — "какой ты водитель/райдер" → 3D-модель транспорта в подходящей комплектации
- FMCG — "подбери свой вкус/продукт" → 3D-упаковка продукта под профиль пользователя

Отлично работает как top-of-funnel контент для TikTok/Instagram (клиенты marswalk.media) — квизы органически шерятся, результат — готовый контент для сторис.

**Бизнес-метрика:** completion rate квиза (% дошедших до конца), share rate результата, время на прохождение (не должно быть избыточным), конверсия в подписку/лид на основе типа результата.

## 2. Технический стек

### Runtime-зависимости

```
next@^14.2                — App Router, SSR первого экрана, next/og
react@^18.3
react-dom@^18.3
three@^0.169               — 3D-визуализация результата
@react-three/fiber@^8.17
@react-three/drei@^9.114
zustand@^4.5                — состояние прохождения квиза
framer-motion@^11.5         — переходы между вопросами, прогресс-бар
zod@^3.23                   — типизация/валидация структуры квиза
react-hook-form@^7.52       — форма подписки/лида после результата (опционально)
@hookform/resolvers@^3.9
```

`next/og` (`ImageResponse`) идёт встроенным в Next.js — отдельного пакета не требует.

### Dev-зависимости

```
typescript@^5.5
@types/three@^0.169
vitest@^2.0                 — unit-тесты (computeResult, getNextQuestion)
@playwright/test@^1.47
eslint@^9 + eslint-config-next@^14.2
```

### Установка

```bash
npx create-next-app@latest marswalk-quiz --typescript --app --eslint --src-dir --no-tailwind
cd marswalk-quiz
npm install three @react-three/fiber @react-three/drei zustand framer-motion zod react-hook-form @hookform/resolvers
npm install -D @types/three vitest @playwright/test
```

## 3. Архитектура

Два независимых модуля, аналогично прототипу 3 — **quiz engine (логика) отделён от result renderer (3D)**:

1. **Quiz Logic Module** — данные вопросов, система подсчёта результата, ветвление (не только "линейный" квиз, но и conditional-переходы, если вопрос 3 зависит от ответа на вопрос 1)
2. **Result Renderer (3D)** — принимает на вход не "ответы пользователя", а уже вычисленный **result profile** (набор параметров: `{ archetype: 'explorer', colorScheme: 'warm', accessories: ['compass', 'map'] }`) и собирает из него 3D-сцену. Renderer не знает про вопросы квиза вообще — только про result profile.

Это разделение критично: позволяет менять вопросы/логику квиза без пересборки 3D-сцен, и наоборот — добавлять новые 3D-варианты результата без трогания quiz-логики. Тот же принцип, что в прототипе 3 (2D UI vs 3D render), применён здесь к паре (quiz UI vs 3D render).

### Схема потока данных

```
quiz-config.ts: [{ id, question, options: [{ text, weight: {archetype: 'explorer', +2} }] }]
        │
        ▼
 QuizEngine (React-компонент + zustand store состояния прохождения)
   - currentStepId, answers[]
   - getNextQuestion(state, config) → следующий вопрос с учётом ветвления
   - computeResult(answers, config) → ResultProfile
        │
        ▼
 ResultProfile { archetype, colorScheme, accessories[], scores: Record<archetype, number> }
        │
        ├──────────────────────────┐
        ▼                          ▼
 ResultScene3D (R3F,          ResultCardOG (next/og Route Handler,
 client-only через             серверный рендер для соцсетей)
 next/dynamic ssr:false)      - 2D-иллюстрация того же архетипа
 - выбирает GLB по archetype   - НЕ live 3D (соцсети не рендерят WebGL)
 - применяет colorScheme
 - добавляет accessories
   как отдельные меши
```

### Структура репозитория (Next.js App Router)

```
marswalk-quiz/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # редирект/лендинг → /quiz
│   │   ├── quiz/
│   │   │   └── [campaignId]/
│   │   │       └── page.tsx            # серверный компонент, грузит конфиг, рендерит <QuizApp>
│   │   ├── api/
│   │   │   └── og/
│   │   │       └── route.tsx           # ImageResponse, динамическая OG-картинка
│   │   └── result/
│   │       └── [campaignId]/
│   │           └── [archetype]/
│   │               └── page.tsx        # прямая ссылка на конкретный результат (для шеринга)
│   ├── quiz/
│   │   ├── QuizApp.tsx                 # 'use client', оркестрация state machine
│   │   ├── QuestionCard.tsx            # рендер вопроса, framer-motion transition
│   │   ├── ProgressBar.tsx
│   │   ├── getNextQuestion.ts          # чистая функция, ветвление
│   │   ├── computeResult.ts            # чистая функция, weighted scoring
│   │   ├── getNextQuestion.test.ts
│   │   └── computeResult.test.ts
│   ├── scene/
│   │   ├── ResultScene3D.tsx           # 'use client', R3F-сцена
│   │   ├── ResultModel.tsx             # useGLTF по archetype, применение colorScheme
│   │   └── archetypeModels.ts          # маппинг archetype → GLB/материалы/accessories
│   ├── store/
│   │   └── quizStore.ts                # zustand
│   ├── config/
│   │   ├── schema.ts                    # zod-схема QuizConfig
│   │   └── campaigns/
│   │       ├── travel-demo.ts
│   │       └── bank-demo.ts
│   ├── og/
│   │   └── ArchetypeIllustration.tsx    # статичные 2D SVG/PNG-иллюстрации под архетип, для next/og
│   └── components/
│       ├── ResultScreen.tsx
│       ├── ShareButton.tsx
│       └── LeadForm.tsx
├── public/
│   └── models/
│       └── travel-demo/
│           ├── explorer.glb
│           ├── relaxer.glb
│           └── planner.glb
├── e2e/
│   └── quiz-flow.spec.ts
├── vercel.ts
├── next.config.ts
└── package.json
```

### Типы конфигурации (config/schema.ts)

```typescript
import { z } from 'zod';

export const QuizOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  weights: z.record(z.string(), z.number()), // { explorer: 2, relaxer: 0, planner: 1 }
});

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(QuizOptionSchema).min(2).max(5),
  showIf: z.object({
    questionId: z.string(),
    equalsOptionId: z.string(),
  }).optional(), // ветвление — вопрос показывается только если условие выполнено
});

export const ArchetypeSchema = z.object({
  id: z.string(),                     // 'explorer'
  label: z.string(),                  // "Исследователь"
  description: z.string(),
  colorScheme: z.enum(['warm', 'cool', 'neutral']),
  modelUrl: z.string(),               // GLB под архетип
  accessories: z.array(z.string()).default([]),
  ogIllustrationUrl: z.string(),      // статичная 2D-картинка для OG
  priority: z.number().default(0),    // tie-breaker: выше priority выигрывает при равном score
});

export const QuizConfigSchema = z.object({
  campaignId: z.string(),
  questions: z.array(QuizQuestionSchema).min(5).max(7),
  archetypes: z.array(ArchetypeSchema).min(2),
  copy: z.object({
    title: z.string(),
    startButtonLabel: z.string().default('Начать'),
    resultShareLabel: z.string().default('Поделиться'),
    resultRetryLabel: z.string().default('Пройти ещё раз'),
  }),
});

export type QuizConfig = z.infer<typeof QuizConfigSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Archetype = z.infer<typeof ArchetypeSchema>;
```

### Ветвление логики (quiz/getNextQuestion.ts)

```typescript
export function getNextQuestion(
  currentQuestionId: string | null,
  answers: Record<string, string>, // questionId -> optionId
  config: QuizConfig,
): QuizQuestion | null {
  const currentIndex = currentQuestionId
    ? config.questions.findIndex((q) => q.id === currentQuestionId)
    : -1;

  for (let i = currentIndex + 1; i < config.questions.length; i++) {
    const candidate = config.questions[i];
    if (!candidate.showIf) return candidate;
    const answeredOptionId = answers[candidate.showIf.questionId];
    if (answeredOptionId === candidate.showIf.equalsOptionId) return candidate;
    // условие не выполнено — пропускаем вопрос, идём к следующему
  }
  return null; // квиз завершён
}
```

Ветвление описано декларативно в конфиге (`showIf`), а не через if/else в компонентах — единая функция `getNextQuestion` обрабатывает все случаи, включая цепочку из нескольких пропущенных подряд вопросов. Покрывается unit-тестом на: линейный квиз без ветвления, квиз с одним пропущенным вопросом, квиз с несколькими подряд пропущенными.

### Подсчёт результата и tie-breaker (quiz/computeResult.ts)

```typescript
export function computeResult(
  answers: Record<string, string>,
  config: QuizConfig,
): { archetype: Archetype; scores: Record<string, number> } {
  const scores: Record<string, number> = {};
  for (const archetype of config.archetypes) scores[archetype.id] = 0;

  for (const question of config.questions) {
    const selectedOptionId = answers[question.id];
    const option = question.options.find((o) => o.id === selectedOptionId);
    if (!option) continue; // вопрос был пропущен ветвлением — не участвует в подсчёте
    for (const [archetypeId, weight] of Object.entries(option.weights)) {
      scores[archetypeId] = (scores[archetypeId] ?? 0) + weight;
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  const topArchetypes = config.archetypes.filter((a) => scores[a.id] === maxScore);
  // tie-breaker: при равенстве баллов выигрывает архетип с большим priority
  const winner = topArchetypes.sort((a, b) => b.priority - a.priority)[0];

  return { archetype: winner, scores };
}
```

### zustand store (store/quizStore.ts)

```typescript
interface QuizStore {
  config: QuizConfig | null;
  currentQuestionId: string | null;
  answers: Record<string, string>;
  result: { archetype: Archetype; scores: Record<string, number> } | null;
  loadConfig: (config: QuizConfig) => void;
  answerQuestion: (questionId: string, optionId: string) => void; // + авто-advance через getNextQuestion
  reset: () => void;
}
```

### ResultScene3D — client-only рендер (scene/ResultScene3D.tsx)

```typescript
'use client';
// Next.js SSR не имеет window/document — R3F-компонент обязан грузиться
// только на клиенте, иначе build/SSR упадёт на попытке инициализировать WebGL
import dynamic from 'next/dynamic';

const ResultScene3DInner = dynamic(() => import('./ResultScene3DInner'), {
  ssr: false,
  loading: () => <ResultSceneSkeleton />,
});

export function ResultScene3D({ archetype }: { archetype: Archetype }) {
  return <ResultScene3DInner archetype={archetype} />;
}
```

`ResultScene3DInner.tsx` содержит сам `<Canvas>` (R3F), `useGLTF(archetype.modelUrl)`, применение `colorScheme` и `accessories` — логика применения материалов идентична `ProductModel.tsx` из прототипа 3 (императивно через `useEffect`, не пересоздавая JSX-дерево).

### OG-картинка для шеринга (app/api/og/route.tsx)

```typescript
import { ImageResponse } from 'next/og';
import { getArchetypeById } from '@/config/campaigns';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaign') ?? '';
  const archetypeId = searchParams.get('archetype') ?? '';
  const archetype = getArchetypeById(campaignId, archetypeId);
  if (!archetype) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '1200px', height: '630px', background: '#111', color: '#fff' }}>
        {/* статичная 2D-иллюстрация архетипа, НЕ live 3D — соцсети не рендерят WebGL */}
        <img src={archetype.ogIllustrationUrl} width={630} height={630} />
        <div style={{ padding: 40, fontSize: 48 }}>{archetype.label}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

Эндпоинт вызывается через `<meta property="og:image" content="/api/og?campaign=travel-demo&archetype=explorer">` на странице `/result/[campaignId]/[archetype]` — прямая shareable-ссылка на конкретный результат, не требующая query-параметров с ответами пользователя в URL.

## 4. План разработки по этапам

### Этап 0 — Setup Next.js + структура (3 ч)
- `npx create-next-app@latest`, установка зависимостей раздела 2
- Роутинг `app/quiz/[campaignId]/page.tsx`, базовая структура папок из раздела 3
- Проверка что `next dev` и первый деплой на Vercel работают

### Этап 1 — Config + типы (3 ч)
- `config/schema.ts`, тестовый `campaigns/travel-demo.ts` (5 вопросов, 3 архетипа)
- Загрузчик конфига — статический импорт по `campaignId` (Next.js server component, не fetch — конфиг живёт в репозитории как TS-модуль, не JSON, что даёт типобезопасность без runtime-валидации на каждый запрос)

### Этап 2 — Quiz логика: вопросы, ответы, прогресс-бар (5 ч)
- `QuizApp.tsx` — `'use client'`, оркестрация через `quizStore` + `getNextQuestion`
- `QuestionCard.tsx` — рендер текущего вопроса, `framer-motion` `AnimatePresence` для slide/fade между вопросами
- `ProgressBar.tsx` — процент пройденных вопросов (с учётом того, что ветвление может менять общее число фактически показанных вопросов — прогресс считается по факту, не по статичному count)

### Этап 3 — Система подсчёта результата (4 ч)
- `computeResult.ts` из раздела 3, unit-тест на edge case ничьей между 2 архетипами (tie-breaker по `priority`)
- Тест на "все ответы дают одному архетипу максимум" и "равномерное распределение весов"

### Этап 4 — Ветвление логики (conditional questions) (3 ч)
- `getNextQuestion.ts`, добавление `showIf` в 1-2 вопроса тестового конфига
- Unit-тест на цепочку из нескольких подряд пропущенных вопросов

### Этап 5 — Базовая 3D-сцена результата (5 ч)
- Переиспользование паттерна `ProductScene`/`ProductModel` из прототипа 3: `<Canvas>`, `<Environment>`, `<OrbitControls>`, `useGLTF` по `archetype.modelUrl`
- `ResultScene3D.tsx` с `next/dynamic({ ssr: false })` — см. код раздела 3, критично для отсутствия SSR-ошибок

### Этап 6 — Применение параметров результата к 3D-сцене (6 ч)
- Смена `colorScheme` — маппинг `warm/cool/neutral` → палитра цветов, применяется к материалам модели так же, как в `ProductModel.tsx` прототипа 3
- `accessories[]` — отдельные меши (`compass.glb`, `map.glb` и т.п.), условно добавляемые в сцену через `{accessories.includes('compass') && <Compass />}`

### Этап 7 — Экран результата (UI) (3 ч)
- `ResultScreen.tsx` — текстовое описание архетипа (`archetype.description`), `ShareButton.tsx`, кнопка "пройти ещё раз" (`quizStore.reset()`)
- Переход на `/result/[campaignId]/[archetype]` после завершения квиза (для получения shareable-URL) вместо чисто client-side состояния

### Этап 8 — OG-картинка для шеринга (4 ч)
- `app/api/og/route.tsx` из раздела 3, `runtime: 'edge'`
- Заготовка 2D-иллюстраций (`ogIllustrationUrl`) под каждый архетип — офлайн-скриншот 3D-сцены с хорошего ракурса, обработанный в графическом редакторе, либо отдельная 2D-иллюстрация от дизайнера
- Проверка через Facebook Sharing Debugger и Twitter/X Card Validator

### Этап 9 — Адаптация под 2 конфига квиза (4 ч)
- Второй `campaigns/bank-demo.ts` с полностью другим набором вопросов/архетипов/GLB
- Проверка что `QuizApp`/`ResultScene3D`/OG route не содержат хардкода под конкретную кампанию

### Этап 10 — Адаптив под мобильный (4 ч)
- Квизы почти всегда проходятся с телефона — приоритет мобильной раскладки над десктопной
- `QuestionCard` — крупные тач-таргеты для вариантов ответа (мин. 44×44px), `ResultScene3D` — уменьшенная высота canvas на маленьких экранах

### Этап 11 — Деплой + QA + проверка OG в реальных соцсетях (3 ч)
- `vercel.ts`, Playwright `quiz-flow.spec.ts`
- Реальная отправка ссылки в Telegram/WhatsApp на демо-звонке с коллегой — проверка что превью подтягивается корректно

**Итого: ~44 часа**

## 5. Ключевые технические вызовы

- **Динамическая OG-картинка не может быть live-3D-рендером** (соцсети не рендерят WebGL для превью-карточек, краулеры Facebook/Telegram не исполняют JS). Решение: заранее подготовленные 2D-иллюстрации/скриншоты под каждый архетип, `next/og` `ImageResponse` собирает карточку из статичных элементов + текста (код раздела 3).
- **Ветвление логики квиза может быстро превратиться в нечитаемый код при большом числе условий.** Решение: декларативный `showIf` в конфиге + единая функция `getNextQuestion` (раздел 3), а не россыпь `if/else` в компонентах вопросов.
- **Ничья между архетипами при подсчёте весов.** Решение: `priority`-поле в конфиге архетипа как явный tie-breaker (раздел 3), а не случайный выбор — предсказуемость важна для отладки и для того, чтобы клиент мог осознанно настроить "дефолтный" результат.
- **SSR (Next.js) и three.js/R3F не дружат с сервером напрямую** — WebGL требует `window`/`document`, попытка рендера `<Canvas>` на сервере ломает build. Решение: `ResultScene3D` — обязательно `next/dynamic` с `{ ssr: false }` (код раздела 3), не просто `'use client'` (client-компонент всё равно проходит SSR-проход для начальной разметки, если явно не исключён из SSR).
- **Hydration mismatch между сервером и клиентом на 3D-компонентах.** Решение: `loading` fallback в `dynamic()` должен визуально совпадать по размеру с итоговым canvas-контейнером (skeleton с теми же `width`/`height`), иначе — layout shift и предупреждения гидратации в консоли.
- **Производительность: не грузить всю 3D-сцену, пока пользователь ещё проходит квиз.** Решение: `ResultScene3D` импортируется лениво только на экране результата; `useGLTF.preload(modelUrl)` вызывается заранее — когда пользователь отвечает на предпоследний вопрос, известен вероятный архетип-лидер по текущим `scores`, можно начать preload его модели в фоне.
- **`next/og` Edge runtime имеет ограничения на доступные Node.js API** (нет полного `fs`, лимит на размер ответа). Решение: `ogIllustrationUrl` — абсолютный URL на статичный ассет (не чтение файла с диска через `fs`), шрифты для текста в OG — загружаются через `fetch()` ArrayBuffer, не через локальный `readFileSync`.

## 6. MVP-скоуп vs nice-to-have

**MVP:**
- 5 вопросов, линейная логика (без ветвления), 3 возможных архетипа-результата
- 3D-сцена результата — одна базовая модель на архетип, смена цвета/материала (`colorScheme`)
- Статичная OG-картинка для шеринга
- Мобильная адаптация

**Nice-to-have:**
- Ветвление логики (conditional questions) — впечатляет на демо ("а вот тут квиз реагирует на предыдущий ответ"), но не критично для первого показа
- Больше архетипов (5-7) с уникальными accessory-наборами
- Анимация "сборки" 3D-объекта из компонентов на экране результата (эффект "собирается на глазах" — accessories появляются последовательно с задержкой через `framer-motion`/`gsap`)
- Персонализированный текст-описание через LLM вместо статичных шаблонов
- Второй конфиг квиза под другую вертикаль (для демонстрации переносимости платформы)
- Preload модели вероятного архетипа-лидера до завершения квиза (описано в разделе 5, но не обязательно для первого демо)

## 7. План деплоя

- **Хостинг:** Vercel (нативная поддержка Next.js App Router, `next/og` Route Handlers работают из коробки как Vercel Functions/Edge Functions)
- **CI/CD:** Git-интеграция Vercel, preview-деплои на PR — особенно полезно для квизов, т.к. легко прогнать A/B разных наборов вопросов на preview-ссылках

### vercel.ts

```typescript
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  headers: [
    {
      source: '/models/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/api/og',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' }],
    },
  ],
};
```

- **Адаптация под нового клиента:** новый `src/config/campaigns/{client}.ts` (вопросы, архетипы, веса) + набор GLB-моделей/материалов под архетипы + OG-иллюстрации. Реалистичное время адаптации — 1 день, главное узкое место — подготовка визуальных ассетов под новые архетипы (те же соображения, что в прототипе 3 — готовые GLB ускоряют адаптацию, моделирование с нуля добавляет дни работы 3D-специалиста)
- **OG-превью:** обязательно протестировать через Facebook Sharing Debugger (`developers.facebook.com/tools/debug`) и Twitter/X Card Validator перед демо клиенту — краулеры соцсетей кэшируют превью, изменения в `ogIllustrationUrl` могут не отразиться без принудительной инвалидации кэша через дебаггер

## 8. Метрики для замера успеха прототипа

**"Вау"-метрики для презентации менеджменту:**
- Плавность переходов между вопросами (`framer-motion` transitions без рывков)
- Красота и персонализация финальной 3D-сцены результата
- Живая демонстрация: "проходим квиз с разными ответами → получаем разные 3D-результаты" — показывает вариативность системы за один присест
- Корректно работающее OG-превью при шеринге в реальный Telegram/WhatsApp чат прямо на демо

**Реальные метрики для будущих клиентов:**
- Quiz completion rate (% начавших → % дошедших до последнего вопроса) — ключевая метрика, показывает, не слишком ли длинный/скучный квиз
- Drop-off по вопросам (на каком вопросе чаще всего уходят — сигнал для доработки формулировок)
- Average time to complete
- Share rate результата (сколько % поделились)
- Referral traffic от расшаренных ссылок (клики по shared-ссылке → новые прохождения — вирусный коэффициент)
- Distribution результатов по архетипам (равномерное распределение или один архетип "перевешивает" — сигнал разбалансированности весов, проверяется через `computeResult` unit-тест на синтетических ответах)
- Конверсия "получил результат → подписался/оставил контакт"

## 9. Чеклист готовности к демонстрации

- [ ] Квиз проходится от начала до конца без багов на всех вариантах ответов
- [ ] 3D-результат корректно отображает минимум 3 разных архетипа с визуально разным результатом
- [ ] Переходы между вопросами плавные, прогресс-бар корректно отражает прогресс (в т.ч. при ветвлении)
- [ ] OG-картинка проверена в Facebook Sharing Debugger и реально открыта в Telegram/WhatsApp
- [ ] Мобильная версия протестирована на реальном телефоне (основной канал трафика)
- [ ] Задеплоено на публичный URL с нормальным доменом (не vercel-preview-хэш, если демо клиенту)
- [ ] Подготовлен сценарий: "проходим квиз вживую с менеджментом → у каждого свой результат → шерим в чат"
- [ ] Нет console errors, особенно связанных с SSR/hydration mismatch на 3D-компонентах
- [ ] `computeResult`/`getNextQuestion` покрыты unit-тестами, включая edge case ничьей

## Приложение — тестовый план

### Unit-тесты (vitest)
- `computeResult.test.ts` — корректный подсчёт весов, tie-breaker по `priority` при равенстве баллов, корректная обработка пропущенных (ветвлением) вопросов — не участвуют в сумме
- `getNextQuestion.test.ts` — линейный проход без ветвления, один пропущенный вопрос, несколько подряд пропущенных, конец квиза (`null` при отсутствии следующего вопроса)

### E2E smoke-тест (Playwright, e2e/quiz-flow.spec.ts)
```
1. Открыть /quiz/travel-demo
2. Кликнуть "Начать"
3. Последовательно ответить на все вопросы (клик по первому варианту каждый раз)
4. Дождаться экрана результата, проверить что 3D canvas отрендерился (elementHandle существует)
5. Проверить что заголовок архетипа отображается и не пустой
6. Открыть /api/og?campaign=travel-demo&archetype={полученный-архетип} напрямую — проверить статус 200 и content-type image/png
```

### Ручное QA перед демо
- iPhone/Android — полное прохождение квиза, проверка тач-таргетов вариантов ответа
- Реальная отправка ссылки в Telegram и WhatsApp — визуальная проверка OG-карточки
- Facebook Sharing Debugger + Twitter/X Card Validator — принудительная инвалидация кэша краулера перед демо
- Desktop Chrome/Firefox/Safari — проверка отсутствия hydration warning в консоли
