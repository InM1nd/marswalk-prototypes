# Прототип 2 — Брендированный мини-раннер / Matching Game

## 1. Обзор

Лёгкая аркадная игра (эндлесс-раннер с препятствиями/сбором предметов, либо matching-игра типа "memory") с таймером, счётчиком очков и брендированием игровых элементов в реальном времени (логотип персонажа, цвет фона, брендированные препятствия/призы).

**Для какого клиента/кампании подходит:**
- Мобильность (каршеринг/самокаты/такси) — "убегай от пробок", собирай бонусные поездки, персонаж-машинка/самокат
- FMCG — matching игра с продуктами линейки (собери 3 упаковки), сезонные активации
- Банкинг — "успей накопить монеты за 30 сек", геймификация финансовой грамотности
- Туризм — раннер "долети до курорта", избегай препятствий, собирай бонусы на бронирование

Хорошо работает как in-app механика после клика на TikTok-рекламу с элементом соревновательности (таблица лидеров, "побей свой рекорд, поделись результатом").

**Бизнес-метрика:** average session time, replay rate (сколько раз переигрывают), share rate результата, конверсия в лид после N попыток или после достижения порога очков.

## 2. Технический стек

### Runtime-зависимости

```
pixi.js@^8.6           — рендер игрового поля, спрайты, анимация
matter-js@^0.20        — физический движок (раннер-вариант)
@types/matter-js@^0.19 — типы (matter-js сам без TS-типов из коробки)
@pixi/sound@^6.0       — звуковые эффекты, интегрирован с pixi ticker/loader
react@^18.3
react-dom@^18.3
zustand@^4.5           — игровой стейт, доступный и движку, и React
nanoid@^5.0            — session id для лидерборда
canvas-confetti@^1.9   — эффект нового рекорда
```

### Dev-зависимости

```
vite@^5.4
@vitejs/plugin-react@^4.3
typescript@^5.5
vitest@^2.0                — unit-тесты (ObstacleSpawner pooling, matching-логика, scoring)
@playwright/test@^1.47     — smoke e2e
eslint@^9 + typescript-eslint@^8
prettier@^3.3
```

Для matching-игры вместо matter-js физика не нужна — там просто pixi + grid-логика (сравнение открытых карточек), matter-js используется только для раннер-варианта. `@pixi/sound` выбран вместо howler для этого прототипа, т.к. интегрируется напрямую с `PIXI.Assets` loader (один пайплайн загрузки для спрайтов и звука).

### Установка

```bash
npm create vite@latest marswalk-runner -- --template react-ts
cd marswalk-runner
npm install pixi.js matter-js @pixi/sound zustand nanoid canvas-confetti
npm install -D @types/matter-js vitest @playwright/test
```

## 3. Архитектура

Три независимых слоя, как и в прототипе 1, но с добавлением физического слоя:

1. **Config layer** — JSON: спрайты персонажа/препятствий/бонусов, скорость игры, длительность раунда, брендинг-цвета, тексты
2. **Physics/Game engine (matter-js + pixi.js)** — тикает независимо от React, обновляет позиции тел в matter-js мире, синхронизирует их с pixi-спрайтами на каждый кадр (`Matter.Engine.update` → position sync → `pixi ticker render`)
3. **UI layer (React + zustand)** — HUD (счёт, таймер, жизни), стартовый/финальный экраны. React НЕ рендерит игровые объекты — только читает `score`/`gameState` из zustand-стора, который обновляет игровой движок

### Схема потока данных (раннер-вариант)

```
Config (JSON: скорости, спрайты, длительность)
        │
        ▼
 GameEngine (класс, инкапсулирует Matter.Engine + PIXI.Application)
   ├─ Matter World: player body, obstacle bodies (pool), ground (static)
   ├─ Collision events → onObstacleHit / onCoinCollect
   └─ Каждый tick: sync Matter body.position → PIXI sprite.position (с интерполяцией)
        │
        ▼ (через zustand store, engine пишет, React читает)
   GameStore { score, lives, timeLeft, status, distance }
        │
        ▼
   React HUD (просто подписан на store, ре-рендерится при изменениях)
```

Ключевой архитектурный принцип: **input controller отделён от игровой логики.** Обработчик тач/клавиатуры пишет намерение (`jumpRequested = true`) в отдельный `InputController`, а игровой луп на `requestAnimationFrame`/pixi ticker читает это намерение и применяет физическую силу через `Matter.Body.applyForce`. Это позволяет позже безболезненно добавить, например, свайп-геймпад для мобильного без переписывания физики.

