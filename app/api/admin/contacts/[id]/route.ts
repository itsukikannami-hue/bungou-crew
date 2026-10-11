import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
const statuses = new Set(["pending", "in_progress", "resolved"])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Context = { params: Promise<{ id: string }> }

async function authorize() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return 401
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle()
  if (profileError || profile?.is_admin !== true) return 403
  return 200
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const status = await authorize()
    if (status !== 200) return NextResponse.json({ error: "権限がありません。" }, { status })
    const { id } = await context.params
    if (!uuidPattern.test(id)) return NextResponse.json({ error: "IDが不正です。" }, { status: 400 })
    const { data, error } = await supabaseAdmin.from("contact_inquiries")
      .select("id, user_id, name, email, category, subject, message, status, admin_note, created_at, updated_at")
      .eq("id", id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: "お問い合わせが見つかりません。" }, { status: 404 })
    return NextResponse.json({ inquiry: data }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Admin contact detail failed", error)
    return NextResponse.json({ error: "お問い合わせを取得できませんでした。" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const status = await authorize()
    if (status !== 200) return NextResponse.json({ error: "権限がありません。" }, { status })
    const { id } = await context.params
    if (!uuidPattern.test(id)) return NextResponse.json({ error: "IDが不正です。" }, { status: 400 })
    const raw = await request.text()
    if (raw.length > 12000) return NextResponse.json({ error: "入力内容が長すぎます。" }, { status: 413 })
    let body: unknown
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: "JSONが不正です。" }, { status: 400 }) }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "入力内容が不正です。" }, { status: 400 })
    const value = body as Record<string, unknown>
    if (typeof value.status !== "string" || !statuses.has(value.status) || typeof value.admin_note !== "string" || value.admin_note.length > 5000) {
      return NextResponse.json({ error: "対応状況またはメモを確認してください。" }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin.from("contact_inquiries")
      .update({ status: value.status, admin_note: value.admin_note.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", id).select("id, status, admin_note, updated_at").maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: "お問い合わせが見つかりません。" }, { status: 404 })
    return NextResponse.json({ inquiry: data }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Admin contact update failed", error)
    return NextResponse.json({ error: "更新に失敗しました。" }, { status: 500 })
  }
}
