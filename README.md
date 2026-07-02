# ServiceHub (taskmatch-pro)

Маркетплейс услуг: заказчики публикуют заказы и тендеры, специалисты откликаются, бизнес-аккаунты управляют командой и инвойсами. Веб-приложение + мобильная оболочка (Capacitor, iOS/Android).

## Стек

- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, framer-motion
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Мобильные приложения:** Capacitor 7 (папки `mobile/`, конфиг `capacitor.config.ts`)
- **i18n:** ru / ro (i18next + переводы в БД)

## Быстрый старт

```sh
npm install
npm run dev        # dev-сервер на http://localhost:8080
```

## Сборка production

```sh
npm run build      # результат в dist/
npm run preview    # локальный просмотр production-сборки
```

## Конфигурация

Параметры Supabase задаются в `.env`:

```
VITE_SUPABASE_PROJECT_ID="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://<project>.supabase.co"
```

## База данных

Миграции лежат в `supabase/migrations/`. Применение на проект:

```sh
supabase link --project-ref <project-id>
supabase db push
```

> **Важно:** миграция `20260702120000_add_missing_business_fks.sql` добавляет
> внешние ключи для `business_jobs` и `business_members` — без неё разделы
> бизнес-кабинета (заказы, сотрудники, аналитика) не работают.

Edge-функции (`supabase/functions/`) деплоятся командой:

```sh
supabase functions deploy
```

## Проверки

```sh
npx tsc -p tsconfig.app.json --noEmit   # типы
npm run lint                             # ESLint
```

## Структура

- `src/pages` — страницы (desktop), `src/mobile` — мобильные версии
- `src/components` — UI-компоненты (admin, business, kyc, servicehub и др.)
- `src/integrations/supabase` — клиент и сгенерированные типы БД
- `supabase/` — миграции, edge-функции, конфиг
