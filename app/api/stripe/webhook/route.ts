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

      // Stripe Subscriptionを取得
      const subscription =
        await stripe.subscriptions.retrieve(
          subscriptionId
        )

      const subscriptionItem =
        subscription.items.data[0]

      const priceId =
        subscriptionItem?.price.id ?? null

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

      const { data: savedSubscription, error: subscriptionError } =
        await supabase
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
              product_name:
                "ブンゴウクルー プレミアム",
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
              "id, user_id"
            )
            .eq(
              "stripe_customer_id",
              customerId
            )
            .maybeSingle()

        if (subscriptionData?.user_id) {
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
                    "ブンゴウクルー プレミアム",
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
            .select(
              "id, user_id"
            )
            .eq(
              "stripe_customer_id",
              customerId
            )
            .maybeSingle()

        if (subscriptionData?.user_id) {
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
                    "ブンゴウクルー プレミアム",
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