# Прототип 3 — 3D-конфигуратор продукта

## 1. Обзор

Интерактивный 3D-конфигуратор: пользователь вращает/приближает 3D-модель продукта (GLB), меняет цвет материалов, накладывает текстуры/паттерны, добавляет собственный текст или логотип (персонализация), в конце может "заказать"/сохранить конфигурацию или отправить как лид.

**Для какого клиента/кампании подходит:**
- FMCG — кастомизация упаковки (лимитированная серия, "собери свою банку")
- Мобильность — конфигуратор цвета/опций самоката/авто в рамках промо
- Туризм — 3D-визуализация номера/каюты/чемодана с персонализацией (менее типично, но применимо)
- Банкинг — кастомизация дизайна карты (очень частый реальный кейс у банков)

Это самый "премиальный" прототип из четырёх — подходит для клиентов, где важен brand experience и wow-эффект, а не только performance-метрики.

**Бизнес-метрика:** engagement time (среднее время взаимодействия с 3D-объектом), completion rate конфигурации, конверсия "настроил → оставил контакт/сохранил дизайн", share rate кастомизированного результата.

## 2. Технический стек

### Runtime-зависимости

```
three@^0.169             — 3D-рендер движок
@react-three/fiber@^8.17 — React-обёртка над three.js
@react-three/drei@^9.114 — OrbitControls, Environment/HDRI, useGLTF, ContactShadows, Html
zustand@^4.5              — состояние конфигурации
react@^18.3
react-dom@^18.3
react-hook-form@^7.52     — форма лида
@hookform/resolvers@^3.9
zod@^3.23
three-mesh-bvh@^0.8       — ускоренный raycasting для точного клика по поверхности модели
```

### Dev-зависимости / CLI-инструменты

```
vite@^5.4
@vitejs/plugin-react@^4.3
typescript@^5.5
@types/three@^0.169
vitest@^2.0
@playwright/test@^1.47
@gltf-transform/cli@^4.1  — Draco/Meshopt компрессия GLB, конвертация текстур в WebP/KTX2
```

GLB-модели готовятся в Blender (экспорт с корректной UV-развёрткой под текстурирование) и обязательно проходят через `gltf-transform` перед попаданием в репозиторий — см. раздел 5.

### Установка

```bash
npm create vite@latest marswalk-configurator -- --template react-ts
cd marswalk-configurator
npm install three @react-three/fiber @react-three/drei zustand react-hook-form @hookform/resolvers zod three-mesh-bvh
npm install -D @types/three vitest @playwright/test @gltf-transform/cli
```

## 3. Архитектура

Жёсткое разделение на два независимых модуля — это прямое требование ТЗ и архитектурно оправдано, т.к. 3D-рендер и UI-логика меняются с разной частотой и разными людьми (дизайнер конфигурации vs 3D-художник):

1. **2D UI Control Panel (React)** — панели выбора цвета, текстуры, текстового инпута, кнопки экспорта. Ничего не знает про three.js API — только читает/пишет в zustand store.
2. **3D Render Module (R3F + three.js)** — сцена, камера, свет, модель, материалы. Подписан на zustand store, применяет изменения к мешам/материалам реактивно через `useEffect`/подписки. Ничего не знает про UI-компоненты.

### Схема потока данных

```
ConfigStore (zustand): { color, material, texture, customText, logoUrl, cameraView }
        │                                    │
        ▼ UI пишет через actions             ▼ 3D читает через useStore
 ┌──────────────────┐              ┌─────────────────────────┐
 │ ControlPanel.tsx │              │ ProductScene.tsx (R3F)  │
 │ - ColorPicker    │              │ - useGLTF(modelUrl)     │
 │ - TexturePicker  │              │ - meshRef.material.color │
 │ - TextInput      │              │ - CanvasTexture для     │
 │ - ExportButton   │              │   текста/лого поверх    │
 └──────────────────┘              │ - OrbitControls          │
                                    └─────────────────────────┘
```

**Механизм нанесения текста/лого на модель:** не редактирование геометрии, а динамическая генерация текстуры через `<canvas>` (2D context рисует текст/лого) → конвертация в `THREE.CanvasTexture` → применение как `map` или decal-слой (через `three/examples/jsm/geometries/DecalGeometry` для точного позиционирования на кривой поверхности, например, банки).

