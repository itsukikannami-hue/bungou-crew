import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabaseServer"

export async function POST() {
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
    // Stripe Price ID
    // ----------------------------------------

    const priceId =
      process.env.STRIPE_PREMIUM_PRICE_ID

    if (!priceId) {
      console.error(
        "STRIPE_PREMIUM_PRICE_ID is not configured"
      )

      return NextResponse.json(
        {
          error:
            "Stripe Price IDが設定されていません",
        },
        { status: 500 }
      )
    }

    // ----------------------------------------
    // 既存のサブスクリプション確認
    // ----------------------------------------

    const {
      data: existingSubscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        "id, status, stripe_customer_id"
      )
      .eq("user_id", user.id)
      .in("status", [
        "active",
        "trialing",
        "past_due",
      ])
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
        },

        subscription_data: {
          metadata: {
            user_id: user.id,
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