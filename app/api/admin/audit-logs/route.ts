import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const allowedActions = new Set(["admin_grant", "admin_remove", "ad_stop", "announcement_create", "announcement_send_start", "item_create", "item_update", "item_delete"])

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()
    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "管理者権限がありません。" }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get("action") ?? ""
    const actor = (url.searchParams.get("actor") ?? "").trim()
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1))
    if (action && !allowedActions.has(action)) {
      return NextResponse.json({ error: "操作種別が不正です。" }, { status: 400 })
    }
    if (actor && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(actor)) {
      return NextResponse.json({ error: "管理者IDの形式が不正です。" }, { status: 400 })
    }

    const pageSize = 30
    let query = supabaseAdmin
      .from("admin_audit_logs")
      .select("id, actor_user_id, action, target_type, target_id, details, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
    if (action) query = query.eq("action", action)
    if (actor) query = query.eq("actor_user_id", actor)

    const { data, error, count } = await query
    if (error) {
      console.error("監査ログ取得エラー:", error)
      return NextResponse.json({ error: "監査ログの取得に失敗しました。" }, { status: 500 })
    }
    return NextResponse.json({ logs: data ?? [], total: count ?? 0, page, pageSize }, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("監査ログAPIエラー:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 })
  }
}