### Структура репозитория

```
marswalk-configurator/
├── public/
│   └── models/
│       ├── can-fmcg-demo/
│       │   ├── can.glb            # после gltf-transform optimize
│       │   └── hdri-studio.hdr
│       └── card-bank-demo/
│           ├── card.glb
│           └── hdri-studio.hdr
├── src/
│   ├── scene/
│   │   ├── ProductScene.tsx        # корневой R3F Canvas, свет, камера, окружение
│   │   ├── ProductModel.tsx        # useGLTF, применение материалов из store
│   │   ├── DecalLayer.tsx          # canvas-текстура + DecalGeometry
│   │   ├── CameraRig.tsx           # OrbitControls + preset-ракурсы
│   │   └── decalTexture.ts         # чистая функция: canvas 2D → THREE.CanvasTexture
│   ├── store/
│   │   ├── configStore.ts          # zustand, единственный источник правды
│   │   └── configStore.test.ts
│   ├── ui/
│   │   ├── ControlPanel.tsx
│   │   ├── ColorSwatches.tsx
│   │   ├── TextureGrid.tsx
│   │   ├── TextInput.tsx
│   │   ├── LogoUploader.tsx
│   │   └── ExportButton.tsx
│   ├── lib/
│   │   ├── exportScreenshot.ts     # renderer.domElement → PNG
│   │   └── analytics.ts
│   ├── config/
│   │   ├── schema.ts               # zod-схема ProductConfig
│   │   └── products/
│   │       ├── can-fmcg-demo.json
│   │       └── card-bank-demo.json
│   ├── app/
│   │   ├── App.tsx
│   │   ├── LeadForm.tsx
│   │   └── DebugPanel.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── scripts/
│   └── optimize-models.sh          # gltf-transform pipeline
├── e2e/
│   └── configurator-flow.spec.ts
├── vercel.ts
├── vite.config.ts
└── package.json
```

### Типы конфигурации (config/schema.ts)

```typescript
import { z } from 'zod';

export const MaterialZoneSchema = z.object({
  meshName: z.string(),              // имя меша в GLB, полученное из Blender (напр. "Body_Primary")
  label: z.string(),                 // человекочитаемое имя для UI ("Корпус")
  colorOptions: z.array(z.string()), // hex-палитра
  textureOptions: z.array(z.object({ id: z.string(), url: z.string(), thumbUrl: z.string() })).optional(),
});

export const DecalZoneSchema = z.object({
  id: z.string(),
  label: z.string(),                 // "Передняя панель"
  position: z.tuple([z.number(), z.number(), z.number()]),
  normal: z.tuple([z.number(), z.number(), z.number()]),
  size: z.tuple([z.number(), z.number(), z.number()]),
  maxTextLength: z.number().default(20),
});

export const ProductConfigSchema = z.object({
  productId: z.string(),
  modelUrl: z.string(),              // путь к оптимизированному .glb
  hdriUrl: z.string(),
  cameraPresets: z.array(z.object({
    id: z.string(),
    label: z.string(),
    position: z.tuple([z.number(), z.number(), z.number()]),
    target: z.tuple([z.number(), z.number(), z.number()]),
  })),
  materialZones: z.array(MaterialZoneSchema).min(1),
  decalZones: z.array(DecalZoneSchema).default([]),
  copy: z.object({
    title: z.string(),
    leadFormTitle: z.string(),
  }),
});

export type ProductConfig = z.infer<typeof ProductConfigSchema>;
export type MaterialZone = z.infer<typeof MaterialZoneSchema>;
export type DecalZone = z.infer<typeof DecalZoneSchema>;
```

Заранее заданные `decalZones` (координаты + нормаль зоны для лого/текста) — сознательное упрощение вместо "клик в любую точку модели": для изогнутых поверхностей произвольный raycast-клик даёт непредсказуемые искажения декали, фиксированные зоны с преднастроенной ориентацией дают предсказуемый и презентабельный результат (см. раздел 5).

### Zustand store (store/configStore.ts)

