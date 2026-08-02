import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 現在ログインしているユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("ADMIN POINTS AUTH CHECK", {
        userId: user?.id ?? null,
        userError: userError?.message ?? null,
      })

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "ログインが必要です。",
        },
        {
          status: 401,
        }
      )
    }

    // 現在のユーザーが管理者か確認
    const {
      data: adminProfile,
      error: adminError,
    } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (
      adminError ||
      !adminProfile?.is_admin
    ) {
      return NextResponse.json(
        {
          error: "管理者権限がありません。",
        },
        {
          status: 403,
        }
      )
    }

    // リクエスト内容を取得
    const body = await request.json()

    const {
      userId,
      amount,
      type,
      description,
    } = body

    // ユーザーID確認
    if (!userId) {
      return NextResponse.json(
        {
          error: "対象ユーザーが指定されていません。",
        },
        {
          status: 400,
        }
      )
    }

    // ポイント数確認
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error: "ポイント数が不正です。",
        },
        {
          status: 400,
        }
      )
    }

    // 操作タイプ確認
    if (
      type !== "admin_grant" &&
      type !== "admin_remove"
    ) {
      return NextResponse.json(
        {
          error: "操作タイプが不正です。",
        },
        {
          status: 400,
        }
      )
    }

    // 理由確認
    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return NextResponse.json(
        {
          error: "理由を入力してください。",
        },
        {
          status: 400,
        }
      )
    }

    // ポイントの増減値を決定
    const finalAmount =
      type === "admin_grant"
        ? Math.abs(amount)
        : -Math.abs(amount)

    // 対象ユーザーが存在するか確認
    const {
      data: targetUser,
      error: targetUserError,
    } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .single()

    if (
      targetUserError ||
      !targetUser
    ) {
      return NextResponse.json(
        {
          error: "対象ユーザーが存在しません。",
        },
        {
          status: 404,
        }
      )
    }

    // ポイント履歴を追加
    const {
      error: insertError,
    } = await supabase
      .from("point_transactions")
      .insert({
        user_id: userId,
        amount: finalAmount,
        type,
        description: description.trim(),
        created_by: user.id,
      })

    if (insertError) {
      console.error(
        "ポイント履歴追加エラー:",
        insertError
      )

      return NextResponse.json(
        {
          error:
            "ポイント処理に失敗しました。",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      success: true,
    })

  } catch (error) {
    console.error(
      "ポイントAPIエラー:",
      error
    )

    return NextResponse.json(
      {
        error:
          "サーバーエラーが発生しました。",
      },
      {
        status: 500,
      }
    )
  }
}