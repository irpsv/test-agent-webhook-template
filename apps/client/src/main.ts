import './style.css'

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('#app not found')
}

app.innerHTML = `
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-white/10 px-6 py-4">
      <h1 class="text-lg font-semibold tracking-tight text-foreground">
        Матрица Эйзенхауэра (Bitrix24)
      </h1>
      <p class="mt-1 text-sm text-muted">
        Задачи распределены по признакам: важно (флаг) и срочно (есть дедлайн).
      </p>
    </header>
    <main class="flex-1 px-6 py-8 max-w-7xl w-full mx-auto space-y-6">
      <section class="rounded-xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-sm font-medium text-muted uppercase tracking-wide">Bitrix24 tasks.task.list</h2>
          <button id="refresh-btn" class="px-3 py-1.5 rounded-md bg-sky-500/80 hover:bg-sky-400 text-slate-950 text-sm font-semibold">
            Обновить
          </button>
        </div>
        <p id="status-out" class="mt-3 text-sm text-muted">Загрузка…</p>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article class="rounded-xl border border-red-400/40 bg-red-500/5 p-4">
          <h3 class="text-sm font-semibold text-red-300">Важно + Срочно</h3>
          <p class="mt-1 text-xs text-muted">Делать немедленно</p>
          <div id="important-urgent" class="mt-3 space-y-2"></div>
        </article>

        <article class="rounded-xl border border-emerald-400/40 bg-emerald-500/5 p-4">
          <h3 class="text-sm font-semibold text-emerald-300">Важно + Не срочно</h3>
          <p class="mt-1 text-xs text-muted">Планировать</p>
          <div id="important-not-urgent" class="mt-3 space-y-2"></div>
        </article>

        <article class="rounded-xl border border-amber-400/40 bg-amber-500/5 p-4">
          <h3 class="text-sm font-semibold text-amber-300">Не важно + Срочно</h3>
          <p class="mt-1 text-xs text-muted">Делегировать</p>
          <div id="not-important-urgent" class="mt-3 space-y-2"></div>
        </article>

        <article class="rounded-xl border border-slate-400/40 bg-slate-500/5 p-4">
          <h3 class="text-sm font-semibold text-slate-300">Не важно + Не срочно</h3>
          <p class="mt-1 text-xs text-muted">Минимизировать</p>
          <div id="not-important-not-urgent" class="mt-3 space-y-2"></div>
        </article>
      </section>
    </main>
  </div>
`

type DashboardTask = {
  id: string
  title: string
  deadline: string | null
  important: boolean
  urgent: boolean
  status: string | number | null
  responsibleId: string | number | null
}

type DashboardPayload = {
  configured: boolean
  quadrants: {
    important_urgent: DashboardTask[]
    important_not_urgent: DashboardTask[]
    not_important_urgent: DashboardTask[]
    not_important_not_urgent: DashboardTask[]
  }
  totals: {
    all: number
    importantUrgent: number
    importantNotUrgent: number
    notImportantUrgent: number
    notImportantNotUrgent: number
  }
}

const refreshBtn = document.querySelector<HTMLButtonElement>('#refresh-btn')
const statusOut = document.querySelector<HTMLParagraphElement>('#status-out')
const colImportantUrgent = document.querySelector<HTMLDivElement>('#important-urgent')
const colImportantNotUrgent = document.querySelector<HTMLDivElement>('#important-not-urgent')
const colNotImportantUrgent = document.querySelector<HTMLDivElement>('#not-important-urgent')
const colNotImportantNotUrgent = document.querySelector<HTMLDivElement>('#not-important-not-urgent')

function apiUrl(path: string): string {
  if (path.startsWith('/')) {
    return `${apiBase}${path}`
  }
  return `${apiBase}/${path}`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function taskCard(task: DashboardTask): string {
  const title = escapeHtml(task.title)
  const deadline = task.deadline ? new Date(task.deadline).toLocaleString('ru-RU') : 'Без дедлайна'
  return `
    <div class="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p class="text-sm text-foreground font-medium leading-snug">${title}</p>
      <p class="mt-1 text-xs text-muted">ID: ${task.id} • Дедлайн: ${deadline}</p>
      <p class="mt-1 text-xs text-muted">Ответственный: ${task.responsibleId ?? '—'} • Статус: ${task.status ?? '—'}</p>
    </div>
  `
}

function renderColumn(el: HTMLDivElement | null, tasks: DashboardTask[]): void {
  if (!el) return
  if (tasks.length === 0) {
    el.innerHTML = `<p class="text-sm text-muted">Задач нет</p>`
    return
  }
  el.innerHTML = tasks.map(taskCard).join('')
}

async function loadDashboard(): Promise<void> {
  if (statusOut) statusOut.textContent = 'Загрузка...'
  try {
    const res = await fetch(apiUrl('/api/bitrix/tasks/eisenhower'))
    const text = await res.text()
    const body = JSON.parse(text) as DashboardPayload | { error?: string; message?: string }
    if (!res.ok) {
      throw new Error((body as { error?: string; message?: string }).error ?? `HTTP ${res.status}`)
    }
    const data = body as DashboardPayload
    renderColumn(colImportantUrgent, data.quadrants.important_urgent)
    renderColumn(colImportantNotUrgent, data.quadrants.important_not_urgent)
    renderColumn(colNotImportantUrgent, data.quadrants.not_important_urgent)
    renderColumn(colNotImportantNotUrgent, data.quadrants.not_important_not_urgent)
    if (statusOut) {
      statusOut.textContent = `Всего задач: ${data.totals.all} • обновлено ${new Date().toLocaleTimeString('ru-RU')}`
    }
  } catch (error) {
    if (statusOut) statusOut.textContent = `Ошибка: ${String(error)}`
  }
}

refreshBtn?.addEventListener('click', () => {
  void loadDashboard()
})

void loadDashboard()
