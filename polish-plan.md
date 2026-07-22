# План полировки перед показом менеджменту

Зафиксировано 2026-07-21. Контекст: 5 прототипов задеплоены (wheel, scratch,
lotto, runner, plinko), но ощущаются «недостаточными» — не хватает полировки и
бизнес-обёртки. Новые прототипы (3D-конфигуратор, quiz) сознательно НЕ в этом
плане — сначала добиваем то, что есть.

Основано на живом просмотре каждого прототипа (не только чтении кода) —
скриншоты снимались 2026-07-21. Дополнено аудитом hygiene 2026-07-21.

**Объём:** исходные 4 пункта + всё, что ломает первый показ менеджменту +
лёгкая hygiene репо. Не делаем: GA/analytics, Playwright, унификацию шрифтов
hub↔runner/plinko, реальный lead backend.

## Порядок работ

```
1 Hub first screen → 2 Scratch foil → 3 Business pitch on hub
→ 4 Wheel multi-brand → 5 Demo chrome → 6 Plinko CTA → 7 Repo hygiene
```

Почему так: менеджмент открывает хаб первым; scratch — самая видимая «дыра»
среди live-демо; ROI/модульность усиливают питч; multi-brand — центральное
доказательство; chrome/Plinko/docs убирают ощущение недоделки при клике внутрь.

---

## 1. Hub — статусы, copy, Ideas, Plan-ссылки

Файлы: `apps/hub/prototypes.config.js`, `apps/hub/index.html`,
`apps/hub/ideas.config.js`, `apps/hub/script.js`.

- [x] Проставить `status: 'live'` для wheel / scratch / lotto / runner / plinko
- [x] Оставить relative URL (`/wheel/`, …); убрать устаревшие TODO про
      «swap to deployed URL»
- [x] Hero: заменить «Four formats» на актуальную формулировку (5 live + 2
      planned); убрать тон «pet-project / internal demo» в пользу «demo suite»
- [x] Ideas: убрать shipped Plinko из backlog (`id: 'plinko'`, `recommended: true`)
- [x] Убрать рендер «Plan →» для live-карточек (md не в `dist/`); не оставлять
      битый `docHref` у plinko

## 2. Scratch — foil / текстура cover

- [x] `ScratchEngine.buildCover()` — canvas foil/noise/gradient вместо сплошной
      заливки + «SCRATCH TO REVEAL» (`apps/scratch/src/engine/ScratchEngine.ts`)
- [x] То же для плиток lotto (`apps/scratch/src/engine/LottoEngine.ts`)
- Ориентир: `prototype-1-wheel.md` §Этап 9 — без смены механики reveal

## 3. Бизнес-обёртка на хабе (текст из overview, не писать новый)

Источник: `overview.md` — сравнительная таблица, ROI (лидген), тезис
«движок + конфиг/ассеты, не с нуля».

- [x] Секция на Prototypes-вкладке под hero, до сетки карточек
- [x] 1 тезис «one engine — config per client»
- [x] Компактная сравнительная сетка (wheel/scratch · runner · plinko live;
      configurator/quiz planned)

## 4. Wheel — 2–3 сегментных конфига + переключатель в демо

Сейчас только `apps/wheel/src/config/campaigns/fmcgDemo.ts`; live-редактор
ConfigPanel есть, brand switcher — нет.

- [x] Добавить `bankDemo` / `travelDemo` (брендинг + copy + сегменты)
- [x] Переключатель пресетов в самом демо (рядом с Customize)
- [x] ConfigPanel оставить: пресеты = «под клиента за минуту», панель = live

## 5. Demo chrome — один продукт при клике внутрь

- [x] Titles: «Prize Wheel · marswalk» и т.п. в каждом `apps/*/index.html`
- [x] Favicons: убрать Vite purple mark; простой MW mark
- [x] Ссылка **← Hub** (`/`) в shell каждого live-демо
- Не унифицировать Barlow vs system fonts в этом проходе

## 6. Plinko — закрыть воронку в UI

`apps/plinko/src/app/ResultScreen.tsx`: убрать «ready for lead capture or QR claim».

- [x] Простая lead-форма (mock submit как у wheel) после приза

## 7. Лёгкая hygiene репо

- [x] Короткий root `README.md`: что это, `npm run dev` / `build`, карта apps,
      ссылка на overview + этот polish-plan
- [x] Почистить Vite-мусор (`vite.svg`, unused `icons.svg` / `hero.png`)
- [x] Синхронизировать комментарии в `scripts/build-all.mjs` /
      `scripts/dev-server.mjs` с monorepo + одним Vercel-проектом

---

## Out of scope

- 3D configurator, personality quiz (новые прототипы)
- GA4 / `lib/analytics.ts`, Playwright smoke
- Полная унификация типографики; matching mode runner; sound для wheel/scratch
- Абсолютные multi-project Vercel URLs
- Реальный lead backend / analytics

---

## Definition of done (показ менеджменту)

1. Хаб: live-бейджи, актуальный hero, ROI/модульность на экране, Ideas без
   «Plinko как backlog», нет битых Plan-ссылок
2. Scratch/lotto: foil выглядит как scratch-карта, не пустой прямоугольник
3. Wheel: переключение FMCG / bank / travel на одном движке
4. Из любого демо можно вернуться на хаб; вкладки браузера выглядят брендировано
5. Plinko result не выглядит как TODO
6. Root README даёт 30-секундный onboarding