### Структура репозитория

```
marswalk-runner/
├── public/
│   └── assets/
│       ├── mobility-demo/
│       │   ├── sprites.json        # pixi spritesheet atlas
│       │   ├── sprites.png
│       │   ├── sfx-jump.mp3
│       │   ├── sfx-hit.mp3
│       │   ├── sfx-coin.mp3
│       │   └── music-loop.mp3
│       ├── fmcg-matching-demo/
│       └── bank-demo/
├── src/
│   ├── engine/
│   │   ├── GameEngine.ts           # оркестратор Matter + PIXI, раннер
│   │   ├── InputController.ts      # клавиатура/тач/свайп → намерения
│   │   ├── ObstacleSpawner.ts      # пул препятствий, интервал по дистанции
│   │   ├── CollectibleSpawner.ts   # пул монет/бонусов (sensor bodies)
│   │   ├── ParallaxBackground.ts   # tilingSprite слои
│   │   ├── MatchingEngine.ts       # альтернативный движок (без matter-js)
│   │   ├── GameEngine.test.ts
│   │   └── ObstacleSpawner.test.ts
│   ├── store/
│   │   ├── gameStore.ts            # zustand store
│   │   └── leaderboardStore.ts     # localStorage top-5
│   ├── config/
│   │   ├── schema.ts                # zod-схема RunnerConfig / MatchingConfig
│   │   └── campaigns/
│   │       ├── mobility-demo.json
│   │       ├── fmcg-matching-demo.json
│   │       └── bank-demo.json
│   ├── app/
│   │   ├── App.tsx
│   │   ├── StartScreen.tsx
│   │   ├── GameCanvas.tsx           # монтирует GameEngine в контейнер
│   │   ├── HUD.tsx                  # счёт/таймер/жизни, читает zustand
│   │   ├── GameOverScreen.tsx
│   │   ├── Leaderboard.tsx
│   │   └── DebugPanel.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── e2e/
│   └── runner-flow.spec.ts
├── vercel.ts
├── vite.config.ts
└── package.json
```

### Типы конфигурации (config/schema.ts)

```typescript
import { z } from 'zod';

export const RunnerConfigSchema = z.object({
  campaignId: z.string(),
  mode: z.literal('runner'),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    spritesheetUrl: z.string(),      // pixi atlas json
    logoUrl: z.string().optional(),
  }),
  physics: z.object({
    gravity: z.number().default(1.2),
    jumpForce: z.number().default(-14),
    baseSpeed: z.number().default(6),      // px/tick, дистанция скролла
    speedRampPerSecond: z.number().default(0.05), // ускорение со временем
  }),
  round: z.object({
    durationSeconds: z.number().default(45),
    lives: z.number().default(1),
    obstacleIntervalMs: z.object({ min: z.number(), max: z.number() }).default({ min: 900, max: 1800 }),
    coinIntervalMs: z.object({ min: z.number(), max: z.number() }).default({ min: 600, max: 1200 }),
  }),
  copy: z.object({
    title: z.string(),
    startButtonLabel: z.string().default('Играть'),
    gameOverTitle: z.string(),
    retryButtonLabel: z.string().default('Ещё раз'),
  }),
  sound: z.object({
    jumpUrl: z.string(),
    hitUrl: z.string(),
    coinUrl: z.string(),
    musicUrl: z.string().optional(),
    enabled: z.boolean().default(true),
  }),
});

export const MatchingConfigSchema = z.object({
  campaignId: z.string(),
  mode: z.literal('matching'),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    cardBackUrl: z.string(),
  }),
  cards: z.array(z.object({ id: z.string(), imageUrl: z.string() })).min(4).max(9), // N пар
  round: z.object({
    durationSeconds: z.number().default(60),
  }),
  copy: RunnerConfigSchema.shape.copy,
  sound: RunnerConfigSchema.shape.sound,
});

export type RunnerConfig = z.infer<typeof RunnerConfigSchema>;
export type MatchingConfig = z.infer<typeof MatchingConfigSchema>;
export type CampaignConfig = RunnerConfig | MatchingConfig;
```

### Публичный API GameEngine (engine/GameEngine.ts)

