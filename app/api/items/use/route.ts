import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const userId = body.userId
    const itemId = body.itemId

    const recoveryDate = body.recoveryDate

    if (!userId || !itemId) {

      if (
        itemId === "e98e579f-67c7-4e24-9b9b-7c21fca772d7" &&
        !recoveryDate
      ) {
        return NextResponse.json(
          {
            error: "復旧する日付を選択してください。",
          },
          {
            status: 400,
          }
        )
      }

      return NextResponse.json(
        {
          error: "userIdとitemIdが必要です。",
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // ① ユーザーの所持アイテム確認
    // =========================

    const {
      data: userItem,
      error: userItemError,
    } = await supabaseAdmin
      .from("user_items")
      .select(`
        id,
        user_id,
        item_id,
        quantity,
        items (
          id,
          name,
          type,
          effect_type,
          effect_value,
          duration,
          is_active
        )
      `)
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle()

    if (userItemError) {
      console.error(
        "USER ITEM SELECT ERROR:",
        userItemError
      )

      return NextResponse.json(
        {
          error: "所持アイテムの確認に失敗しました。",
        },
        {
          status: 500,
        }
      )
    }

    // =========================
    // ② 所持していない
    // =========================

    if (!userItem) {
      return NextResponse.json(
        {
          error: "このアイテムを所持していません。",
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // ③ 個数確認
    // =========================

    if (userItem.quantity <= 0) {
      return NextResponse.json(
        {
          error: "このアイテムを所持していません。",
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // ④ アイテム情報確認
    // =========================

    const item = userItem.items

    if (!item) {
      return NextResponse.json(
        {
          error: "アイテム情報が見つかりません。",
        },
        {
          status: 400,
        }
      )
    }

    if (!item.is_active) {
      return NextResponse.json(
        {
          error: "このアイテムは現在使用できません。",
        },
        {
          status: 400,
        }
      )
    }

// =========================
// ⑤ 習慣リカバリー処理
// =========================

if (item.effect_type === "STREAK_RECOVERY") {

  // =========================
  // 復旧対象日の確認
  // =========================

  if (!recoveryDate) {
    return NextResponse.json(
      {
        error: "復旧する日付を選択してください。",
      },
      {
        status: 400,
      }
    )
  }

  // 日付形式を確認
  const selectedDate = new Date(
    `${recoveryDate}T00:00:00`
  )

  if (Number.isNaN(selectedDate.getTime())) {
    return NextResponse.json(
      {
        error: "復旧する日付が正しくありません。",
      },
      {
        status: 400,
      }
    )
  }

  // =========================
  // 選択した日に執筆しているか確認
  // =========================

  const {
    data: existingWriting,
    error: existingWritingError,
  } = await supabaseAdmin
    .from("writing_logs")
    .select("id")
    .eq("user_id", userId)
    .gte(
      "created_at",
      `${recoveryDate}T00:00:00`
    )
    .lt(
      "created_at",
      `${recoveryDate}T23:59:59.999`
    )
    .limit(1)
    .maybeSingle()

  if (existingWritingError) {
    console.error(
      "EXISTING WRITING CHECK ERROR:",
      existingWritingError
    )

    return NextResponse.json(
      {
        error: "選択した日の執筆履歴確認に失敗しました。",
      },
      {
        status: 500,
      }
    )
  }

  if (existingWriting) {
    return NextResponse.json(
      {
        error: "この日はすでに執筆しています。",
      },
      {
        status: 400,
      }
    )
  }

  // =========================
  // すでに復旧済みか確認
  // =========================

  const {
    data: existingRecovery,
    error: recoveryCheckError,
  } = await supabaseAdmin
    .from("streak_recoveries")
    .select("id")
    .eq("user_id", userId)
    .eq("recovery_date", recoveryDate)
    .maybeSingle()

  if (recoveryCheckError) {
    console.error(
      "RECOVERY CHECK ERROR:",
      recoveryCheckError
    )

    return NextResponse.json(
      {
        error: "リカバリー履歴の確認に失敗しました。",
      },
      {
        status: 500,
      }
    )
  }

  if (existingRecovery) {
    return NextResponse.json(
      {
        error: "この日はすでに復旧されています。",
      },
      {
        status: 400,
      }
    )
  }

  // =========================
  // 復旧履歴を登録
  // =========================

  const {
    error: recoveryInsertError,
  } = await supabaseAdmin
    .from("streak_recoveries")
    .insert({
      user_id: userId,
      recovery_date: recoveryDate,
    })

  if (recoveryInsertError) {
    console.error(
      "RECOVERY INSERT ERROR:",
      recoveryInsertError
    )

    return NextResponse.json(
      {
        error: "復旧履歴の記録に失敗しました。",
      },
      {
        status: 500,
      }
    )
  }
}

    // =========================
    // ⑥ アイテムを1個消費
    // =========================

    const newQuantity =
      userItem.quantity - 1

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("user_items")
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userItem.id)
      .eq("user_id", userId)

    if (updateError) {
      console.error(
        "USER ITEM UPDATE ERROR:",
        updateError
      )

      return NextResponse.json(
        {
          error: "アイテムの消費に失敗しました。",
        },
        {
          status: 500,
        }
      )
    }

    // =========================
    // ⑦ 成功
    // =========================

    return NextResponse.json({
      success: true,
      message: "アイテムを使用しました。",
      itemId,
      itemName: item.name,
      effectType: item.effect_type,
      effectValue: item.effect_value,
      duration: item.duration,
      remainingQuantity: newQuantity,
    })

  } catch (error) {
    console.error(
      "ITEM USE API ERROR:",
      error
    )

    return NextResponse.json(
      {
        error: "アイテム使用処理に失敗しました。",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    )
  }
}