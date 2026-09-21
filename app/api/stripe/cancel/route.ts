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
    // 現在のサブスクリプション取得
    // ----------------------------------------

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        "id, stripe_subscription_id, status, cancel_at_period_end, current_period_end"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("current_period_end", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      console.error(
        "サブスクリプション取得エラー:",
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

    if (!subscription) {
      return NextResponse.json(
        {
          error: "現在契約中のプランがありません",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // Stripe Subscription ID確認
    // ----------------------------------------

    if (!subscription.stripe_subscription_id) {
      console.error(
        "Stripe Subscription IDが存在しません:",
        subscription.id
      )

      return NextResponse.json(
        {
          error:
            "Stripeの契約情報が見つかりません",
        },
        { status: 500 }
      )
    }

    // ----------------------------------------
    // すでに解約予約済みか確認
    // ----------------------------------------

    if (subscription.cancel_at_period_end) {
      return NextResponse.json(
        {
          error:
            "すでに解約予約されています",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // Stripeで期間終了時解約を設定
    // ----------------------------------------

    const updatedSubscription =
      await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: true,
        }
      )

    // ----------------------------------------
    // Supabase側も即時反映
    // ----------------------------------------

    const { error: updateError } =
      await supabase
        .from("subscriptions")
        .update({
          cancel_at_period_end:
            updatedSubscription.cancel_at_period_end,
          current_period_end:
            updatedSubscription.items.data[0]
              ?.current_period_end
              ? new Date(
                  updatedSubscription.items.data[0]
                    .current_period_end * 1000
                ).toISOString()
              : subscription.current_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

    if (updateError) {
      console.error(
        "Supabaseサブスクリプション更新エラー:",
        updateError
      )

      return NextResponse.json(
        {
          error:
            "解約予約はStripe側で完了しましたが、画面への反映に失敗しました",
        },
        { status: 500 }
      )
    }

    // ----------------------------------------
    // 完了
    // ----------------------------------------

    return NextResponse.json({
      success: true,
      cancel_at_period_end:
        updatedSubscription.cancel_at_period_end,
      current_period_end:
        subscription.current_period_end,
    })
  } catch (error) {
    console.error(
      "Stripe Cancel Error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "解約予約に失敗しました",
      },
      { status: 500 }
    )
  }
}