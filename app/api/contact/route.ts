import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

const allowedCategories = new Set(["general", "account", "payment", "bug", "report", "other"])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.toLowerCase().includes("application/json")) return response("JSON形式で送信してください。", 415)
    const contentLength = Number(request.headers.get("content-length") || 0)
    if (contentLength > 16000) return response("入力内容が長すぎます。", 413)

    const raw = await request.text()
    if (raw.length > 16000) return response("入力内容が長すぎます。", 413)
    let body: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return response("入力内容が不正です。", 400)
      body = parsed as Record<string, unknown>
    } catch { return response("入力内容が不正です。", 400) }

    const fields = ["name", "email", "category", "subject", "message", "website"]
    for (const key of fields) {
      if (body[key] !== undefined && typeof body[key] !== "string") return response("入力内容が不正です。", 400)
    }
    const name = (body.name as string | undefined || "").trim()
    const email = (body.email as string | undefined || "").trim()
    const category = (body.category as string | undefined || "").trim()
    const subject = (body.subject as string | undefined || "").trim()
    const message = (body.message as string | undefined || "").trim()
    const website = (body.website as string | undefined || "").trim()

    // Bot向けの隠しフィールド。入力されていたら保存せず成功扱い。
    if (website) return NextResponse.json({ success: true })
    if (name.length > 100 || !emailPattern.test(email) || email.length > 254 || !allowedCategories.has(category) || subject.length < 2 || subject.length > 150 || message.length < 10 || message.length > 5000) {
      return response("入力内容を確認してください。", 400)
    }

    // 同じメールアドレスからの短時間の連続送信を制限。
    // 本格的な公開前にはIPベースの共有レートリミッターやCAPTCHAも追加してください。
    const cutoff = new Date(Date.now() - 60_000).toISOString()
    const { data: recent, error: rateError } = await supabaseAdmin
      .from("contact_inquiries")
      .select("id")
      .eq("email", email)
      .gte("created_at", cutoff)
      .limit(1)
    if (rateError) {
      console.error("Contact rate limit check failed", rateError)
      return response("現在送信できません。しばらくしてからお試しください。", 503)
    }
    if (recent && recent.length > 0) return response("連続送信はできません。1分ほど待ってからお試しください。", 429)

    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch {
      // 未ログインからの送信も受け付ける。
    }

    const { error } = await supabaseAdmin.from("contact_inquiries").insert({
      user_id: userId, name: name || null, email, category, subject, message, status: "pending",
    })
    if (error) {
      console.error("Contact insert failed", error)
      return response("お問い合わせを保存できませんでした。時間をおいて再度お試しください。", 500)
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Contact POST failed", error)
    return response("送信中にエラーが発生しました。", 500)
  }
}