```typescript
interface ConfigStore {
  productConfig: ProductConfig | null;
  materialSelections: Record<string, { color?: string; textureId?: string }>; // ключ = meshName
  decalSelections: Record<string, { text?: string; logoDataUrl?: string }>;    // ключ = decalZone.id
  activeCameraPreset: string;
  loadProduct: (config: ProductConfig) => void;
  setMaterialColor: (meshName: string, color: string) => void;
  setMaterialTexture: (meshName: string, textureId: string) => void;
  setDecalText: (zoneId: string, text: string) => void;
  setDecalLogo: (zoneId: string, dataUrl: string) => void;
  setCameraPreset: (presetId: string) => void;
}
```

### ProductModel — применение материалов (scene/ProductModel.tsx)

```typescript
export function ProductModel({ config }: { config: ProductConfig }) {
  const { scene } = useGLTF(config.modelUrl);
  const materialSelections = useConfigStore((s) => s.materialSelections);

  useEffect(() => {
    for (const zone of config.materialZones) {
      const mesh = scene.getObjectByName(zone.meshName) as THREE.Mesh | undefined;
      if (!mesh || !(mesh.material instanceof THREE.MeshStandardMaterial)) continue;
      const selection = materialSelections[zone.meshName];
      if (selection?.color) {
        mesh.material.color.set(selection.color);
        mesh.material.needsUpdate = true;
      }
      if (selection?.textureId) {
        const textureDef = zone.textureOptions?.find((t) => t.id === selection.textureId);
        if (textureDef) {
          new THREE.TextureLoader().load(textureDef.url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
          });
        }
      }
    }
  }, [materialSelections, scene, config.materialZones]);

  return <primitive object={scene} />;
}
```

Изменения материалов применяются императивно внутри `useEffect`, а не через полный ре-рендер JSX-дерева сцены — это ключевое требование для производительности R3F: React должен ре-рендерить `<ProductModel>` только при смене продукта, а не при каждом клике по цвету.

### DecalLayer — нанесение текста/лого (scene/DecalLayer.tsx + decalTexture.ts)

```typescript
// decalTexture.ts — чистая функция, покрывается unit-тестом
export function createTextDecalTexture(text: string, options: { fontFamily: string; color: string }): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.font = `bold 64px ${options.fontFamily}`;
  ctx.fillStyle = options.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
```

```typescript
// DecalLayer.tsx — использует заранее заданную зону (position/normal/size из конфига)
export function DecalLayer({ zone, targetMesh }: { zone: DecalZone; targetMesh: THREE.Mesh }) {
  const decalTexture = useDecalTextureForZone(zone.id); // селектор из configStore + createTextDecalTexture
  const position = new THREE.Vector3(...zone.position);
  const normal = new THREE.Euler().setFromVector3(new THREE.Vector3(...zone.normal));
  const size = new THREE.Vector3(...zone.size);

  if (!decalTexture) return null;

  return (
    <mesh>
      <Decal position={position} rotation={normal} scale={size} map={decalTexture} />
    </mesh>
  );
}
```

`<Decal>` — компонент из `@react-three/drei`, обёртка над `DecalGeometry`, принимает готовые `position`/`rotation`/`scale` вместо ручного raycast-вычисления — для фиксированных зон конфига это устраняет необходимость runtime-raycasting вообще.

## 4. План разработки по этапам

### Этап 0 — Setup + первая модель на сцене (3 ч)
- `npm create vite@latest`, установка зависимостей раздела 2
- Тестовый GLB (банка/бутылка с Sketchfab под CC-лицензией, или простая модель из Blender примитивов для proof of concept)
- Базовый `<Canvas>` из R3F, `<OrbitControls>`, дефолтный свет — подтверждение что модель крутится

### Этап 1 — Config + типы (3 ч)
- `config/schema.ts`, `products/can-fmcg-demo.json` с реальными именами мешей из тестового GLB (проверяются через `console.log(scene.children)` или Blender outliner)
- Загрузчик конфига (`fetch` + `zod.parse`)

### Этап 2 — Освещение и презентационное качество (4 ч)
- `<Environment preset="studio">` или кастомный `.hdr` через drei, `<ContactShadows>` под моделью
- Подбор ракурса камеры (`cameraPresets` из конфига), `THREE.ACESFilmicToneMapping`, `outputColorSpace: THREE.SRGBColorSpace`
- Это этап, который даёт основной "вау"-эффект на демо — не срезать по времени

