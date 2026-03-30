# Шаблон интеграций Bitrix24 (TypeScript)

Клиент-серверное приложение: UI на **Vite + Vanilla TypeScript + Tailwind**, backend на **Hono** с официальным SDK [`@bitrix24/b24jssdk`](https://www.npmjs.com/package/@bitrix24/b24jssdk). Вызовы REST Bitrix24 выполняются **только на сервере** через **`B24Hook`** (входящий webhook).

## Требования

- Node.js 20+
- [pnpm](https://pnpm.io/) 9 (в репозитории задано `packageManager` в `package.json`; можно включить через `corepack enable`)

## Быстрый старт

```bash
cp .env.example .env
# Укажите B24_WEBHOOK_URL в .env
pnpm install
pnpm dev
```

- Клиент: `http://localhost:5173` (проксирует `/api` на backend)
- API: `http://localhost:3001`

**Один процесс (сборка + запуск):** после `pnpm install` и настройки `.env` выполните `pnpm start` — соберётся клиент и сервер, затем поднимется один HTTP-сервер: интерфейс и API на одном порту (по умолчанию `http://localhost:3001`).

## Скрипты

| Команда | Описание |
|--------|----------|
| `pnpm start` | Полная сборка (`pnpm build`) и запуск сервера с раздачей UI из `apps/client/dist` и API на `PORT` (по умолчанию 3001) |
| `pnpm dev` | Параллельно клиент (Vite) и сервер — для разработки с hot reload |
| `pnpm build` | Сборка `apps/client` и `apps/server` |
| `pnpm typecheck` | Проверка TypeScript во всех пакетах |

## Документация для разработки и агентов

Подробная карта репозитория, переменные окружения и правила для ИИ-агента: **[AGENTS.md](./AGENTS.md)**.

## MCP Bitrix24 (документация REST)

Официальный сервер MCP: `https://mcp-dev.bitrix24.tech/mcp` — см. [документацию Bitrix24](https://apidocs.bitrix24.com/sdk/mcp.html). В репозитории есть примеры конфигурации для Cursor и VS Code: [AGENTS.md](./AGENTS.md#mcp-bitrix24-rest).
