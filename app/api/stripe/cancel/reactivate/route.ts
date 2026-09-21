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
    // 解約予約されているか確認
    // ----------------------------------------

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        {
          error:
            "現在、解約予約されていません",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // 契約終了日を確認
    // ----------------------------------------

    if (
      subscription.current_period_end &&
      new Date(subscription.current_period_end) <=
        new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "契約終了日を過ぎているため、解約予約を取り消せません",
        },
        { status: 400 }
      )
    }

    // ----------------------------------------
    // Stripeで解約予約を取り消す
    // ----------------------------------------

    const updatedSubscription =
      await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: false,
        }
      )

    // ----------------------------------------
    // Supabase側も更新
    // ----------------------------------------

    const { error: updateError } =
      await supabase
        .from("subscriptions")
        .update({
          cancel_at_period_end:
            updatedSubscription.cancel_at_period_end,
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
            "解約予約はStripe側で取り消されましたが、画面への反映に失敗しました",
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
    })
  } catch (error) {
    console.error(
      "Stripe Reactivate Error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "解約予約の取り消しに失敗しました",
      },
      { status: 500 }
    )
  }
}