### Этап 3 — Смена цвета материала (4 ч)
- `configStore.setMaterialColor`, `ColorSwatches.tsx` (палитра из `materialZones[].colorOptions`)
- `ProductModel.tsx` логика из раздела 3, проверка что модель использует `MeshStandardMaterial` (не baked/vertex-color текстуры, которые не реагируют на смену `color`)

### Этап 4 — Смена текстуры (5 ч)
- `TextureGrid.tsx`, `THREE.TextureLoader` с кэшированием загруженных текстур (`Map<url, Texture>`, чтобы не перезагружать при повторном выборе)
- Проверка UV-развёртки модели — если текстура "плывёт"/растягивается неправильно, разворотка требует доработки в Blender (закладывать время на итерацию с 3D-ассетом)

### Этап 5 — Кастомный текст/лого через decal (7 ч)
- `decalTexture.ts` — canvas-рендер текста (код раздела 3), покрыт unit-тестом
- `DecalZone` конфигурация — 1-2 предустановленные зоны на тестовой модели с вручную подобранными `position`/`normal`/`size` (подбор через интерактивный дебаг-режим — временный gizmo/slider для координат при разработке)
- `LogoUploader.tsx` — загрузка PNG/SVG пользователем, рендер поверх canvas вместе с текстом или отдельным слоем
- Это самый сложный и долгий этап — при нехватке времени можно ограничить одной decal-зоной вместо нескольких

### Этап 6 — UI-панель управления (4 ч)
- `ControlPanel.tsx` — табы (Цвет / Текстура / Текст), десктоп — боковая панель, мобильный — bottom sheet (`position: fixed; bottom: 0`, drag-to-expand не обязателен для MVP)
- Табы читают/пишут исключительно через `configStore` actions, не имеют собственного дублирующего состояния

### Этап 7 — Экспорт/скриншот результата (3 ч)
- `exportScreenshot.ts`: `renderer.domElement.toDataURL('image/png')` — важно вызывать сразу после кадра рендера (в R3F — через `gl.domElement` из `useThree()`), т.к. WebGL context может стирать буфер после следующего кадра без `preserveDrawingBuffer: true` в конфиге рендерера
- Кнопка "скачать" (`<a download>`) и "поделиться" (Web Share API с фолбэком на копирование ссылки)

### Этап 8 — Форма лида (2 ч)
- Переиспользование `LeadForm.tsx`-паттерна из прототипа 1 (react-hook-form + zod + GDPR-чекбокс), показывается после экспорта/по кнопке "Сохранить дизайн"

### Этап 9 — Оптимизация загрузки (3 ч)
- `scripts/optimize-models.sh`:
  ```bash
  npx gltf-transform optimize public/models/can-raw.glb public/models/can-fmcg-demo/can.glb \
    --texture-compress webp
  ```
- Progressive loading: `<Suspense fallback={<LoadingSpinner />}>` вокруг `<ProductModel>`, drei `useGLTF.preload()` вызывается заранее (например, при наведении на превью продукта на лендинге)
- Проверка итогового размера бандла + GLB (цель: GLB < 3-5 МБ после компрессии для комфортной загрузки на мобильном 4G)

### Этап 10 — Адаптация под 2 продукта (5 ч)
- Второй `products/card-bank-demo.json` с полностью другой моделью (банковская карта — плоская геометрия, другие зоны декали)
- Проверка что `ProductScene`/`ProductModel`/`DecalLayer` не содержат хардкода под конкретный продукт — только чтение из конфига

### Этап 11 — Деплой + QA на мобильном (3 ч)
- `vercel.ts`, Playwright `configurator-flow.spec.ts`
- Тест реального mid-range Android — 3D на мобильном GPU требует отдельного профилирования (Safari iOS WebGL debugging через Mac + подключённый iPhone)

**Итого: ~44 часа**

## 5. Ключевые технические вызовы

