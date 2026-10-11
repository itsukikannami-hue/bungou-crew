import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { authClient, xCallbackUrl } from '@/lib/xServer'

export const runtime = 'nodejs'
export async function GET(request: Request) {
  const supabase = await authClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const url = new URL('https://twitter.com/i/oauth2/authorize')
  url.search = new URLSearchParams({
    response_type: 'code', client_id: process.env.X_CLIENT_ID!, redirect_uri: xCallbackUrl(),
    scope: 'tweet.read users.read tweet.write offline.access', state,
    code_challenge: challenge, code_challenge_method: 'S256',
  }).toString()
  const response = NextResponse.redirect(url)
  const secure = process.env.NODE_ENV === 'production'
  response.cookies.set('x_oauth_state', state, { httpOnly: true, secure, sameSite: 'lax', path: '/api/x', maxAge: 600 })
  response.cookies.set('x_oauth_verifier', verifier, { httpOnly: true, secure, sameSite: 'lax', path: '/api/x', maxAge: 600 })
  response.cookies.set('x_oauth_user', user.id, { httpOnly: true, secure, sameSite: 'lax', path: '/api/x', maxAge: 600 })
  return response
}
