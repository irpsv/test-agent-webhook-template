import { B24Hook } from '@bitrix24/b24jssdk'

export function createB24FromEnv(): ReturnType<typeof B24Hook.fromWebhookUrl> | null {
  const url = process.env.B24_WEBHOOK_URL
  if (!url?.trim()) {
    return null
  }
  return B24Hook.fromWebhookUrl(url.trim())
}