- **Производительность 3D на среднем/слабом мобильном GPU.** Решение: держать polycount модели <50k треугольников для веба, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, тестировать на реальном mid-range Android, а не только на девелоперской машине — мобильные GPU (особенно iGPU в бюджетных Android) заметно слабее desktop даже при одинаковом внешнем разрешении экрана.
- **Размер GLB-файлов и время первой загрузки.** Решение: обязательный pipeline `gltf-transform optimize` (Draco-компрессия геометрии + Meshopt) перед коммитом любой модели в репозиторий, текстуры в WebP, целевой размер GLB < 3-5 МБ. Добавить проверку размера файла в CI (шаг падает, если кто-то закоммитил несжатый GLB "по ошибке" — частый источник регрессий в командах с 3D-художником).
- **Позиционирование decal (лого/текст) на изогнутой поверхности без искажений.** Решение: вместо runtime raycast по произвольному клику — заранее заданные `decalZones` в конфиге продукта (position/normal/size, подобранные вручную один раз при подготовке продукта). Произвольный клик пользователя технически возможен через `three-mesh-bvh`-ускоренный raycasting, но для презентационного прототипа предсказуемость важнее свободы позиционирования.
- **Корректная синхронизация zustand-store и three.js-объектов без лишних ре-рендеров R3F-сцены.** Решение: `useConfigStore((s) => s.materialSelections)` — подписка через селектор на конкретное поле, применение изменений материалов императивно внутри `useEffect` (см. `ProductModel.tsx`), а не через пересоздание JSX-структуры сцены при каждом клике по цвету.
- **WebGL context теряет содержимое буфера после рендера следующего кадра — скриншот может получиться пустым/чёрным.** Решение: `preserveDrawingBuffer: true` в опциях `<Canvas gl={{ preserveDrawingBuffer: true }}>`, либо явный вызов `gl.render(scene, camera)` непосредственно перед `toDataURL()`.
- **Подготовка самой 3D-модели — не чисто разработческая задача.** Решение: для прототипа — поиск/лицензирование готовой GLB-модели (Sketchfab, TurboSquid) вместо моделирования с нуля при отсутствии 3D-художника в команде; при работе с реальным клиентским продуктом закладывать отдельно 1-3 дня на подготовку модели 3D-специалистом (не входит в оценку разработки выше).
- **iOS Safari WebGL context может быть агрессивно освобождён системой при недостатке памяти (особенно при нескольких вкладках).** Решение: обработчик `canvas.addEventListener('webglcontextlost', ...)` с понятным UI-сообщением "перезагрузите страницу", не тихий белый экран.

## 6. MVP-скоуп vs nice-to-have

**MVP:**
- 1 продукт (готовая GLB-модель), вращение мышью/тачем, зум
- Смена цвета материала (3-5 вариантов)
- Хорошее освещение (HDRI environment) — критично для "вау"-эффекта, нельзя срезать
- Простая кнопка "поделиться результатом" (скриншот, `preserveDrawingBuffer` учтён с самого начала)

**Nice-to-have:**
- Кастомный текст/лого через decal — самый впечатляющий, но и самый трудозатратный элемент; при нехватке времени можно показать на демо как "roadmap-фичу" с заранее подготовленным мокап-скриншотом, честно обозначив это менеджменту
- Второй продукт для демонстрации гибкости платформы
- AR-режим (просмотр через камеру телефона, `<model-viewer>` с `ar` атрибутом или WebXR) — сильный wow-эффект, но отдельный большой скоуп, не оценивается в этом плане
- Анимация transition между цветами/текстурами (плавный crossfade материала через `gsap` twin на `material.color`)
- Сохранение конфигурации по shareable-ссылке (требует backend — сериализация `configStore` в URL-параметр или БД)
- Множественный выбор зон кастомизации (разные части модели — разные независимые материалы, уже частично заложено в `materialZones[]`, но не протестировано на >2 зонах)
- Произвольный клик для позиционирования decal вместо фиксированных зон (`three-mesh-bvh` уже в зависимостях, задел на будущее)

## 7. План деплоя

- **Хостинг:** Vercel, статический билд
- **Хранение тяжёлых ассетов:** GLB/HDR/текстуры — в `public/` для прототипа; при росте числа продуктов — перенос в Vercel Blob (публичный доступ, отдельный CDN, не раздувает основной билд)
- **CI/CD:** Git-интеграция Vercel; дополнительный шаг в CI/pre-commit hook — проверка размера файлов в `public/models/**/*.glb` (fail при файле >5МБ без явного разрешения, защита от случайного коммита несжатой модели)

