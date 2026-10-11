import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"

type DeleteTarget = {
  table: string
  column: string
}

const deleteTargets: DeleteTarget[] = [
  { table: "ads", column: "user_id" },
  { table: "bungou_album", column: "user_id" },
  { table: "bungou_instances", column: "user_id" },
  { table: "call_sessions", column: "user_id" },
  { table: "follows", column: "follower_id" },
  { table: "follows", column: "following_id" },
  { table: "friends", column: "requester_id" },
  { table: "friends", column: "addressee_id" },
  { table: "group_members", column: "user_id" },
  { table: "item_usages", column: "user_id" },
  { table: "messages", column: "sender_id" },
  { table: "messages", column: "receiver_id" },
  { table: "notifications", column: "user_id" },
  { table: "novel_links", column: "user_id" },
  { table: "point_transactions", column: "user_id" },
  { table: "post_cheers", column: "user_id" },
  { table: "post_comments", column: "user_id" },
  { table: "quest_applications", column: "applicant_id" },
  { table: "quest_escrows", column: "requester_id" },
  { table: "quest_messages", column: "sender_id" },
  { table: "quest_participants", column: "user_id" },
  { table: "quests", column: "requester_id" },
  { table: "sessions", column: "user_id" },
  { table: "social_links", column: "user_id" },
  { table: "streak_freezes", column: "user_id" },
  { table: "streak_recoveries", column: "user_id" },
  { table: "subscription_item_grants", column: "user_id" },
  { table: "user_badges", column: "user_id" },
  { table: "user_items", column: "user_id" },
  { table: "user_points", column: "user_id" },
  { table: "user_status", column: "user_id" },
  { table: "writing_logs", column: "user_id" },
]

async function deleteWhere(table: string, column: string, userId: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, userId)

  if (error) {
    throw new Error(`${table}.${column} の削除に失敗しました: ${error.message}`)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || body.confirmation !== "退会する") {
      return NextResponse.json(
        { error: "確認文字が正しくありません" },
        { status: 400 }
      )
    }

    const userId = user.id

    // 1. Stripeの有効な定期契約を即時キャンセルする。
    const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, stripe_subscription_id, status")
      .eq("user_id", userId)

    if (subscriptionError) {
      throw new Error(`契約情報の取得に失敗しました: ${subscriptionError.message}`)
    }

    for (const subscription of subscriptions ?? []) {
      if (
        subscription.stripe_subscription_id &&
        ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
      ) {
        try {
          await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)

          // Stripe側ですでに削除済みの場合以外は退会処理を止める。
          if (!message.toLowerCase().includes("no such subscription")) {
            throw new Error(`Stripe契約の停止に失敗しました: ${message}`)
          }
        }
      }
    }

    // 2. 決済履歴は会計・問い合わせ対応用に残すが、退会アカウントとは切り離す。
    //    user_id は NOT NULL のため、実在ユーザーではないランダムUUIDへ匿名化する。
    const anonymousUserId = randomUUID()

    const { error: paymentsError } = await supabaseAdmin
      .from("payments")
      .update({ user_id: anonymousUserId, subscription_id: null })
      .eq("user_id", userId)

    if (paymentsError) {
      throw new Error(`決済履歴の匿名化に失敗しました: ${paymentsError.message}`)
    }

    const { error: purchasesError } = await supabaseAdmin
      .from("point_purchases")
      .update({ user_id: anonymousUserId })
      .eq("user_id", userId)

    if (purchasesError) {
      throw new Error(`ポイント購入履歴の匿名化に失敗しました: ${purchasesError.message}`)
    }

    // 3. 他ユーザー側の履歴まで消さない参照列は、削除ではなくNULLへ切り離す。
    const nullableReferences = [
      { table: "notifications", column: "actor_id" },
      { table: "point_transactions", column: "created_by" },
      { table: "groups", column: "owner_id" },
      { table: "group_calls", column: "started_by" },
    ]

    for (const target of nullableReferences) {
      const { error } = await supabaseAdmin
        .from(target.table)
        .update({ [target.column]: null })
        .eq(target.column, userId)

      if (error) {
        throw new Error(
          `${target.table}.${target.column} の匿名化に失敗しました: ${error.message}`
        )
      }
    }

    // 4. 自分の投稿を参照しているリポストを先に削除する。
    //    posts.repost_id は NO ACTION のため、これを先に処理しないと元投稿を削除できない。
    const { data: ownPosts, error: ownPostsError } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("user_id", userId)

    if (ownPostsError) {
      throw new Error(`投稿情報の取得に失敗しました: ${ownPostsError.message}`)
    }

    const ownPostIds = (ownPosts ?? []).map((post) => post.id)

    if (ownPostIds.length > 0) {
      const { error: repostError } = await supabaseAdmin
        .from("posts")
        .delete()
        .in("repost_id", ownPostIds)

      if (repostError) {
        throw new Error(`リポストの削除に失敗しました: ${repostError.message}`)
      }
    }

    // 5. ユーザーに直接紐づくデータを削除する。
    for (const target of deleteTargets) {
      await deleteWhere(target.table, target.column, userId)
    }

    // posts配下のcheer/comment/hashtagは外部キーCASCADEで削除される。
    await deleteWhere("posts", "user_id", userId)

    // 6. subscriptions は payments の subscription_id をNULLにした後で削除する。
    await deleteWhere("subscriptions", "user_id", userId)

    // 7. Storageのプロフィール画像を削除する。
    //    マイページでは avatars/{userId}/{timestamp} の形式で保存している。
    const { data: avatarFiles, error: avatarListError } = await supabaseAdmin.storage
      .from("avatars")
      .list(userId, { limit: 1000 })

    if (avatarListError) {
      throw new Error(`プロフィール画像の確認に失敗しました: ${avatarListError.message}`)
    }

    if (avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles
        .filter((file) => file.name)
        .map((file) => `${userId}/${file.name}`)

      if (avatarPaths.length > 0) {
        const { error: avatarDeleteError } = await supabaseAdmin.storage
          .from("avatars")
          .remove(avatarPaths)

        if (avatarDeleteError) {
          throw new Error(`プロフィール画像の削除に失敗しました: ${avatarDeleteError.message}`)
        }
      }
    }

    // 8. profiles は他テーブルから参照されているため最後に削除する。
    await deleteWhere("profiles", "user_id", userId)

    // 9. Supabase Authユーザーを最後に削除する。
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      throw new Error(`認証アカウントの削除に失敗しました: ${authDeleteError.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Account Delete Error:", error)

    const message =
      error instanceof Error ? error.message : "アカウント削除に失敗しました"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
