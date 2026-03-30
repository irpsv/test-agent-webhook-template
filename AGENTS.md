# Инструкции для агента и разработчика

Этот репозиторий — шаблон интеграций с Bitrix24. Архитектура: **браузер не обращается к Bitrix24 напрямую**; весь REST идёт с **сервера** через **`B24Hook`** и URL входящего webhook.

## Структура

| Путь | Назначение |
|------|------------|
| [`apps/client`](apps/client) | UI: Vite, Vanilla TypeScript, Tailwind. Только `fetch` к своему API (`/api/...` или `VITE_API_BASE`). **Не** подключать `@bitrix24/b24jssdk` на клиенте. |
| [`apps/server`](apps/server) | HTTP API на Hono, [`@bitrix24/b24jssdk`](https://www.npmjs.com/package/@bitrix24/b24jssdk), фабрика `B24Hook` из [`apps/server/src/bitrix.ts`](apps/server/src/bitrix.ts). |
| [`packages/tsconfig`](packages/tsconfig) | Общий [`tsconfig.base.json`](packages/tsconfig/tsconfig.base.json) для строгого TypeScript. |
| [`.env.example`](.env.example) | Шаблон переменных окружения (корень репозитория). |

## Переменные окружения

Файл **`.env` в корне** репозитория (не коммитить). Сервер при старте подгружает его через `dotenv` (см. [`apps/server/src/index.ts`](apps/server/src/index.ts)). Vite настроен на `envDir` в корень, чтобы те же переменные подхватывали префикс `VITE_*`.

- **`B24_WEBHOOK_URL`** — **обязателен до запуска и разработки**: скопируйте `.env.example` в `.env`, создайте входящий webhook в Bitrix24 и вставьте URL. Без webhook интеграция не имеет смысла; не запускайте отладку API до заполнения переменной.
- **`PORT`** — порт API (по умолчанию `3001`).
- **`VITE_API_BASE`** — если UI и API на разных origin в продакшене, укажите базовый URL API (без завершающего `/`). Пусто — относительные пути.
- **`CORS_ORIGIN`** — список origin через запятую для CORS или `*` для разработки.

## Запуск

**Разработка** (hot reload, Vite + API):

```bash
pnpm install
pnpm dev
```

Клиент проксирует `/api` на `http://127.0.0.1:3001` (см. [`apps/client/vite.config.ts`](apps/client/vite.config.ts)).

**Продакшен-подобный запуск одной командой** — сборка и один процесс (статика + API на одном порту):

```bash
pnpm start
```

Это выполняет `pnpm build`, затем `pnpm --filter @repo/server start`. Сервер отдаёт собранный UI из [`apps/client/dist`](apps/client/dist) и маршруты `/api/*` (см. [`apps/server/src/index.ts`](apps/server/src/index.ts)). Без `apps/client/dist` поднимется только API (в логе будет предупреждение).

## Правила работы с Bitrix24 REST

1. **Не выдумывать имена методов** — сверяться с официальной документацией; для ИИ удобно подключить **MCP Bitrix24** (см. ниже).
2. В вызовах SDK **всегда указывать `requestId`** и проверять **`response.isSuccess`** перед `getData()`.
3. Секреты webhook **только в `.env`**, не в репозитории и не в коде.

## MCP Bitrix24 (REST)

Сервер документации: **`https://mcp-dev.bitrix24.tech/mcp`**, транспорт **Streamable HTTP** (`http`), без авторизации. Подробности: [MCP Server for Bitrix24 REST API](https://apidocs.bitrix24.com/sdk/mcp.html).

### Cursor

В настройках **Tools & MCP** добавьте сервер или объедините фрагмент из [`.cursor/mcp.json`](.cursor/mcp.json) с вашим пользовательским `mcp.json`. В запросах к агенту при необходимости добавляйте контекст конфигурации MCP и явно просите опираться на актуальные методы REST.

### VS Code / GitHub Copilot

Используйте [`.vscode/mcp.json`](.vscode/mcp.json) по [инструкции Bitrix24](https://apidocs.bitrix24.com/sdk/mcp.html) (`type`: `http`).

## Где что менять при доработке

- Новые экраны и стили: **`apps/client/src`**, Tailwind: [`apps/client/tailwind.config.js`](apps/client/tailwind.config.js), глобальные токены: [`apps/client/src/style.css`](apps/client/src/style.css).
- Новые эндпоинты и вызовы CRM: **`apps/server/src`**, подключение портала — только через **`createB24FromEnv()`** и `B24Hook`.