### vercel.ts

```typescript
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  framework: 'vite',
  headers: [
    {
      source: '/models/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};
```

- **Адаптация под нового клиента:** новый продукт = новый GLB (прошедший `optimize-models.sh`) + `src/config/products/{client}.json` (доступные цвета/текстуры/decal-зоны). Реалистичное время адаптации — 1-2 дня, главное узкое место — подготовка самой 3D-модели: если клиент даёт готовый качественный GLB, адаптация конфига занимает 2-4 часа; если модель нужно готовить с нуля — это уже отдельная задача 3D-специалиста, не входящая в разработку конфигуратора.

## 8. Метрики для замера успеха прототипа

**"Вау"-метрики для презентации менеджменту:**
- Визуальное качество рендера (освещение, тени, материалы — то, что менеджмент оценит "на глаз" за секунду)
- Плавность вращения на живом демо (60fps на презентационном ноутбуке/планшете, проверяется вживую через DevTools Performance)
- Скорость загрузки модели до интерактивности (Time to Interactive < 3 сек с прогресс-баром)
- Демонстрация смены продукта вживую ("вот банка, а вот карта — та же платформа")

**Реальные метрики для будущих клиентов:**
- Average engagement time с 3D-объектом (сколько секунд/минут крутят и настраивают)
- Configuration completion rate (% начавших → % дошедших до финального сохранения/шеринга)
- Number of interactions per session (сколько раз меняли цвет/текстуру — маркер вовлечённости)
- Conversion to lead/order после завершения конфигурации
- Share rate финального результата
- Bounce rate на этапе загрузки модели (если высокий — сигнал, что загрузка слишком долгая)

## 9. Чеклист готовности к демонстрации

- [ ] Модель грузится быстро с адекватным loading-состоянием (не "белый экран 5 секунд")
- [ ] Освещение выглядит презентабельно, не как "серый 3D-объект из учебника"
- [ ] Вращение/зум работает плавно на десктопе и touch-устройстве
- [ ] Минимум 3-5 цветовых вариантов реально применяются на модель
- [ ] Скриншот/экспорт результата работает и выглядит презентабельно (`preserveDrawingBuffer` проверен — не пустой PNG)
- [ ] Задеплоено на публичный URL, протестировано на реальном планшете/телефоне (не только desktop Chrome)
- [ ] Если decal/текст не готов к демо — заранее подготовлен честный disclaimer или мокап-скриншот, а не попытка показать сырую фичу
- [ ] Все GLB-модели прошли через `gltf-transform optimize`, размер каждой проверен (< 5МБ)
- [ ] Подготовлен сценарий: "продукт 1 → смена цвета → смена продукта на лету → скриншот"

## Приложение — тестовый план

### Unit-тесты (vitest)
- `decalTexture.test.ts` — `createTextDecalTexture` возвращает `THREE.CanvasTexture` с `needsUpdate: true`, корректно обрезает текст длиннее `maxTextLength`
- `configStore.test.ts` — `setMaterialColor`/`setMaterialTexture` корректно обновляют `materialSelections` по ключу `meshName`, не затирают другие зоны

### E2E smoke-тест (Playwright, e2e/configurator-flow.spec.ts)
```
1. Открыть /?product=can-fmcg-demo
2. Дождаться исчезновения loading-спиннера (модель загружена)
3. Кликнуть по цвету в ColorSwatches
4. Проверить (через скриншот-сравнение или чтение store из window.__DEBUG_STORE__) что цвет применился
5. Кликнуть "Скачать" в ExportButton
6. Проверить что инициировано скачивание PNG-файла (download event)
```

### Ручное QA на реальных устройствах перед демо
- iPad/Android-планшет — основной сценарий демонстрации на встрече
- iPhone (последние 2 поколения) — Safari, WebGL context stability при переключении вкладок
- Средний Android — Chrome, профилирование FPS через remote debugging
- Desktop Chrome/Firefox/Safari — проверка HDRI/теней на разных GPU (интегрированная/дискретная графика)
