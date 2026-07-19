import { NextRequest, NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"
import { createClient } from "@supabase/supabase-js"

// Supabase（サーバー用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ←重要（サーバー専用）
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, roomName } = body

    if (!userId || !roomName) {
      return NextResponse.json(
        { error: "missing params" },
        { status: 400 }
      )
    }

    // =========================
    // ① ユーザー認証チェック
    // =========================
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !data.user) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      )
    }

    // =========================
    // ② LiveKitトークン生成
    // =========================
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: userId,
        ttl: 60 * 60 // 1時間
      }
    )

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    })

    const token = await at.toJwt()

    // =========================
    // ③ 返却
    // =========================
    return NextResponse.json({ token })

  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    )
  }
}