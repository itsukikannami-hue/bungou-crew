import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  try {
    // ----------------------------------------
    // Supabaseユーザー取得
    // ----------------------------------------

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "ログインが必要です",
        },
        { status: 401 }
      )
    }

    // ----------------------------------------
    // リクエスト内容取得
    // ----------------------------------------

    const body = await request.json().catch(() => ({}))

    const plan = body?.plan

    // ----------------------------------------
    // プラン確認
    // ----------------------------------------

    if (plan !== "premium" && plan !== "ultimate") {
      return NextResponse.json(
        {
          error: "料金プランが不正です",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // Stripe Price ID
    // ----------------------------------------

    const premiumPriceId =
      process.env.STRIPE_PREMIUM_PRICE_ID

    const ultimatePriceId =
      process.env.STRIPE_ULTIMATE_PRICE_ID

    if (!premiumPriceId) {
      console.error(
        "STRIPE_PREMIUM_PRICE_ID is not configured"
      )

      return NextResponse.json(
        {
          error:
            "500円プランのStripe Price IDが設定されていません",
        },
        { status: 500 }
      )
    }

    if (!ultimatePriceId) {
      console.error(
        "STRIPE_ULTIMATE_PRICE_ID is not configured"
      )

      return NextResponse.json(
        {
          error:
            "980円プランのStripe Price IDが設定されていません",
        },
        { status: 500 }
      )
    }

    // ----------------------------------------
    // 選択されたプランのPrice ID
    // ----------------------------------------

    const priceId =
      plan === "premium"
        ? premiumPriceId
        : ultimatePriceId

    // ----------------------------------------
    // 既存のサブスクリプション確認
    // ----------------------------------------

    const {
      data: existingSubscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        "id, status, stripe_customer_id, current_period_end"
      )
      .eq("user_id", user.id)
      .in("status", [
        "active",
        "trialing",
        "past_due",
      ])
      .gt(
        "current_period_end",
        new Date().toISOString()
      )
      .order("current_period_end", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      console.error(
        "既存サブスク確認エラー:",
        subscriptionError
      )

      return NextResponse.json(
        {
          error:
            "契約状態の確認に失敗しました",
        },
        { status: 500 }
      )
    }

    // すでに契約中ならCheckoutへ進ませない
    if (existingSubscription) {
      return NextResponse.json(
        {
          error:
            "すでにプレミアムプランを契約しています",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // Stripe Customer
    // ----------------------------------------

    const customer =
      await stripe.customers.create({
        email: user.email ?? undefined,

        metadata: {
          user_id: user.id,
        },
      })

    const customerId = customer.id

    // ----------------------------------------
    // Stripe Checkout Session
    // ----------------------------------------

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000"

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer: customerId,

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        metadata: {
          user_id: user.id,
          plan,
        },

        subscription_data: {
          metadata: {
            user_id: user.id,
            plan,
          },
        },

        success_url:
          `${siteUrl}/mypage?subscription=success`,

        cancel_url:
          `${siteUrl}/mypage?subscription=cancel`,

        allow_promotion_codes: false,
      })

    // ----------------------------------------
    // Checkout URLを返す
    // ----------------------------------------

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error(
      "Stripe Checkout Error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Stripe Checkoutの作成に失敗しました",
      },
      { status: 500 }
    )
  }
}