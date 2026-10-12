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

    const { endpoint } = await request.json()
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2048) {
      return NextResponse.json({ error: "不正な入力です" }, { status: 400 })
    }

    const { error } = await adminDb()
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Push unsubscribe]", error)
    return NextResponse.json({ error: "解除できませんでした" }, { status: 500 })
  }
}