```typescript
export interface GameEngineOptions {
  container: HTMLElement;
  config: RunnerConfig;
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onReady?: () => void;
}

export class GameEngine {
  constructor(options: GameEngineOptions);
  mount(): Promise<void>;      // init PIXI.Application + Matter.Engine, загрузка spritesheet
  start(): void;                // сброс мира, запуск Matter.Runner + pixi ticker
  pause(): void;
  resize(width: number, height: number): void;
  destroy(): void;              // Matter.Engine.clear(), pixi.destroy(), снятие listeners
}
```

`GameCanvas.tsx` — тонкая обёртка, аналогичная `WheelCanvas.tsx` из прототипа 1: `useEffect` создаёт `GameEngine`, `mount()` + `start()`, cleanup вызывает `destroy()`.

### Zustand store (store/gameStore.ts)

```typescript
interface GameStore {
  status: 'idle' | 'playing' | 'gameover';
  score: number;
  distance: number;
  timeLeft: number;
  lives: number;
  // actions — вызываются ТОЛЬКО из GameEngine, не из React-компонентов напрямую
  addScore: (points: number) => void;
  tickTime: (deltaSeconds: number) => void;
  loseLife: () => void;
  reset: (config: RunnerConfig) => void;
  setStatus: (status: GameStore['status']) => void;
}
```

React-компоненты (`HUD.tsx`) подписываются через селекторы (`useGameStore((s) => s.score)`), чтобы не ре-рендериться на изменения полей, которые их не касаются.

### Синхронизация физики и рендера

`matter-js` по умолчанию не привязан к `requestAnimationFrame` жёстко — используем `Matter.Runner.create({ isFixed: true, delta: 1000 / 60 })`, что даёт детерминированный физический шаг независимо от фактического FPS устройства. Синхронизация с pixi:

```typescript
// внутри GameEngine, вызывается на каждый pixi ticker tick
private syncSprites(alpha: number) {
  for (const [body, sprite] of this.bodySpriteMap) {
    // интерполяция между предыдущей и текущей физической позицией
    // сглаживает визуальное движение, если pixi-кадр случился между физ-шагами
    sprite.x = lerp(body.positionPrev.x, body.position.x, alpha);
    sprite.y = lerp(body.positionPrev.y, body.position.y, alpha);
    sprite.rotation = body.angle;
  }
}
```

`alpha` — доля времени между последним и следующим физическим шагом (аккумулятор фиксированного таймстепа, паттерн "fixed update + interpolated render", стандартный для игр с независимой физикой/рендером).

### Object pooling препятствий (engine/ObstacleSpawner.ts)

```typescript
export class ObstacleSpawner {
  private pool: Matter.Body[] = [];   // 10-15 переиспользуемых тел
  private poolSize = 12;

  constructor(private world: Matter.World, private config: RunnerConfig) {
    for (let i = 0; i < this.poolSize; i++) {
      const body = Matter.Bodies.rectangle(-999, -999, 40, 60, { isSensor: false, label: 'obstacle' });
      Matter.World.add(this.world, body);
      Matter.Body.setStatic(body, true); // не падает, но двигаем вручную
      this.pool.push(body);
    }
  }

  spawn(x: number, y: number) {
    const free = this.pool.find((b) => b.position.x < 0); // "запаркованные" за экраном
    if (!free) return; // пул исчерпан — пропускаем спавн, не создаём новое тело
    Matter.Body.setPosition(free, { x, y });
  }

  recycle(body: Matter.Body) {
    Matter.Body.setPosition(body, { x: -999, y: -999 });
  }
}
```

Пул исключает GC-паузы от постоянного создания/удаления Matter-тел — критично для стабильного FPS на слабых Android-устройствах, где сборка мусора визуально проявляется как микро-фризы во время игры.

### InputController (engine/InputController.ts)

```typescript
export class InputController {
  private jumpRequested = false;

  constructor(target: HTMLElement) {
    target.addEventListener('touchstart', this.handleJump, { passive: true });
    target.addEventListener('keydown', (e) => { if (e.code === 'Space') this.handleJump(); });
  }

  private handleJump = () => { this.jumpRequested = true; };

  consumeJump(): boolean {
    if (!this.jumpRequested) return false;
    this.jumpRequested = false;
    return true;
  }
}
```

Обработка `touchstart` вместо `touchend` — устраняет ~100-300мс задержку восприятия отклика на тач-устройствах. `consumeJump()` вызывается один раз за физический тик игровым лупом, не в самом обработчике события (избегаем применения силы вне физического шага).

