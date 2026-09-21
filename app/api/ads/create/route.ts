import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"

const AD_PRICES = {
  free: { 7: 1500, 15: 2500, 30: 4500 },
  premium: { 7: null, 15: 0, 30: 1500 },
  ultimate: { 7: null, 15: 0, 30: 0 },
} as const

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "ログインが必要です。" },
        { status: 401 }
      )
    }

    // プラン判定
    const {
      data: userPlan,
      error: planError,
    } = await supabase.rpc("get_user_plan", {
      target_user_id: user.id,
    })

    if (planError) {
      console.error(
        "プラン判定エラー:",
        planError
      )

      return NextResponse.json(
        {
          error:
            "プラン情報の確認に失敗しました。",
        },
        { status: 500 }
      )
    }

    const plan: "free" | "premium" | "ultimate" =
      userPlan === "premium"
        ? "premium"
        : userPlan === "ultimate"
          ? "ultimate"
          : "free"

    const body = await request.json()

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : ""

    const linkUrl =
      typeof body.linkUrl === "string"
        ? body.linkUrl.trim()
        : ""

    const durationDays = Number(
      body.durationDays
    )

    // メッセージチェック
    if (!message) {
      return NextResponse.json(
        {
          error:
            "広告メッセージを入力してください。",
        },
        { status: 400 }
      )
    }

    if (message.length > 140) {
      return NextResponse.json(
        {
          error:
            "広告メッセージは140文字以内にしてください。",
        },
        { status: 400 }
      )
    }

    // URLチェック
    if (!linkUrl) {
      return NextResponse.json(
        {
          error:
            "作品ページURLを入力してください。",
        },
        { status: 400 }
      )
    }

    // 掲載期間チェック
    if (
      durationDays !== 7 &&
      durationDays !== 15 &&
      durationDays !== 30
    ) {
      return NextResponse.json(
        {
          error: "不正な掲載期間です。",
        },
        { status: 400 }
      )
    }

    // プランごとの料金判定
    const price =
      AD_PRICES[plan][
        durationDays as 7 | 15 | 30
      ]

    // 有料プランの7日広告は禁止
    if (price === null) {
      return NextResponse.json(
        {
          error:
            "Premium・Ultimateプランでは7日広告を利用できません。",
        },
        { status: 400 }
      )
    }

    // 広告出稿
    const {
      data,
      error,
    } = await supabase.rpc("create_ad", {
      p_message: message,
      p_link_url: linkUrl,
      p_duration_days: durationDays,
    })

    if (error) {
      console.error(
        "広告出稿RPCエラー:",
        error
      )

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      plan,
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
      { status: 500 }
    )
  }
}