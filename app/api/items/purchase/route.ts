import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // ログイン確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

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

    // リクエスト取得
    const body = await request.json()

    const itemId = body.itemId

    if (!itemId) {
      return NextResponse.json(
        {
          error: "アイテムが指定されていません。",
        },
        {
          status: 400,
        }
      )
    }

    // 購入処理
    const {
      data,
      error,
    } = await supabase.rpc(
      "purchase_item",
      {
        p_item_id: itemId,
      }
    )

    if (error) {
      console.error(
        "アイテム購入エラー:",
        error
      )

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })

  } catch (error) {

    console.error(
      "アイテム購入APIエラー:",
      error
    )

    return NextResponse.json(
      {
        error:
          "アイテム購入処理に失敗しました。",
      },
      {
        status: 500,
      }
    )
  }
}