## 4. План разработки по этапам

**Раннер-вариант (основной):**

### Этап 0 — Setup (2 ч)
- `npm create vite@latest`, установка зависимостей раздела 2
- Proof of concept: `Matter.Engine` + `PIXI.Application`, один статичный прямоугольник падает под гравитацией на "землю" — подтверждение что связка работает до начала архитектуры

### Этап 1 — Config + типы (2 ч)
- `config/schema.ts`, тестовый `mobility-demo.json`
- Загрузчик конфига аналогичен прототипу 1 (`fetch` + `zod.parse`)

### Этап 2 — Игрок + управление прыжком (4 ч)
- Spawn player body (`Matter.Bodies.rectangle` или `circle`, фиксированный hitbox независимо от визуального спрайта — см. раздел 5)
- `InputController` из раздела 3, `Matter.Body.applyForce(player, position, { x: 0, y: jumpForce })` по `consumeJump()`
- Sync с pixi-спрайтом через `bodySpriteMap`, первая интерполяция

### Этап 3 — Препятствия + коллизии (5 ч)
- `ObstacleSpawner` с пулом (раздел 3), спавн по таймеру с рандомизацией интервала (`obstacleIntervalMs.min/max`)
- `Matter.Events.on(engine, 'collisionStart', handleCollision)` — фильтрация по `label === 'obstacle'`, вызов `onGameOver` при `lives === 0`
- Признак прохождения препятствия без столкновения → `+score`

### Этап 4 — Скролл фона + ощущение скорости (3 ч)
- `ParallaxBackground`: 2-3 `TilingSprite` слоя с разной скоростью `tilePosition.x -= speed * layerFactor`
- Постепенное ускорение: `currentSpeed = baseSpeed + elapsedSeconds * speedRampPerSecond`, применяется и к фону, и к скорости спавна препятствий

### Этап 5 — Счёт, таймер, бонусы (4 ч)
- `CollectibleSpawner` — аналогичный пул, но тела с `isSensor: true` (не блокируют движение, только детектят пересечение)
- `Matter.Events.on(engine, 'collisionStart', ...)` — при пересечении с сенсором монеты: `recycle()` + `gameStore.addScore(10)`
- Таймер: `gameStore.tickTime(deltaSeconds)` на каждый физический тик, при `timeLeft <= 0` → `status: 'gameover'`

### Этап 6 — HUD + Start/GameOver экраны (3 ч)
- `StartScreen.tsx` — правила игры, кнопка "Играть" (запускает `engine.start()`)
- `HUD.tsx` — счёт/таймер поверх canvas (обычный DOM, `position: absolute`), подписан на zustand-селекторы
- `GameOverScreen.tsx` — финальный счёт, сравнение с личным рекордом, кнопка рестарта

### Этап 7 — Звук (2 ч)
- `@pixi/sound` — регистрация звуков через `PIXI.Assets` bundle вместе со спрайтами (один loader)
- Прыжок/столкновение/монетка — короткие эффекты; фоновая музыка — `loop: true`, кнопка mute в HUD пишет в `gameStore`/localStorage
- Разблокировка звука на первый user gesture — тот же паттерн, что в прототипе 1 (раздел 5)

### Этап 8 — Брендинг-конфигурация (3 ч)
- Второй/третий конфиг (`fmcg-matching-demo.json` под matching, `bank-demo.json` под раннер с другим спрайт-сетом)
- Проверка что новый spritesheet подхватывается без правки кода движка

### Этап 9 — Лидерборд (локальный) (2 ч)
- `leaderboardStore.ts` — top-5 в `localStorage`, ключ per-`campaignId`
- Анимация "новый рекорд" на `GameOverScreen` (`canvas-confetti` при `score > previousBest`)

### Этап 10 — Адаптив/touch controls + полировка (5 ч)
- `GameEngine.resize()` на `ResizeObserver`, пересчёт позиции "земли"/spawn-координат под новую высоту канваса
- Тест реального свайпа/тапа на мобильном, устранение накладок DOM HUD поверх canvas (z-index, pointer-events)
- Lighthouse mobile Performance > 80

### Этап 11 — Деплой + QA (2 ч)
- `vercel.ts`, Playwright `runner-flow.spec.ts` на preview

**Итого раннер: ~37 часов**

