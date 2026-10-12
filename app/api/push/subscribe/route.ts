import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { adminDb } from "@/lib/pushServer"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 })
    }

    const body = await request.json()
    const endpoint = body?.endpoint
    const p256dh = body?.keys?.p256dh
    const auth = body?.keys?.auth

    if (
      typeof endpoint !== "string" || endpoint.length > 2048 ||
      !endpoint.startsWith("https://") ||
      typeof p256dh !== "string" || !p256dh || p256dh.length > 512 ||
      typeof auth !== "string" || !auth || auth.length > 512
    ) {
      return NextResponse.json({ error: "購読情報が不正です" }, { status: 400 })
    }

    const db = adminDb()
    const { data: existing, error: lookupError } = await db
      .from("push_subscriptions")
      .select("user_id")
      .eq("endpoint", endpoint)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (existing && existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "このブラウザの通知は別のアカウントに登録されています。以前のアカウントで通知を解除してください。" },
        { status: 409 }
      )
    }

    if (existing) {
      const { error } = await db.from("push_subscriptions")
        .update({ p256dh, auth, updated_at: new Date().toISOString() })
        .eq("endpoint", endpoint)
        .eq("user_id", user.id)
      if (error) throw error
    } else {
      const { error } = await db.from("push_subscriptions")
        .insert({ user_id: user.id, endpoint, p256dh, auth })
      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "購読情報が既に登録されています。再度お試しください。" }, { status: 409 })
        }
        throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Push subscribe]", error)
    return NextResponse.json({ error: "登録できませんでした" }, { status: 500 })
  }
}
