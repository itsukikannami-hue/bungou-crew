import { NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe signatureがありません" },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured")

    return NextResponse.json(
      { error: "Webhook secretが設定されていません" },
      { status: 500 }
    )
  }

  try {
    // ----------------------------------------
    // Stripe署名検証
    // ----------------------------------------

    const body = await request.text()

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    console.log("Stripe Webhook:", event.type)

    const supabase = supabaseAdmin

    // ----------------------------------------
    // 二重処理防止
    // ----------------------------------------

    const { data: existingEvent, error: existingEventError } =
      await supabase
        .from("stripe_events")
        .select("id, processed")
        .eq("event_id", event.id)
        .maybeSingle()

    if (existingEventError) {
      console.error(
        "stripe_events確認エラー:",
        existingEventError
      )

      return NextResponse.json(
        { error: "イベント確認に失敗しました" },
        { status: 500 }
      )
    }

    // すでに処理済みなら終了
    if (existingEvent?.processed) {
      console.log(
        "Stripe Event already processed:",
        event.id
      )

      return NextResponse.json({
        received: true,
        duplicate: true,
      })
    }

    // ----------------------------------------
    // イベントを記録
    // ----------------------------------------

    if (!existingEvent) {
      const { error: insertEventError } =
        await supabase
          .from("stripe_events")
          .insert({
            event_id: event.id,
            event_type: event.type,
            processed: false,
          })

      if (insertEventError) {
        console.error(
          "stripe_events登録エラー:",
          insertEventError
        )

        return NextResponse.json(
          { error: "イベント登録に失敗しました" },
          { status: 500 }
        )
      }
    }

    // ----------------------------------------
    // Checkout完了
    // ----------------------------------------

    if (event.type === "checkout.session.completed") {
      const session =
        event.data.object as Stripe.Checkout.Session

      const userId = session.metadata?.user_id

      let isPointPurchase = false
// ----------------------------------------
// ポイント購入
// ----------------------------------------

const purchaseId =
  session.metadata?.purchase_id

const purchasePoints =
  session.metadata?.points

if (
  purchaseId &&
  purchasePoints &&
  session.mode === "payment"
) {
  isPointPurchase = true
  const points = Number(purchasePoints)

  if (!Number.isInteger(points) || points <= 0) {
    console.error(
      "ポイント購入のポイント数が不正です:",
      purchasePoints
    )

    return NextResponse.json(
      {
        error:
          "ポイント購入のポイント数が不正です",
      },
      { status: 400 }
    )
  }

  if (!userId) {
    console.error(
      "ポイント購入Checkout Sessionにuser_idがありません"
    )

    return NextResponse.json(
      { error: "user_idがありません" },
      { status: 400 }
    )
  }

  // ----------------------------------------
  // point_purchases を取得
  // ----------------------------------------

  const {
    data: purchase,
    error: purchaseError,
  } = await supabase
    .from("point_purchases")
    .select(
      "id, user_id, points, status"
    )
    .eq("id", purchaseId)
    .eq("user_id", userId)
    .maybeSingle()

  if (purchaseError) {
    console.error(
      "ポイント購入情報取得エラー:",
      purchaseError
    )

    return NextResponse.json(
      {
        error:
          "ポイント購入情報の取得に失敗しました",
      },
      { status: 500 }
    )
  }

  if (!purchase) {
    console.error(
      "ポイント購入情報が見つかりません:",
      purchaseId
    )

    return NextResponse.json(
      {
        error:
          "ポイント購入情報が見つかりません",
      },
      { status: 404 }
    )
  }

  // ----------------------------------------
  // DBの購入ポイント数とWebhookのポイント数を確認
  // ----------------------------------------

  if (purchase.points !== points) {
    console.error(
      "ポイント数が一致しません:",
      {
        purchasePoints: purchase.points,
        metadataPoints: points,
        purchaseId,
      }
    )

    return NextResponse.json(
      {
        error:
          "ポイント購入情報が一致しません",
      },
      { status: 400 }
    )
  }

  // ----------------------------------------
  // 決済情報
  // ----------------------------------------

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  // ----------------------------------------
  // 購入情報を成功に更新
  // ----------------------------------------

  if (purchase.status !== "succeeded") {
    const {
      error: updatePurchaseError,
    } = await supabase
      .from("point_purchases")
      .update({
        status: "succeeded",
        stripe_checkout_session_id:
          session.id,
        stripe_payment_intent_id:
          paymentIntentId,
        amount:
          session.amount_total ?? 0,
        currency:
          session.currency ?? "jpy",
        paid_at:
          new Date().toISOString(),
      })
      .eq("id", purchaseId)
      .eq("status", "pending")

    if (updatePurchaseError) {
      console.error(
        "ポイント購入情報更新エラー:",
        updatePurchaseError
      )

      return NextResponse.json(
        {
          error:
            "ポイント購入情報の更新に失敗しました",
        },
        { status: 500 }
      )
    }
  }

  // ----------------------------------------
  // ポイント付与
  // ----------------------------------------
  //
  // process_point_transaction は
  // reference_id = purchaseId を使って
  // 二重付与を防止する
  // ----------------------------------------

  const {
    data: pointResult,
    error: pointError,
  } = await supabaseAdmin.rpc(
    "process_point_transaction",
    {
      p_user_id: userId,
      p_amount: points,
      p_type: "point_purchase",
      p_description:
        `${points.toLocaleString()}pt購入`,
      p_created_by: null,
      p_reference_id: purchaseId,
    }
  )

  if (pointError) {
    console.error(
      "ポイント購入ポイント付与エラー:",
      pointError
    )

    return NextResponse.json(
      {
        error:
          "ポイント付与に失敗しました",
      },
      { status: 500 }
    )
  }

  console.log(
    "ポイント購入完了:",
    {
      userId,
      purchaseId,
      points,
      amount:
        session.amount_total ?? 0,
      referenceId:
        purchaseId,
      pointResult,
    }
  )

  // ここではreturnしない
  // ↓
  // この後のstripe_events処理済み更新まで進める
}
if (!isPointPurchase) {
  if (!userId) {
        console.error(
          "Checkout Sessionにuser_idがありません"
        )

        return NextResponse.json(
          { error: "user_idがありません" },
          { status: 400 }
        )
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id

      if (!subscriptionId) {
        console.error(
          "Checkout Sessionにsubscription IDがありません"
        )

        return NextResponse.json(
          { error: "subscription IDがありません" },
          { status: 400 }
        )
      }

      // ----------------------------------------
      // Stripe Subscriptionを取得
      // ----------------------------------------

      const subscription =
        await stripe.subscriptions.retrieve(
          subscriptionId
        )

      const subscriptionItem =
        subscription.items.data[0]

      const priceId =
        subscriptionItem?.price.id ?? null

      const plan =
        priceId === process.env.STRIPE_ULTIMATE_PRICE_ID
          ? "ultimate"
          : "premium"

      const productName =
        plan === "ultimate"
          ? "ブンゴウクルー アルティメットプラン"
          : "ブンゴウクルー プレミアム"

      const signupPoints =
        plan === "ultimate"
          ? 5000
          : 2000

      const currentPeriodStart =
        subscriptionItem?.current_period_start
          ? new Date(
              subscriptionItem.current_period_start * 1000
            ).toISOString()
          : null

      const currentPeriodEnd =
        subscriptionItem?.current_period_end
          ? new Date(
              subscriptionItem.current_period_end * 1000
            ).toISOString()
          : null

      // ----------------------------------------
      // subscriptions 作成・更新
      // ----------------------------------------

      const {
        data: savedSubscription,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            price_id: priceId,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end:
              subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "stripe_subscription_id",
          }
        )
        .select("id")
        .single()

      if (subscriptionError) {
        console.error(
          "subscriptions更新エラー:",
          subscriptionError
        )

        return NextResponse.json(
          { error: "subscription更新に失敗しました" },
          { status: 500 }
        )
      }

      // ----------------------------------------
      // Checkout Sessionの決済情報
      // ----------------------------------------

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null

      const invoiceId =
        typeof session.invoice === "string"
          ? session.invoice
          : session.invoice?.id ?? null

      // ----------------------------------------
      // 初回決済をpaymentsに登録
      // ----------------------------------------

      const { data: existingPayment } =
        await supabase
          .from("payments")
          .select("id")
          .eq(
            "stripe_checkout_session_id",
            session.id
          )
          .maybeSingle()

      if (!existingPayment) {
        const { error: paymentError } =
          await supabase
            .from("payments")
            .insert({
              user_id: userId,
              subscription_id:
                savedSubscription?.id ?? null,
              product_name: productName,
              amount:
                session.amount_total ?? 500,
              currency:
                session.currency ?? "jpy",
              status: "succeeded",
              stripe_payment_id:
                paymentIntentId,
              stripe_invoice_id:
                invoiceId,
              stripe_checkout_session_id:
                session.id,
              paid_at:
                new Date().toISOString(),
            })

        if (paymentError) {
          console.error(
            "payments登録エラー:",
            paymentError
          )

          return NextResponse.json(
            { error: "payment登録に失敗しました" },
            { status: 500 }
          )
        }
      }

      // ----------------------------------------
      // サブスク加入特典ポイント付与
      // ----------------------------------------

      const {
        data: pointResult,
        error: pointError,
      } = await supabaseAdmin.rpc(
        "process_point_transaction",
        {
          p_user_id: userId,
          p_amount: signupPoints,
          p_type: "subscription_signup",
          p_description:
            `${productName}加入特典`,
          p_created_by: null,
          p_reference_id: session.id,
        }
      )

      if (pointError) {
        console.error(
          "加入特典ポイント付与エラー:",
          pointError
        )

        return NextResponse.json(
          {
            error:
              "加入特典ポイント付与に失敗しました",
          },
          { status: 500 }
        )
      }

      console.log(
        "加入特典ポイント付与完了:",
        {
          userId,
          plan,
          signupPoints,
          referenceId: session.id,
          pointResult,
        }
      )
    }
  }


    // ----------------------------------------
    // Subscription作成・更新
    // ----------------------------------------

    if (
      event.type ===
        "customer.subscription.created" ||
      event.type ===
        "customer.subscription.updated"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription

      const subscriptionItem =
        subscription.items.data[0]

      const priceId =
        subscriptionItem?.price.id ?? null

      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id

      const { data: existingSubscription } =
        await supabase
          .from("subscriptions")
          .select("id, user_id")
          .eq(
            "stripe_subscription_id",
            subscription.id
          )
          .maybeSingle()

      if (existingSubscription?.user_id) {
        const { error: updateError } =
          await supabase
            .from("subscriptions")
            .update({
              stripe_customer_id:
                customerId,
              status:
                subscription.status,
              price_id:
                priceId,
              current_period_start:
                subscriptionItem?.current_period_start
                  ? new Date(
                      subscriptionItem.current_period_start *
                        1000
                    ).toISOString()
                  : null,
              current_period_end:
                subscriptionItem?.current_period_end
                  ? new Date(
                      subscriptionItem.current_period_end *
                        1000
                    ).toISOString()
                  : null,
              cancel_at_period_end:
                subscription.cancel_at_period_end,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "stripe_subscription_id",
              subscription.id
            )

        if (updateError) {
          console.error(
            "subscriptions更新エラー:",
            updateError
          )

          return NextResponse.json(
            { error: "subscription更新に失敗しました" },
            { status: 500 }
          )
        }
      }
    }

    // ----------------------------------------
    // Subscription削除・キャンセル
    // ----------------------------------------

    if (
      event.type ===
      "customer.subscription.deleted"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription

      const { error: cancelError } =
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "stripe_subscription_id",
            subscription.id
          )

      if (cancelError) {
        console.error(
          "subscriptionsキャンセル更新エラー:",
          cancelError
        )

        return NextResponse.json(
          { error: "subscriptionキャンセル更新に失敗しました" },
          { status: 500 }
        )
      }
    }

    // ----------------------------------------
    // 継続課金成功
    // ----------------------------------------

    if (
      event.type ===
      "invoice.payment_succeeded"
    ) {
      const invoice =
        event.data.object as Stripe.Invoice

      console.log(
        "Invoice payment succeeded:",
        invoice.id
      )

      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null

      if (customerId) {
        const { data: subscriptionData } =
          await supabase
            .from("subscriptions")
            .select(
              "id, user_id, price_id"
            )
            .eq(
              "stripe_customer_id",
              customerId
            )
            .maybeSingle()

        if (subscriptionData?.user_id) {
          const subscriptionPlan =
  subscriptionData.price_id ===
  process.env.STRIPE_ULTIMATE_PRICE_ID
    ? "ultimate"
    : "premium"

const subscriptionProductName =
  subscriptionPlan === "ultimate"
    ? "ブンゴウクルー アルティメットプラン"
    : "ブンゴウクルー プレミアム"

          const { data: existingPayment } =
            await supabase
              .from("payments")
              .select("id")
              .eq(
                "stripe_invoice_id",
                invoice.id
              )
              .maybeSingle()

          if (!existingPayment) {
            const { error: paymentError } =
              await supabase
                .from("payments")
                .insert({
                  user_id:
                    subscriptionData.user_id,
                  subscription_id:
                    subscriptionData.id,
                  product_name:
                    subscriptionProductName,
                  amount:
                    invoice.amount_paid ?? 0,
                  currency:
                    invoice.currency ?? "jpy",
                  status:
                    "succeeded",
                  stripe_payment_id:
                    null,
                  stripe_invoice_id:
                    invoice.id,
                  stripe_checkout_session_id:
                    null,
                  paid_at:
                    new Date().toISOString(),
                })

            if (paymentError) {
              console.error(
                "継続課金payments登録エラー:",
                paymentError
              )

              return NextResponse.json(
                {
                  error:
                    "継続課金payment登録に失敗しました",
                },
                { status: 500 }
              )
            }
          }

                    // ----------------------------------------
          // 毎月のアイテム付与
          // ----------------------------------------

          const grantMonth = new Date(
            invoice.created * 1000
          )
            .toISOString()
            .slice(0, 7) + "-01"

          const habitRecoveryItemId =
            "e98e579f-67c7-4e24-9b9b-7c21fca772d7"

          const expBoostItemId =
            "5d0ef037-481e-4eeb-be6d-836aa9a7e07f"

          const monthlyItemQuantity =
            subscriptionPlan === "ultimate"
              ? 2
              : 1

          // 習慣リカバリー
          const {
            data: habitRecoveryResult,
            error: habitRecoveryError,
          } = await supabaseAdmin.rpc(
            "grant_subscription_monthly_items",
            {
              p_user_id:
                subscriptionData.user_id,
              p_subscription_id:
                subscriptionData.id,
              p_grant_month:
                grantMonth,
              p_item_id:
                habitRecoveryItemId,
              p_quantity:
                monthlyItemQuantity,
            }
          )

          if (habitRecoveryError) {
            console.error(
              "習慣リカバリー月次付与エラー:",
              habitRecoveryError
            )

            return NextResponse.json(
              {
                error:
                  "習慣リカバリーの月次付与に失敗しました",
              },
              { status: 500 }
            )
          }

          console.log(
            "習慣リカバリー月次付与:",
            habitRecoveryResult
          )

          // EXPブースト
          const {
            data: expBoostResult,
            error: expBoostError,
          } = await supabaseAdmin.rpc(
            "grant_subscription_monthly_items",
            {
              p_user_id:
                subscriptionData.user_id,
              p_subscription_id:
                subscriptionData.id,
              p_grant_month:
                grantMonth,
              p_item_id:
                expBoostItemId,
              p_quantity:
                monthlyItemQuantity,
            }
          )

          if (expBoostError) {
            console.error(
              "EXPブースト月次付与エラー:",
              expBoostError
            )

            return NextResponse.json(
              {
                error:
                  "EXPブーストの月次付与に失敗しました",
              },
              { status: 500 }
            )
          }

          console.log(
            "EXPブースト月次付与:",
            expBoostResult
          )
        }
      }
    }

    // ----------------------------------------
    // 継続課金失敗
    // ----------------------------------------

    if (
      event.type ===
      "invoice.payment_failed"
    ) {
      const invoice =
        event.data.object as Stripe.Invoice

      console.log(
        "Invoice payment failed:",
        invoice.id
      )

      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null

      if (customerId) {
        const { data: subscriptionData } =
          await supabase
            .from("subscriptions")
            .select("id, user_id, price_id")
            .eq(
              "stripe_customer_id",
              customerId
            )
            .maybeSingle()

        if (subscriptionData?.user_id) {
          const subscriptionPlan =
  subscriptionData.price_id ===
  process.env.STRIPE_ULTIMATE_PRICE_ID
    ? "ultimate"
    : "premium"

const subscriptionProductName =
  subscriptionPlan === "ultimate"
    ? "ブンゴウクルー アルティメットプラン"
    : "ブンゴウクルー プレミアム"

          const { data: existingPayment } =
            await supabase
              .from("payments")
              .select("id")
              .eq(
                "stripe_invoice_id",
                invoice.id
              )
              .maybeSingle()

          if (!existingPayment) {
            const { error: paymentError } =
              await supabase
                .from("payments")
                .insert({
                  user_id:
                    subscriptionData.user_id,
                  subscription_id:
                    subscriptionData.id,
                  product_name: subscriptionProductName,
                  amount:
                    invoice.amount_due ?? 0,
                  currency:
                    invoice.currency ?? "jpy",
                  status:
                    "failed",
                  stripe_payment_id:
                    null,
                  stripe_invoice_id:
                    invoice.id,
                  stripe_checkout_session_id:
                    null,
                  paid_at:
                    new Date().toISOString(),
                })

            if (paymentError) {
              console.error(
                "失敗決済payments登録エラー:",
                paymentError
              )

              return NextResponse.json(
                {
                  error:
                    "失敗決済payment登録に失敗しました",
                },
                { status: 500 }
              )
            }
          }
        }
      }
    }

    // ----------------------------------------
    // イベントを処理済みにする
    // ----------------------------------------

    const { error: processedError } =
      await supabase
        .from("stripe_events")
        .update({
          processed: true,
          processed_at:
            new Date().toISOString(),
        })
        .eq(
          "event_id",
          event.id
        )

    if (processedError) {
      console.error(
        "stripe_events処理済み更新エラー:",
        processedError
      )

      return NextResponse.json(
        { error: "イベント更新に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      received: true,
    })
  } catch (error) {
    if (
      error instanceof
      Stripe.errors
        .StripeSignatureVerificationError
    ) {
      console.error(
        "Stripe signature verification failed:",
        error.message
      )

      return NextResponse.json(
        {
          error:
            "Stripe署名検証に失敗しました",
        },
        { status: 400 }
      )
    }

    console.error(
      "Stripe Webhook Error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Webhook処理に失敗しました",
      },
      { status: 500 }
    )
  }
}