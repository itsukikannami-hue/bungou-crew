import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"

const AD_PLANS = {
  7: 1500,
  15: 2500,
  30: 4500,
} as const

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

    // リクエスト取得
    const body = await request.json()

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : ""

    const imageUrl =
      typeof body.imageUrl === "string"
        ? body.imageUrl.trim()
        : ""

    const linkUrl =
      typeof body.linkUrl === "string"
        ? body.linkUrl.trim()
        : ""

    const durationDays =
      Number(body.durationDays)

    // タイトル確認
    if (!title) {
      return NextResponse.json(
        {
          error:
            "広告タイトルを入力してください。",
        },
        {
          status: 400,
        }
      )
    }

    if (title.length > 100) {
      return NextResponse.json(
        {
          error:
            "広告タイトルは100文字以内にしてください。",
        },
        {
          status: 400,
        }
      )
    }

    const response = await fetch("/api/ads/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          genre: adGenre,
          message: adMessage,
          linkUrl: adLinkUrl,
          durationDays: adDuration,
        }),
      })

    // 画像URL確認
    if (!imageUrl) {
      return NextResponse.json(
        {
          error:
            "広告画像が指定されていません。",
        },
        {
          status: 400,
        }
      )
    }

    // URL確認
    if (!linkUrl) {
      return NextResponse.json(
        {
          error:
            "作品ページURLを入力してください。",
        },
        {
          status: 400,
        }
      )
    }

    // 掲載期間確認
    if (
      durationDays !== 7 &&
      durationDays !== 15 &&
      durationDays !== 30
    ) {
      return NextResponse.json(
        {
          error:
            "不正な掲載期間です。",
        },
        {
          status: 400,
        }
      )
    }

    // サーバー側で料金を決定
    const price =
      AD_PLANS[
        durationDays as 7 | 15 | 30
      ]

    // RPC実行
    const {
      data,
      error,
    } = await supabase.rpc(
      "create_ad",
      {
        p_title: title,
        p_image_url: imageUrl,
        p_link_url: linkUrl,
        p_duration_days: durationDays,
      }
    )

    if (error) {
      console.error(
        "広告出稿RPCエラー:",
        error
      )

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json({
      success: true,
      price,
      data,
    })
  } catch (error) {
    console.error(
      "広告出稿APIエラー:",
      error
    )

    return NextResponse.json(
      {
        error:
          "広告出稿処理に失敗しました。",
      },
      {
        status: 500,
      }
    )
  }
}