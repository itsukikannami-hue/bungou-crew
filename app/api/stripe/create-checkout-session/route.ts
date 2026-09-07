import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabaseServer"

export async function POST() {
  try {
    // Server側のSupabaseクライアントを作成
    const supabase = await createClient()

    // ログインユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      )
    }

    // Stripe Price ID
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID

    if (!priceId) {
      console.error("STRIPE_PREMIUM_PRICE_ID is not configured")

      return NextResponse.json(
        { error: "Stripe Price IDが設定されていません" },
        { status: 500 }
      )
    }

    // 現在のサイトURL
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"

    // Stripe Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url:
        `${origin}/mypage?subscription=success`,

      cancel_url:
        `${origin}/mypage?subscription=canceled`,

      client_reference_id: user.id,

      metadata: {
        user_id: user.id,
      },
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error("Stripe Checkout Error:", error)

    return NextResponse.json(
      { error: "Checkoutの作成に失敗しました" },
      { status: 500 }
    )
  }
}