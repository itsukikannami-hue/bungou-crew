import { NextRequest, NextResponse } from 'next/server'
import { adminClient, authClient, encrypt, xCallbackUrl, xTokenRequest } from '@/lib/xServer'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const redirect = (status: string) => NextResponse.redirect(new URL(`/?x_connect=${status}`, request.url))
  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const expected = request.cookies.get('x_oauth_state')?.value
  const verifier = request.cookies.get('x_oauth_verifier')?.value
  const expectedUser = request.cookies.get('x_oauth_user')?.value
  if (!code || !state || !expected || state !== expected || !verifier || !expectedUser) return redirect('failed')
  const supabase = await authClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== expectedUser) return redirect('failed')
  try {
    const token = await xTokenRequest(new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: xCallbackUrl(), code_verifier: verifier,
    }))
    if (!token.scope?.split(' ').includes('tweet.write')) return redirect('missing_scope')
    const admin = adminClient()
    const { error } = await admin.from('x_connections').upsert({
      user_id: user.id, access_token_enc: encrypt(token.access_token),
      refresh_token_enc: token.refresh_token ? encrypt(token.refresh_token) : null,
      expires_at: new Date(Date.now() + (token.expires_in ?? 7200) * 1000).toISOString(),
      scope: token.scope,
    }, { onConflict: 'user_id' })
    if (error) throw error
    const response = redirect('success')
    for (const name of ['x_oauth_state', 'x_oauth_verifier', 'x_oauth_user']) response.cookies.delete(name)
    return response
  } catch (error) {
    console.error('X OAuth callback failed', error)
    return redirect('failed')
  }
}
