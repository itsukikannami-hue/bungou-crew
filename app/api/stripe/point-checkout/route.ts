import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const POINT_PACKS = {
  100: {
    points: 100,
    priceId: process.env.STRIPE_POINT_100_PRICE_ID!,
  },
  300: {
    points: 300,
    priceId: process.env.STRIPE_POINT_300_PRICE_ID!,
  },
  500: {
    points: 500,
    priceId: process.env.STRIPE_POINT_500_PRICE_ID!,
  },
  1000: {
    points: 1000,
    priceId: process.env.STRIPE_POINT_1000_PRICE_ID!,
  },
  3000: {
    points: 3000,
    priceId: process.env.STRIPE_POINT_3000_PRICE_ID!,
  },
  5000: {
    points: 5000,
    priceId: process.env.STRIPE_POINT_5000_PRICE_ID!,
  },
  10000: {
    points: 10000,
    priceId: process.env.STRIPE_POINT_10000_PRICE_ID!,
  },
  20000: {
    points: 20000,
    priceId: process.env.STRIPE_POINT_20000_PRICE_ID!,
  },
  30000: {
    points: 30000,
    priceId: process.env.STRIPE_POINT_30000_PRICE_ID!,
  },
} as const

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Componentから呼ばれた場合などは無視
            }
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const points = Number(body.points)

    if (!Number.isInteger(points)) {
      return NextResponse.json(
        { error: "ポイント数が不正です" },
        { status: 400 }
      )
    }

    const pointPack =
      POINT_PACKS[points as keyof typeof POINT_PACKS]

    if (!pointPack) {
      return NextResponse.json(
        { error: "購入できないポイント数です" },
        { status: 400 }
      )
    }

    if (!pointPack.priceId) {
      return NextResponse.json(
        { error: "Stripe Price IDが設定されていません" },
        { status: 500 }
      )
    }

    const origin = request.headers.get("origin")

    if (!origin) {
      return NextResponse.json(
        { error: "Originを取得できませんでした" },
        { status: 500 }
      )
    }

    const purchaseId = crypto.randomUUID()

    const { error: purchaseError } = await supabaseAdmin
      .from("point_purchases")
      .insert({
        id: purchaseId,
        user_id: user.id,
        points: pointPack.points,
        amount: 0,
        currency: "jpy",
        status: "pending",
      })

    if (purchaseError) {
      console.error(
        "ポイント購入レコード作成エラー:",
        purchaseError
      )

      return NextResponse.json(
        { error: "購入情報の作成に失敗しました" },
        { status: 500 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price: pointPack.priceId,
          quantity: 1,
        },
      ],

      success_url:
        `${origin}/mypage?point_purchase=success`,
      cancel_url:
        `${origin}/mypage?point_purchase=cancel`,

      metadata: {
        user_id: user.id,
        purchase_id: purchaseId,
        points: String(pointPack.points),
      },

      payment_intent_data: {
        metadata: {
          user_id: user.id,
          purchase_id: purchaseId,
          points: String(pointPack.points),
        },
      },
    })

    const { error: updateError } = await supabaseAdmin
      .from("point_purchases")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", purchaseId)

    if (updateError) {
      console.error(
        "ポイント購入Checkout Session保存エラー:",
        updateError
      )

      return NextResponse.json(
        { error: "購入情報の更新に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error("ポイント購入Checkoutエラー:", error)

    return NextResponse.json(
      { error: "ポイント購入処理に失敗しました" },
      { status: 500 }
    )
  }
}