**Matching-вариант (альтернатива, если раннер не подходит клиенту):**
- Переиспользует Config layer, HUD-паттерн, звук, брендинг-подход из раннера
- `MatchingEngine.ts`: grid из `PIXI.Container` карточек, `flip`-анимация через `gsap` (масштаб по X 1→0→1 со сменой текстуры в середине), сравнение двух открытых карточек по `id`, таймер на раунд
- Оценка: **+9 ч** сверх переиспользуемой инфраструктуры (grid layout, flip-анимация, matching-логика, unit-тест на "нет двух одинаковых пар открыто одновременно, no-match возвращает карточки рубашкой вверх")
- **Итого matching как самостоятельный трек (с нуля, без раннера): ~22 часа**
- Если делать оба варианта на общем движке — суммарно ~40-42 часа, что хорошо демонстрирует гибкость платформы клиенту, у которого физика (раннер) избыточна, а лёгкая механика (matching) ближе к бренду

## 5. Ключевые технические вызовы

- **Синхронизация matter-js (фиксированный физический шаг) с pixi ticker (variable FPS устройства).** Решение: `Matter.Runner.create({ isFixed: true })` + интерполяция позиций спрайтов между физическими шагами (см. код в разделе 3) — паттерн "fixed update, interpolated render", устраняет дёрганость на 90/120Hz экранах и на устройствах с нестабильным FPS.
- **Производительность physics-симуляции на мобильных при большом числе тел.** Решение: object pooling (раздел 3) — фиксированный пул 10-15 тел препятствий/монет вместо `Matter.World.add/remove` на каждый спавн; профилировать через Chrome DevTools Performance на реальном Android mid-range устройстве, не только на девелоперской машине.
- **Tunneling — объект "проскакивает" сквозь препятствие между кадрами на высокой скорости.** Решение: держать `baseSpeed`/`speedRampPerSecond` в проверенных пределах (не превышать ~15px/tick при 60Hz физике), либо расширять sensor-зону коллизии на 20-30% шире визуального спрайта как запас.
- **Latency инпута на touch-устройствах.** Решение: `touchstart` вместо `touchend`/`click`, `{ passive: true }` листенер, не блокировать обработчик синхронными тяжёлыми операциями (см. `InputController`).
- **Смена брендинга не должна ломать физический баланс игры (другой персонаж = другая физическая форма?).** Решение: hitbox (Matter body) — фиксированный прямоугольник/круг с постоянным размером, определённым в `physics`-блоке конфига; визуальный спрайт поверх него может быть любого размера/формы — physics и art полностью развязаны.
- **`@pixi/sound` и автоплей-политика мобильных браузеров.** Решение: та же логика, что в прототипе 1 — `sound.play()` для музыки инициируется строго в обработчике клика "Играть" (первый user gesture), не в `mount()`.
- **Object pool исчерпан при экстремально частом спавне (edge case на очень быстрой стадии игры).** Решение: `spawn()` молча пропускает спавн, если свободных тел в пуле нет (см. код) — лучше пропустить одно препятствие, чем упасть в рантайм-ошибку или неограниченно растить пул.

## 6. MVP-скоуп vs nice-to-have

**MVP:**
- Раннер: прыжок через 1 тип препятствия, счёт очков, 30-60 сек таймер, game over экран
- Object pooling препятствий/монет реализован с начала (не техдолг "на потом" — это основа стабильного FPS)
- Базовый брендинг (1 конфиг)
- Звук вкл/выкл
- Мобильный touch-контроль

**Nice-to-have:**
- Matching-игра как вторая механика на том же движке (демонстрация гибкости платформы для питча)
- Несколько типов препятствий/бонусов с разным поведением (движущиеся, летающие)
- Локальный лидерборд с анимацией "новый рекорд"
- Parallax-фон в 3 слоя (в MVP можно ограничиться 1 статичным слоем)
- Combo-система (бонусные очки за серию собранных монет)
- Настоящий backend-лидерборд (Postgres/Redis через Vercel Marketplace) с realtime-обновлением между игроками
- Дополнительные "жизни" вместо мгновенного game over

## 7. План деплоя

- **Хостинг:** Vercel, статический билд
- **CI/CD:** Git-интеграция Vercel, preview на PR

### vercel.ts

```typescript
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  framework: 'vite',
  headers: [
    {
      source: '/assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};
```

