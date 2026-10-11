import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export async function authClient() {
  const store = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => { for (const item of items) store.set(item.name, item.value, item.options) },
    } }
  )
}

export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const key = () => {
  const value = Buffer.from(process.env.X_TOKEN_ENCRYPTION_KEY || '', 'hex')
  if (value.length !== 32) throw new Error('X_TOKEN_ENCRYPTION_KEY は32バイトの16進数で設定してください')
  return value
}
export function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map(v => v.toString('base64url')).join('.')
}
export function decrypt(value: string) {
  const [a, b, c] = value.split('.')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(a, 'base64url'))
  decipher.setAuthTag(Buffer.from(b, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(c, 'base64url')), decipher.final()]).toString('utf8')
}

export const xCallbackUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL!.replace(/\/$/, '')}/api/x/callback`
export function xBasicAuth() {
  return 'Basic ' + Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')
}
export async function xTokenRequest(params: URLSearchParams) {
  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST', headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: xBasicAuth(),
    }, body: params.toString(), cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok || !result.access_token) throw new Error(`Xトークン取得失敗 (${response.status})`)
  return result as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string }
}
