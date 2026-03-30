import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import dotenv from 'dotenv'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createB24FromEnv } from './bitrix.js'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
dotenv.config({ path: path.join(workspaceRoot, '.env') })

const clientDistAbs = path.join(workspaceRoot, 'apps/client/dist')
const hasClientDist = fs.existsSync(clientDistAbs)

const app = new Hono()

type BitrixTask = {
  id?: string | number
  ID?: string | number
  title?: string
  TITLE?: string
  deadline?: string | null
  DEADLINE?: string | null
  important?: string | number | boolean | null
  IMPORTANT?: string | number | boolean | null
  priority?: string | number | null
  PRIORITY?: string | number | null
  responsibleId?: string | number | null
  RESPONSIBLE_ID?: string | number | null
  status?: string | number | null
  STATUS?: string | number | null
}

type EisenhowerQuadrant = 'important_urgent' | 'important_not_urgent' | 'not_important_urgent' | 'not_important_not_urgent'

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return ['y', 'yes', 'true', '1', 'да'].includes(normalized)
}

function isTaskImportant(task: BitrixTask): boolean {
  const important = task.IMPORTANT ?? task.important
  const priorityRaw = task.PRIORITY ?? task.priority
  const priority = typeof priorityRaw === 'number' ? priorityRaw : Number(priorityRaw)
  return normalizeBoolean(important) || Number.isFinite(priority) && priority > 0
}

function isTaskUrgent(task: BitrixTask): boolean {
  const deadline = task.DEADLINE ?? task.deadline
  return typeof deadline === 'string' && deadline.trim().length > 0
}

function getQuadrant(task: BitrixTask): EisenhowerQuadrant {
  const important = isTaskImportant(task)
  const urgent = isTaskUrgent(task)
  if (important && urgent) return 'important_urgent'
  if (important && !urgent) return 'important_not_urgent'
  if (!important && urgent) return 'not_important_urgent'
  return 'not_important_not_urgent'
}

function normalizeTask(task: BitrixTask) {
  return {
    id: String(task.ID ?? task.id ?? ''),
    title: String(task.TITLE ?? task.title ?? 'Без названия'),
    deadline: task.DEADLINE ?? task.deadline ?? null,
    important: isTaskImportant(task),
    urgent: isTaskUrgent(task),
    status: task.STATUS ?? task.status ?? null,
    responsibleId: task.RESPONSIBLE_ID ?? task.responsibleId ?? null,
  }
}

app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'bitrix24-integration-template',
  }),
)

app.get('/api/bitrix/status', async (c) => {
  const b24 = createB24FromEnv()
  if (!b24) {
    return c.json(
      {
        configured: false,
        message: 'Задайте B24_WEBHOOK_URL в .env (входящий webhook в Bitrix24).',
      },
      503,
    )
  }

  const healthy = await b24.tools.healthCheck.make({
    requestId: 'api-bitrix-status',
  })

  return c.json({
    configured: true,
    healthy,
  })
})

app.get('/api/bitrix/user', async (c) => {
  const b24 = createB24FromEnv()
  if (!b24) {
    return c.json({ error: 'B24_WEBHOOK_URL не задан' }, 503)
  }

  const response = await b24.actions.v2.call.make({
    method: 'user.current',
    requestId: 'api-bitrix-user',
  })

  if (!response.isSuccess) {
    return c.json(
      {
        error: 'Bitrix24 REST error',
        messages: response.getErrorMessages(),
      },
      502,
    )
  }

  return c.json({ data: response.getData() })
})

app.get('/api/bitrix/tasks/eisenhower', async (c) => {
  const b24 = createB24FromEnv()
  if (!b24) {
    return c.json({ error: 'B24_WEBHOOK_URL не задан' }, 503)
  }

  const grouped: Record<EisenhowerQuadrant, ReturnType<typeof normalizeTask>[]> = {
    important_urgent: [],
    important_not_urgent: [],
    not_important_urgent: [],
    not_important_not_urgent: [],
  }

  let start = 0
  for (let page = 0; page < 50; page += 1) {
    const response = await b24.actions.v2.call.make({
      method: 'tasks.task.list',
      params: {
        select: ['ID', 'TITLE', 'DEADLINE', 'IMPORTANT', 'PRIORITY', 'STATUS', 'RESPONSIBLE_ID'],
        order: { ID: 'DESC' },
        start,
      },
      requestId: `api-eisenhower-${page}`,
    })

    if (!response.isSuccess) {
      return c.json(
        {
          error: 'Bitrix24 REST error',
          messages: response.getErrorMessages(),
        },
        502,
      )
    }

    const data = response.getData() as
      | { tasks?: BitrixTask[]; result?: { tasks?: BitrixTask[] }; next?: number }
      | BitrixTask[]
      | undefined

    const tasks = Array.isArray(data)
      ? data
      : data?.tasks ?? data?.result?.tasks ?? []

    for (const task of tasks) {
      grouped[getQuadrant(task)].push(normalizeTask(task))
    }

    const next = Array.isArray(data) ? undefined : data?.next
    if (typeof next !== 'number') {
      break
    }
    start = next
  }

  return c.json({
    configured: true,
    quadrants: grouped,
    totals: {
      all: Object.values(grouped).reduce((acc, list) => acc + list.length, 0),
      importantUrgent: grouped.important_urgent.length,
      importantNotUrgent: grouped.important_not_urgent.length,
      notImportantUrgent: grouped.not_important_urgent.length,
      notImportantNotUrgent: grouped.not_important_not_urgent.length,
    },
  })
})

if (hasClientDist) {
  const staticRoot = path.relative(process.cwd(), clientDistAbs) || '.'
  app.use(
    '/*',
    serveStatic({
      root: staticRoot,
    }),
  )
}

app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ message: 'Not Found' }, 404)
  }
  if (hasClientDist) {
    const indexHtml = path.join(clientDistAbs, 'index.html')
    if (fs.existsSync(indexHtml)) {
      return c.html(fs.readFileSync(indexHtml, 'utf-8'))
    }
  }
  return c.text('Not Found', 404)
})

const port = Number(process.env.PORT ?? 3001)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    const base = `http://localhost:${info.port}`
    if (hasClientDist) {
      console.log(`Server listening on ${base} (UI + API)`)
    } else {
      console.warn(
        'Сборка клиента не найдена (apps/client/dist). Запустите `pnpm build` в корне или используйте `pnpm dev`.',
      )
      console.log(`API listening on ${base}`)
    }
  },
)