- **Адаптация под нового клиента:** `src/config/campaigns/{client}.json` + новый спрайт-атлас в `public/assets/{client}/sprites.json` + `.png` (pixi spritesheet, собирается инструментом типа TexturePacker/free-tex-packer). Целевое время адаптации — 3-5 часов: физика/логика не трогается, меняется только визуальный слой (арт-набор) и цветовые/звуковые константы конфига.
- **Продакшн-соображение:** для реального мультиплеерного лидерборда — минимальный serverless-эндпоинт (`Vercel Function` + Postgres/Redis через Vercel Marketplace), POST `/api/score` с anti-cheat проверкой разумности значения (score не может превышать теоретический максимум за `durationSeconds`).

## 8. Метрики для замера успеха прототипа

**"Вау"-метрики для презентации:**
- Стабильный 60fps на демо-устройстве во время активной физической симуляции (показывается вживую через DevTools Performance overlay)
- Скорость смены брендинга вживую на демо (спрайты + цвета за пару минут)
- Ощущение "как нативное мобильное приложение" в браузере — плавность, отзывчивость тач-управления
- Живой стресс-тест: заспавнить сразу много препятствий/монет на глазах менеджмента, показать что FPS не проседает (демонстрация object pooling)

**Реальные метрики для будущих клиентов:**
- Average session length / average attempts per user (сколько раз переигрывают за сессию — маркер вовлечённости)
- Replay rate: % игроков, сыгравших >1 раза
- Score distribution (для баланса сложности — если 90% не проходят дальше 5 сек, игра слишком хардкорная)
- Drop-off point: на какой секунде игры чаще всего происходит game over (для тюнинга сложности)
- Share rate финального счёта
- Конверсия "достиг порога X очков → перешёл к форме лида" (если механика завязана на порог)

## 9. Чеклист готовности к демонстрации

- [ ] Игра стабильно работает 60fps на реальном мобильном устройстве (не эмулятор)
- [ ] Touch-управление отзывчивое, без задержек (`touchstart`, не `touchend`)
- [ ] Есть чёткий game over и возможность рестарта без перезагрузки страницы
- [ ] Звук работает и мьютится корректно (важно — демо часто в открытом офисе)
- [ ] Минимум 1 полный брендинг-конфиг + запасной для показа "гибкости" вживую
- [ ] Нет падений FPS при спавне множества препятствий одновременно (стресс-тест пула)
- [ ] Object pool не исчерпывается видимым образом на длинной игровой сессии (тест 2+ минуты непрерывной игры)
- [ ] Задеплоено на публичный URL, протестировано на iOS Safari и Android Chrome
- [ ] Готов сценарий показа: "сыграл → счёт → рестарт → показать другой брендинг за 2 минуты"
- [ ] `ObstacleSpawner`/scoring-логика покрыты unit-тестом

## Приложение — тестовый план

### Unit-тесты (vitest)
- `ObstacleSpawner.test.ts` — пул не превышает `poolSize`, `spawn()` без свободных тел не бросает исключение, `recycle()` корректно "паркует" тело за экраном
- `GameEngine.test.ts` (логика без pixi-рендера, чистые функции scoring/collision-handling вынесены отдельно от классов, привязанных к DOM) — начисление очков за монету, `lives` уменьшается на столкновение, `gameover` при `lives === 0`
- `MatchingEngine.test.ts` (если делается matching-вариант) — нет двух одинаковых пар одновременно "matched", корректный подсчёт совпадений

### E2E smoke-тест (Playwright, e2e/runner-flow.spec.ts)
```
1. Открыть /?campaign=mobility-demo
2. Дождаться StartScreen (onReady)
3. Кликнуть "Играть"
4. Симулировать несколько прыжков (keydown Space) через равные интервалы
5. Дождаться gameover (таймаут = durationSeconds + буфер) либо смоделировать столкновение
6. Проверить что GameOverScreen показывает числовой счёт >= 0
7. Проверить что кнопка "Ещё раз" перезапускает игру без перезагрузки страницы
```

### Ручное QA на реальных устройствах перед демо
- iPhone (последние 2 поколения) — Safari, проверка звука/тач
- Средний Android (напр. Samsung A-серия) — Chrome, стресс-тест на длинную сессию (проверка утечек памяти/пула)
- Desktop Chrome/Firefox/Safari — клавиатурное управление (Space)
- Throttled CPU 4x в DevTools — проверка что физика не "рассыпается" при просадке FPS
