import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  try {
    // ----------------------------------------
    // ログインユーザー確認
    // ----------------------------------------

    const supabase = await createClient()

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

    // ----------------------------------------
    // リクエスト取得
    // ----------------------------------------

    const body = await request.json()

    const plan = body?.plan

    if (
      plan !== "premium" &&
      plan !== "ultimate"
    ) {
      return NextResponse.json(
        { error: "プラン指定が不正です" },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // 対象Subscription取得
    // ----------------------------------------

    const {
      data: subscriptionData,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        user_id,
        stripe_subscription_id,
        status,
        price_id,
        cancel_at_period_end,
        current_period_end
        `
      )
      .eq("user_id", user.id)
      .in("status", [
        "active",
        "trialing",
      ])
      .order("current_period_end", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      console.error(
        "Subscription取得エラー:",
        subscriptionError
      )

      return NextResponse.json(
        {
          error:
            "契約情報の取得に失敗しました",
        },
        { status: 500 }
      )
    }

    if (!subscriptionData) {
      return NextResponse.json(
        {
          error:
            "有効なサブスクリプションがありません",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // Stripe Subscription ID確認
    // ----------------------------------------

    if (
      !subscriptionData.stripe_subscription_id
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe Subscription IDがありません",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // 解約予約中はプラン変更不可
    // ----------------------------------------

    if (
      subscriptionData.cancel_at_period_end
    ) {
      return NextResponse.json(
        {
          error:
            "解約予約中はプラン変更できません。先に解約予約を取り消してください。",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // 現在のプラン確認
    // ----------------------------------------

    const premiumPriceId =
      process.env.STRIPE_PREMIUM_PRICE_ID

    const ultimatePriceId =
      process.env.STRIPE_ULTIMATE_PRICE_ID

    if (
      !premiumPriceId ||
      !ultimatePriceId
    ) {
      console.error(
        "Stripe Price IDが設定されていません"
      )

      return NextResponse.json(
        {
          error:
            "Stripe Price IDが設定されていません",
        },
        { status: 500 }
      )
    }

    const currentPlan =
      subscriptionData.price_id ===
      ultimatePriceId
        ? "ultimate"
        : subscriptionData.price_id ===
          premiumPriceId
        ? "premium"
        : "unknown"

    if (currentPlan === "unknown") {
      return NextResponse.json(
        {
          error:
            "現在の契約プランを判定できません",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // 同じプランへの変更を防止
    // ----------------------------------------

    if (currentPlan === plan) {
      return NextResponse.json(
        {
          error:
            "すでに同じプランを契約しています",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // 変更先Price ID
    // ----------------------------------------

    const targetPriceId =
      plan === "ultimate"
        ? ultimatePriceId
        : premiumPriceId

    // ----------------------------------------
    // Stripe Subscription取得
    // ----------------------------------------

    const subscription =
      await stripe.subscriptions.retrieve(
        subscriptionData.stripe_subscription_id
      )

    const subscriptionItem =
      subscription.items.data[0]

    if (!subscriptionItem) {
      return NextResponse.json(
        {
          error:
            "Stripe Subscription Itemが見つかりません",
        },
        { status: 500 }
      )
    }

    // ----------------------------------------
    // Stripe上のPrice変更
    // ----------------------------------------

    const updatedSubscription =
      await stripe.subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: subscriptionItem.id,
              price: targetPriceId,
            },
          ],

          // プラン変更による日割り差額を
          // Stripe側で計算する
          proration_behavior:
            "create_prorations",
        }
      )

    // ----------------------------------------
    // Supabase側も即時更新
    // ----------------------------------------

    const updatedItem =
      updatedSubscription.items.data[0]

    const updatedPriceId =
      updatedItem?.price.id ??
      targetPriceId

    const updatedPeriodStart =
      updatedItem?.current_period_start
        ? new Date(
            updatedItem.current_period_start *
              1000
          ).toISOString()
        : null

    const updatedPeriodEnd =
      updatedItem?.current_period_end
        ? new Date(
            updatedItem.current_period_end *
              1000
          ).toISOString()
        : null

    const {
      error: updateError,
    } = await supabase
      .from("subscriptions")
      .update({
        price_id: updatedPriceId,
        status:
          updatedSubscription.status,
        current_period_start:
          updatedPeriodStart,
        current_period_end:
          updatedPeriodEnd,
        cancel_at_period_end:
          updatedSubscription.cancel_at_period_end,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "stripe_subscription_id",
        subscription.id
      )

    if (updateError) {
      console.error(
        "Supabase Subscription更新エラー:",
        updateError
      )

      return NextResponse.json(
        {
          error:
            "契約情報の更新に失敗しました",
        },
        { status: 500 }
      )
    }

    // ----------------------------------------
    // 完了
    // ----------------------------------------

    console.log(
      "プラン変更完了:",
      {
        userId: user.id,
        subscriptionId:
          subscription.id,
        from: currentPlan,
        to: plan,
        priceId:
          updatedPriceId,
      }
    )

    return NextResponse.json({
      success: true,
      plan,
      priceId: updatedPriceId,
    })
  } catch (error) {
    console.error(
      "プラン変更エラー:",
      error
    )

    return NextResponse.json(
      {
        error:
          "プラン変更に失敗しました",
      },
      { status: 500 }
    )
  }
}