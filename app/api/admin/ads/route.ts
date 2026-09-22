import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // ログイン確認

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "ログインが必要です。",
        },
        {
          status: 401,
        }
      )
    }

    // 管理者確認

    const {
      data: adminProfile,
      error: adminError,
    } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (
      adminError ||
      !adminProfile?.is_admin
    ) {
      return NextResponse.json(
        {
          error: "管理者権限がありません。",
        },
        {
          status: 403,
        }
      )
    }

    // リクエスト

    const body = await request.json()

    const {
      adId,
      action,
    } = body

    if (!adId) {
      return NextResponse.json(
        {
          error: "広告IDが指定されていません。",
        },
        {
          status: 400,
        }
      )
    }

    if (action !== "stop") {
      return NextResponse.json(
        {
          error: "不正な操作です。",
        },
        {
          status: 400,
        }
      )
    }

    // 対象広告確認

    const {
      data: ad,
      error: adError,
    } = await supabaseAdmin
      .from("ads")
      .select("id, status")
      .eq("id", adId)
      .single()

    if (adError || !ad) {
      return NextResponse.json(
        {
          error: "対象広告が存在しません。",
        },
        {
          status: 404,
        }
      )
    }

    if (ad.status !== "active") {
      return NextResponse.json(
        {
          error: "この広告はすでに掲載中ではありません。",
        },
        {
          status: 400,
        }
      )
    }

    // 広告停止

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("ads")
      .update({
        status: "stopped",
        updated_at: new Date().toISOString(),
      })
      .eq("id", adId)

    if (updateError) {
      console.error(
        "広告停止DB更新エラー:",
        updateError
      )

      return NextResponse.json(
        {
          error: "広告の停止に失敗しました。",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "管理広告APIエラー:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "サーバーエラーが発生しました。",
      },
      {
        status: 500,
      }
    )
  }
}