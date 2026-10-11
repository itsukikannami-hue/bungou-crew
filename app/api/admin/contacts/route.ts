import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
const statuses = new Set(["pending", "in_progress", "resolved"])

async function authorize() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: 401 as const }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle()
  if (profileError || profile?.is_admin !== true) return { status: 403 as const }
  return { status: 200 as const }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize()
    if (auth.status !== 200) return NextResponse.json({ error: "権限がありません。" }, { status: auth.status })
    const status = request.nextUrl.searchParams.get("status")
    if (status && !statuses.has(status)) return NextResponse.json({ error: "不正な絞り込み条件です。" }, { status: 400 })
    const pageRaw = Number(request.nextUrl.searchParams.get("page") || "1")
    if (!Number.isSafeInteger(pageRaw) || pageRaw < 1 || pageRaw > 100000) return NextResponse.json({ error: "ページ番号が不正です。" }, { status: 400 })
    const limit = 20
    let query = supabaseAdmin.from("contact_inquiries")
      .select("id, name, email, category, subject, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range((pageRaw - 1) * limit, pageRaw * limit - 1)
    if (status) query = query.eq("status", status)
    const { data, count, error } = await query
    if (error) throw error
    return NextResponse.json({ inquiries: data ?? [], total: count ?? 0, page: pageRaw, pageSize: limit }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Admin contacts list failed", error)
    return NextResponse.json({ error: "お問い合わせを取得できませんでした。" }, { status: 500 })
  }
}
